import io
import json
import os
import urllib3
import time
import asyncio
from typing import AsyncGenerator, List, Dict, Any

import pdfplumber
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage, AIMessage
from langchain_core.tools import BaseTool, tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field, ValidationError
from typing import Annotated, ClassVar, Sequence, TypedDict, Optional
from fastapi import FastAPI, HTTPException, Form, UploadFile, File, Request, Response, Header
from fastapi.responses import StreamingResponse, FileResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

import shutil
import uuid
from pathlib import Path
import tempfile

from pdf_utils import get_research_paper_text
from gap import ResearchGapIdentifier
from AgentPodcast import process_pdf_to_podcast, PodcastConfig

# Additional imports for podcast generation
from openai import OpenAI
from pydub import AudioSegment
import azure.cognitiveservices.speech as speechsdk
from typing import Literal
import mimetypes
import stat

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

# --- Local Storage Setup ---
BASE_DIR = Path(__file__).resolve().parent
SOURCE_PDF_PATH = BASE_DIR / "source.pdf"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
# --- End Local Storage Setup ---

# Initialize OpenAI client for podcast generation
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize Azure Speech client
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "eastasia")
if AZURE_SPEECH_KEY:
    speech_config = speechsdk.SpeechConfig(
        subscription=AZURE_SPEECH_KEY, 
        region=AZURE_SPEECH_REGION
    )
else:
    print("Warning: AZURE_SPEECH_KEY not found. Audio generation will not be available.")
    speech_config = None

# Prompts
decision_making_prompt = """
You are an experienced scientific researcher.
Your goal is to help the user with their scientific research.

Based on the user query, decide if you need to perform a research or if you can answer the question directly.
- You should perform a research if the user query requires any supporting evidence or information.
- You should answer the question directly only for simple conversational questions, like "how are you?".
"""

planning_prompt = """
# IDENTITY AND PURPOSE

You are an experienced scientific researcher.
Your goal is to make a new step by step plan to help the user with their scientific research.

Subtasks should not rely on any assumptions or guesses, but only rely on the information provided in the context or look up for any additional information.

If any feedback is provided about a previous answer, incorportate it in your new planning.

# TOOLS

For each subtask, indicate the external tool required to complete the subtask. 
Tools can be one of the following:
{tools}
"""

agent_prompt = """
# IDENTITY AND PURPOSE

You are an experienced scientific researcher. 
Your goal is to help the user with their scientific research. You have access to a set of external tools to complete your tasks.
Follow the plan you wrote to successfully complete the task.

A primary source document may be available. If the user's question seems to be about a specific paper, you can use the `get_source_document_text` tool to read it first. Otherwise, use the other tools to conduct your research.

Add extensive inline citations to support any claim made in the answer.

# EXTERNAL KNOWLEDGE

## CORE API

The CORE API has a specific query language that allows you to explore a vast papers collection and perform complex queries. See the following table for a list of available operators:

| Operator       | Accepted symbols         | Meaning                                                                                      |
|---------------|-------------------------|----------------------------------------------------------------------------------------------|
| And           | AND, +, space          | Logical binary and.                                                                           |
| Or            | OR                     | Logical binary or.                                                                            |
| Grouping      | (...)                  | Used to prioritise and group elements of the query.                                           |
| Field lookup  | field_name:value       | Used to support lookup of specific fields.                                                    |
| Range queries | fieldName(>, <,>=, <=) | For numeric and date fields, it allows to specify a range of valid values to return.         |
| Exists queries| _exists_:fieldName     | Allows for complex queries, it returns all the items where the field specified by fieldName is not empty. |

Use this table to formulate more complex queries filtering for specific papers, for example publication date/year.
Here are the relevant fields of a paper object you can use to filter the results:
{
  "authors": [{"name": "Last Name, First Name"}],
  "documentType": "presentation" or "research" or "thesis",
  "publishedDate": "2019-08-24T14:15:22Z",
  "title": "Title of the paper",
  "yearPublished": "2019"
}

Example queries:
- "machine learning AND yearPublished:2025"
- "maritime biology AND yearPublished>=2025 AND yearPublished<=2024"
- "cancer research AND authors:Vaswani, Ashish AND authors:Bello, Irwan"
- "title:Attention is all you need"
- "mathematics AND _exists_:abstract"
"""

