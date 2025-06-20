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
from pydantic import BaseModel, Field
from typing import Annotated, ClassVar, Sequence, TypedDict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import uvicorn

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

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
Your goal is to make a new step by step plan to help the user with their scientific research .

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

# Tools
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

tools = [search_papers, download_paper, ask_human_feedback]
tools_dict = {tool.name: tool for tool in tools}

def format_tools_description(tools: list[BaseTool]) -> str:
    return "\n\n".join([f"- {tool.name}: {tool.description}\n Input arguments: {tool.args}" for tool in tools])

# LLMs
base_llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
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
        return "end"

def planning_node(state: AgentState):
    system_prompt = SystemMessage(content=planning_prompt.format(tools=format_tools_description(tools)))
    response = base_llm.invoke([system_prompt] + state["messages"])
    return {"messages": [response]}

def tools_node(state: AgentState):
    outputs = []
    for tool_call in state["messages"][-1].tool_calls:
        tool_result = tools_dict[tool_call["name"]].invoke(tool_call["args"])
        outputs.append(
            ToolMessage(
                content=json.dumps(tool_result),
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
        return "continue"
    else:
        return "end"

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
        return "end"
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
    {"planning": "planning", "end": END}
)
workflow.add_edge("planning", "agent")
workflow.add_edge("tools", "agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {"continue": "tools", "end": "judge"}
)
workflow.add_conditional_edges(
    "judge",
    final_answer_router,
    {"planning": "planning", "end": END}
)

app = workflow.compile()

# Streaming function for API
async def stream_workflow_updates(workflow_app: CompiledStateGraph, input_query: str) -> AsyncGenerator[str, None]:
    """Stream workflow updates as JSON strings."""
    try:
        all_messages = []
        async for chunk in workflow_app.astream({"messages": [input_query]}, stream_mode="updates"):
            for node_name, updates in chunk.items():
                # Send node processing update
                yield f"data: {json.dumps({'type': 'node_start', 'node': node_name})}\n\n"
                
                if messages := updates.get("messages"):
                    all_messages.extend(messages)
                    for message in messages:
                        if hasattr(message, 'content') and message.content:
                            yield f"data: {json.dumps({'type': 'message', 'content': message.content, 'node': node_name})}\n\n"
                        
                        if hasattr(message, 'tool_calls') and message.tool_calls:
                            for tool_call in message.tool_calls:
                                yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_call['name'], 'args': tool_call['args']})}\n\n"
                
                # Send other state updates
                for key, value in updates.items():
                    if key != "messages":
                        yield f"data: {json.dumps({'type': 'state_update', 'key': key, 'value': str(value)})}\n\n"
        
        # Send final result
        if all_messages:
            final_message = all_messages[-1]
            final_content = getattr(final_message, "content", str(final_message))
            yield f"data: {json.dumps({'type': 'final_result', 'result': final_content})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'final_result', 'result': 'No response generated'})}\n\n"
            
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

# FastAPI App
app_api = FastAPI(
    title="Research Agent API",
    description="AI-powered scientific research assistant",
    version="1.0.0"
)

@app_api.post("/ask", response_model=QueryResponse)
async def ask_query(request: QueryRequest):
    """Execute research query and return final result only."""
    try:
        # Collect all messages
        all_messages = []
        async for chunk in app.astream({"messages": [request.query]}, stream_mode="updates"):
            for updates in chunk.values():
                if messages := updates.get("messages"):
                    all_messages.extend(messages)
        
        # Return final result
        if all_messages:
            final_message = all_messages[-1]
            content = getattr(final_message, "content", str(final_message))
            return QueryResponse(result=content)
        else:
            return QueryResponse(result="No response generated")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app_api.get("/stream")
async def stream_research(query: str):
    """Stream research progress using Server-Sent Events."""
    return StreamingResponse(
        stream_workflow_updates(app, query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

@app_api.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Research Agent API"}

if __name__ == "__main__":
    print("Starting Research Agent API...")
    print("Swagger docs: http://localhost:8000/docs")
    print("Stream endpoint: http://localhost:8000/stream?query=your_question")
    uvicorn.run(app_api, host="0.0.0.0", port=8000, log_level="info")