judge_prompt = """
You are an expert scientific researcher.
Your goal is to review the final answer you provided for a specific user query.

Look at the conversation history between you and the user. Based on it, you need to decide if the final answer is satisfactory or not.

A good final answer should:
- Directly answer the user query. For example, it does not answer a question about a different paper or area of research.
- Answer extensively the request from the user.
- Take into account any feedback given through the conversation.
- Provide inline sources to support any claim made in the answer.

In case the answer is not good enough, provide clear and concise feedback on what needs to be improved to pass the evaluation.
"""

# Core API Wrapper
class CoreAPIWrapper(BaseModel):
    """Simple wrapper around the CORE API."""
    base_url: ClassVar[str] = "https://api.core.ac.uk/v3"
    api_key: ClassVar[str] = os.environ.get("CORE_API_KEY", "demo-key")
    top_k_results: int = Field(description="Top k results obtained by running a query on Core", default=1)

    def _get_search_response(self, query: str) -> dict:
        http = urllib3.PoolManager()
        max_retries = 5    
        for attempt in range(max_retries):
            response = http.request(
                'GET',
                f"{self.base_url}/search/outputs", 
                headers={"Authorization": f"Bearer {self.api_key}"}, 
                fields={"q": query, "limit": self.top_k_results}
            )
            if 200 <= response.status < 300:
                return response.json()
            elif attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 2))
            else:
                raise Exception(f"Got non 2xx response from CORE API: {response.status} {response.data}")

    def search(self, query: str) -> str:
        response = self._get_search_response(query)
        results = response.get("results", [])
        if not results:
            return "No relevant results were found"

        docs = []
        for result in results:
            published_date_str = result.get('publishedDate') or result.get('yearPublished', '')
            authors_str = ' and '.join([item['name'] for item in result.get('authors', [])])
            docs.append((
                f"* ID: {result.get('id', '')},\n"
                f"* Title: {result.get('title', '')},\n"
                f"* Published Date: {published_date_str},\n"
                f"* Authors: {authors_str},\n"
                f"* Abstract: {result.get('abstract', '')},\n"
                f"* Paper URLs: {result.get('sourceFulltextUrls') or result.get('downloadUrl', '')}"
            ))
        return "\n-----\n".join(docs)

# Pydantic Models
class SearchPapersInput(BaseModel):
    query: str = Field(description="The query to search for on the selected archive.")
    max_papers: int = Field(description="Maximum number of papers to return", default=1, ge=1, le=10)

class DecisionMakingOutput(BaseModel):
    requires_research: bool = Field(description="Whether the user query requires research or not.")
    answer: Optional[str] = Field(default=None, description="Direct answer if no research needed.")

class JudgeOutput(BaseModel):
    is_good_answer: bool = Field(description="Whether the answer is good or not.")
    feedback: Optional[str] = Field(default=None, description="Feedback if answer is not good.")

# Podcast Generation Models
class LineItem(BaseModel):
    """A single line in the script."""
    speaker: Literal["Host (Jane)", "Guest"]
    text: str

class Script(BaseModel):
    """The script between the host and guest."""
    scratchpad: str
    name_of_guest: str
    script: List[LineItem]

class PodcastGenerationResponse(BaseModel):
    status: str
    audio_url: Optional[str] = None
    script_file: Optional[str] = None
    audio_file: Optional[str] = None

class AgentState(TypedDict):
    requires_research: bool
    num_feedback_requests: int
    is_good_answer: bool
    messages: Annotated[Sequence[BaseMessage], add_messages]

# Request/Response Models
class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    result: str

class StreamResponse(BaseModel):
    type: str
    node: Optional[str] = None
    message: Optional[str] = None
    content: Optional[str] = None
    tool: Optional[str] = None
    args: Optional[Dict] = None
    result: Optional[str] = None
    error: Optional[str] = None
    
class GapAnalysisResponse(BaseModel):
    status: str
    analysis: Optional[Dict] = None

# Tools
@tool("get_source_document_text")
def get_source_document_text() -> str:
    """Read the content of the source document."""
    if not SOURCE_PDF_PATH.is_file():
        return "No source document found. You can only answer questions that do not require a source document."
    try:
        return get_research_paper_text(SOURCE_PDF_PATH)
    except Exception as e:
        return f"Error reading source document: {e}"

@tool("search-papers", args_schema=SearchPapersInput)
def search_papers(query: str, max_papers: int = 1) -> str:
    """Search for scientific papers using the CORE API."""
    try:
        return CoreAPIWrapper(top_k_results=max_papers).search(query)
    except Exception as e:
        return f"Error performing paper search: {e}"

@tool("download-paper")
def download_paper(url: str) -> str:
    """Download a specific scientific paper from a given URL."""
    try:        
        http = urllib3.PoolManager(cert_reqs='CERT_NONE')
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        max_retries = 5
        for attempt in range(max_retries):
            response = http.request('GET', url, headers=headers)
            if 200 <= response.status < 300:
                pdf_file = io.BytesIO(response.data)
                with pdfplumber.open(pdf_file) as pdf:
                    text = ""
                    for page in pdf.pages:
                        text += page.extract_text() + "\n"
                return text
            elif attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 2))
            else:
                raise Exception(f"Got non 2xx when downloading paper: {response.status} {response.data}")
    except Exception as e:
        return f"Error downloading paper: {e}"

@tool("ask-human-feedback")
def ask_human_feedback(question: str) -> str:
    """Ask for human feedback."""
    return f"Human feedback requested: {question}"

tools = [get_source_document_text, search_papers, download_paper, ask_human_feedback]
tools_dict = {tool.name: tool for tool in tools}

def format_tools_description(tools: list[BaseTool]) -> str:
    return "\n\n".join([f"- {tool.name}: {tool.description}\n Input arguments: {tool.args}" for tool in tools])

# LLMs
base_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
decision_making_llm = base_llm.with_structured_output(DecisionMakingOutput)
agent_llm = base_llm.bind_tools(tools)
judge_llm = base_llm.with_structured_output(JudgeOutput)

# Workflow Nodes
def decision_making_node(state: AgentState):
    system_prompt = SystemMessage(content=decision_making_prompt)
    response: DecisionMakingOutput = decision_making_llm.invoke([system_prompt] + state["messages"])
    output = {"requires_research": response.requires_research}
    if response.answer:
        output["messages"] = [AIMessage(content=response.answer)]
    return output

def router(state: AgentState):
    if state["requires_research"]:
        return "planning"
    else:
        return END

def planning_node(state: AgentState):
    system_prompt = SystemMessage(content=planning_prompt.format(tools=format_tools_description(tools)))
    response = base_llm.invoke([system_prompt] + state["messages"])
    return {"messages": [response]}

def tools_node(state: AgentState):
    outputs = []
    last_message = state["messages"][-1]
    for tool_call in last_message.tool_calls:
        tool_result = tools_dict[tool_call["name"]].invoke(tool_call["args"])
        outputs.append(
            ToolMessage(
                content=json.dumps(tool_result, ensure_ascii=False),
                name=tool_call["name"],
                tool_call_id=tool_call["id"],
            )
        )
    return {"messages": outputs}

def agent_node(state: AgentState):
    system_prompt = SystemMessage(content=agent_prompt)
    response = agent_llm.invoke([system_prompt] + state["messages"])
    return {"messages": [response]}

def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    else:
        return "judge"

def judge_node(state: AgentState):
    num_feedback_requests = state.get("num_feedback_requests", 0)
    if num_feedback_requests >= 2:
        return {"is_good_answer": True}

    system_prompt = SystemMessage(content=judge_prompt)
    response: JudgeOutput = judge_llm.invoke([system_prompt] + state["messages"])
    output = {
        "is_good_answer": response.is_good_answer,
        "num_feedback_requests": num_feedback_requests + 1
    }
    if response.feedback:
        output["messages"] = [AIMessage(content=response.feedback)]
    return output

def final_answer_router(state: AgentState):
    if state["is_good_answer"]:
        return END
    else:
        return "planning"

# Build Workflow
workflow = StateGraph(AgentState)
workflow.add_node("decision_making", decision_making_node)
workflow.add_node("planning", planning_node)
workflow.add_node("tools", tools_node)
workflow.add_node("agent", agent_node)
workflow.add_node("judge", judge_node)

workflow.set_entry_point("decision_making")

workflow.add_conditional_edges(
    "decision_making",
    router,
    {"planning": "planning", END: END}
)
workflow.add_edge("planning", "agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {"tools": "tools", "judge": "judge"}
)
workflow.add_edge("tools", "agent")
workflow.add_conditional_edges(
    "judge",
    final_answer_router,
    {"planning": "planning", END: END}
)

app = workflow.compile()

# Streaming function for API
async def stream_workflow_updates(workflow_app: CompiledStateGraph, input_data: dict) -> AsyncGenerator[str, None]:
    """Stream workflow updates as JSON strings."""
    try:
        async for chunk in workflow_app.astream_events(input_data, version="v1"):
            event_type = chunk["event"]
            node = chunk["name"]
            
            if event_type == "on_chat_model_stream":
                content = chunk["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'message', 'content': content, 'node': node})}\n\n"
            
            elif event_type == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_call', 'tool': chunk['data']['name'], 'args': chunk['data']['input']})}\n\n"
            
            elif event_type == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_result', 'tool': chunk['data']['name'], 'result': chunk['data']['output']})}\n\n"

    except Exception as e:
        error_message = f"Error streaming workflow: {type(e).__name__}: {e}"
        yield f"data: {json.dumps({'type': 'error', 'error': error_message})}\n\n"

# Endpoint logic functions for use in main_app.py

async def ask_query_logic(request):
    try:
        input_data = {"messages": [("user", request.query)]}
        final_state = await app.ainvoke(input_data)
        if final_state and final_state.get("messages"):
            last_message = final_state["messages"][-1]
            content = getattr(last_message, "content", str(last_message))
            return QueryResponse(result=content)
        else:
            return QueryResponse(result="No definitive answer could be generated.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def stream_research_logic(query: str):
    input_data = {"messages": [("user", query)]}
    return StreamingResponse(
        stream_workflow_updates(app, input_data), 
        media_type="text/event-stream"
    )

async def analyze_gaps_logic(pdf_file):
    try:
        pdf_bytes = await pdf_file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        gap_identifier = ResearchGapIdentifier(openai_api_key=OPENAI_API_KEY)
        analysis = gap_identifier.analyze_research_paper(pdf_bytes)
        gap_identifier.cleanup()
        return GapAnalysisResponse(status="success", analysis=analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze gaps: {str(e)}")

async def generate_podcast_logic(pdf_file, stream_audio: bool = False):
    if not speech_config:
        raise HTTPException(status_code=500, detail="Azure Speech Service is not configured.")
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(pdf_file.file, tmp)
            temp_path = Path(tmp.name)
        config = PodcastConfig(
            user_id="research_assistant",
            pdf_file=str(temp_path),
            output_dir=str(OUTPUT_DIR),
            auto_generate_audio=True,
            max_workers=4,
            pause_duration=750
        )
        result = process_pdf_to_podcast(config)
        os.unlink(temp_path)
        if not result or 'audio_file' not in result:
            raise HTTPException(status_code=500, detail="Failed to generate audio file")
        audio_path = Path(result['audio_file'])
        script_path = Path(result['script_file'])
        if not audio_path.is_file():
            raise HTTPException(status_code=500, detail=f"Generated audio file not found at {audio_path}")
        if stream_audio:
            file_size = os.stat(audio_path).st_size
            headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": "audio/mpeg",
                "Content-Disposition": f"inline; filename={audio_path.name}"
            }
            async def stream_generated_audio():
                with open(audio_path, "rb") as file:
                    while chunk := file.read(8192):
                        yield chunk
            return StreamingResponse(
                stream_generated_audio(),
                headers=headers,
                media_type="audio/mpeg"
            )
        return PodcastGenerationResponse(
            status="success",
            script_file=str(script_path.name),
            audio_file=str(audio_path.name)
        )
    except Exception as e:
        error_msg = f"Failed to generate podcast: {str(e)}"
        print(f"Error in generate_podcast: {error_msg}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=error_msg)

async def stream_audio_logic(filename: str, range: str = None):
    file_path = OUTPUT_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    file_size = os.stat(file_path).st_size
    start = 0
    end = file_size - 1
    content_length = file_size
    if range is not None:
        try:
            range_match = range.replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1
            content_length = end - start + 1
        except (IndexError, ValueError):
            raise HTTPException(status_code=416, detail="Invalid range header")
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache"
    }
    async def stream_file():
        with open(file_path, "rb") as file:
            file.seek(start)
            chunk_size = 8192
            remaining = content_length
            while remaining > 0:
                chunk = file.read(min(chunk_size, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
    status_code = 206 if range is not None else 200
    return StreamingResponse(
        stream_file(),
        status_code=status_code,
        headers=headers
    )

async def get_output_file_logic(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    if filename.endswith(('.mp3', '.wav', '.ogg')):
        return Response(
            status_code=307,
            headers={"Location": f"/stream-audio/{filename}"}
        )
    return FileResponse(path=file_path)

# Create FastAPI router for research assistant endpoints
from fastapi import APIRouter

research_router = APIRouter()

@research_router.post("/ask", response_model=QueryResponse)
async def ask_query(request: QueryRequest):
    """Ask questions about research papers and get AI-powered answers."""
    return await ask_query_logic(request)

@research_router.get("/stream")
async def stream_research(query: str):
    """Stream research analysis in real-time using Server-Sent Events."""
    return await stream_research_logic(query)

# Export the router
__all__ = ["research_router"]
