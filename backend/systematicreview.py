#!/usr/bin/env python3

"""
Systematic Review Automation System
Complete working script for automated academic literature review
"""

from pydantic import BaseModel, Field
from typing import TypedDict, Annotated, List, Dict, Any, Optional
import requests
from langchain_core.tools import BaseTool
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage
import sys
import operator
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
import os
from uuid import uuid4
from langgraph.checkpoint.memory import MemorySaver
import openai
from dotenv import load_dotenv
from tenacity import retry, retry_if_exception_type, wait_exponential, stop_after_attempt
import time
from fastapi import APIRouter, HTTPException

load_dotenv()

# Check for Semantic Scholar API key
if not os.getenv('SEMANTIC_SCHOLAR'):
    print("❌ Error: SEMANTIC_SCHOLAR API key not found")
    print("Create a .env file with: SEMANTIC_SCHOLAR=your_key_here")
    sys.exit(1)

# Rate limiting settings
RATE_LIMIT_CALLS = 100  # Number of calls allowed
RATE_LIMIT_PERIOD = 300  # Time period in seconds (5 minutes)
last_call_timestamps = []

def check_rate_limit():
    """Check if we've exceeded rate limits"""
    current_time = time.time()
    # Remove timestamps older than our time period
    global last_call_timestamps
    last_call_timestamps = [ts for ts in last_call_timestamps if current_time - ts < RATE_LIMIT_PERIOD]
    
    if len(last_call_timestamps) >= RATE_LIMIT_CALLS:
        sleep_time = RATE_LIMIT_PERIOD - (current_time - last_call_timestamps[0])
        if sleep_time > 0:
            print(f"Rate limit reached. Sleeping for {sleep_time:.2f} seconds...")
            time.sleep(sleep_time)
            last_call_timestamps = last_call_timestamps[1:]
    
    last_call_timestamps.append(current_time)

class AcademicPaperSearchInput(BaseModel):
    topic: str = Field(..., description="The topic to search for academic papers on")
    max_results: int = Field(20, description="Maximum number of results to return")

class AcademicPaperSearchTool(BaseTool):
    name: str = "academic_paper_search_tool"
    description: str = "Queries an academic papers API to retrieve relevant articles based on a topic"
    args_schema: type[BaseModel] = AcademicPaperSearchInput

    def _run(self, topic: str, max_results: int) -> List[Dict[str, Any]]:
        return self.query_academic_api(topic, max_results)

    async def _arun(self, topic: str, max_results: int) -> List[Dict[str, Any]]:
        raise NotImplementedError("Async version not implemented")

    def query_academic_api(self, topic: str, max_results: int) -> List[Dict[str, Any]]:
        base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        headers = {"x-api-key": os.getenv('SEMANTIC_SCHOLAR')}
        params = {
            "query": topic,
            "limit": min(max_results, 10),
            "fields": "title,abstract,authors,year,openAccessPdf",
        }
        
        try:
            check_rate_limit()  # Check rate limits before making the call
            response = requests.get(base_url, params=params, headers=headers, timeout=30)
            print(f"API Response: {response.status_code}")
            
            if response.status_code == 200:
                papers = response.json().get("data", [])
                return [
                    {
                        "title": paper.get("title", "Unknown Title"),
                        "abstract": paper.get("abstract", "No abstract available"),
                        "authors": [author.get("name", "Unknown") for author in paper.get("authors", [])],
                        "year": paper.get("year", "Unknown"),
                        "pdf": paper.get("openAccessPdf"),
                    }
                    for paper in papers
                ]
            elif response.status_code == 429:
                print("Rate limit exceeded. Waiting before retry...")
                time.sleep(60)  # Wait for 1 minute before retrying
                return self.query_academic_api(topic, max_results)  # Retry the request
            else:
                print(f"API Error: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error: {e}")
            return []

# Prompts - Updated to match notebook
planner_prompt = '''You are an academic researcher that is planning to write a systematic review of Academic and Scientific Research Papers.

A systematic review article typically includes the following components:
Title: The title should accurately reflect the topic being reviewed, and usually includes the words "a systematic review".
Abstract: A structured abstract with a short paragraph for each of the following: background, methods, results, and conclusion.
Introduction: Summarizes the topic, explains why the review was conducted, and states the review's purpose and aims.
Methods: Describes the methods used in the review.
Results: Presents the results of the review.
Discussion: Discusses the results of the review.
References: Lists the references used in the review.

Other important components of a systematic review include:
Scoping: A "trial run" of the review that helps shape the review's method and protocol.
Meta-analysis: An optional component that uses statistical methods to combine and summarize the results of multiple studies.
Data extraction: A central component where data is collected and organized for analysis.
Assessing the risk of bias: Helps establish transparency of evidence synthesis results.
Interpreting results: Involves considering factors such as limitations, strength of evidence, biases, and implications for future practice or research.
Literature identification: An important component that sets the data to be analyzed.

With this in mind, only create an outline plan based on the topic. Don't search anything, just set up the planning.
'''

research_prompt = '''You are an academic researcher that is searching Academic and Scientific Research Papers.

You will be given a project plan. Based on the project plan, generate 5 queries that you will use to search the papers.

Send the queries to the academic_paper_search_tool as a tool call.
'''

decision_prompt = '''You are an academic researcher that is searching Academic and Scientific Research Papers.

You will be given a project plan and a list of articles.

Based on the project plan and articles provided, you must choose a maximum of 3 to investigate that are most relevant to that plan.

IMPORTANT: You must return ONLY a JSON array of the PDF URLs with no additional text or explanation. Your entire response should be in this exact format:

[
    "url1",
    "url2", 
    "url3",
    ...
]

Do not include any other text, explanations, or formatting.'''

analyze_paper_prompt = '''You are an academic researcher trying to understand the details of scientific and academic research papers.

You must look through the text provided and get the details from the Abstract, Introduction, Methods, Results, and Conclusions.
If you are in an Abstract section, just give me the condensed thoughts.
If you are in an Introduction section, give me a concise reason on why the research was done.
If you are in a Methods section, give me low-level details of the approach. Analyze the math and tell me what it means.
If you are in a Results section, give me low-level relevant objective statistics. Tie it in with the methods
If you are in a Conclusions section, give me the fellow researcher's thoughts, but also come up with a counter-argument if none are given.

Remember to attach the other information to the top:
    Title : 
    Year : 
    Authors : 
    URL : 
    TLDR Analysis:
        
'''

########################################################
abstract_prompt = '''You are an academic researcher that is writing a systematic review of Academic and Scientific Research Papers.
You are tasked with writing the Abstract section of the paper based on the systematic outline and the analyses given.
Make the abstract no more than 100 words.
'''

introduction_prompt = '''You are an academic researcher that is writing a systematic review of Academic and Scientific Research Papers.
You are tasked with writing the Introduction section of the paper based on the systematic outline and the analyses given.
Make sure it is thorough and covers information in all the papers.
'''

methods_prompt = '''You are an academic researcher that is writing a systematic review of Academic and Scientific Research Papers.
You are tasked with writing the Methods section of the paper based on the systematic outline and the analyses given.
Make sure it is thorough and covers information in all the papers. Draw on the differences and similarities in approaches in each paper.
'''

results_prompt = '''You are an academic researcher that is writing a systematic review of Academic and Scientific Research Papers.
You are tasked with writing the Results section of the paper based on the systematic outline and the analyses given.
Make sure it is thorough and covers information in all the papers. If there are results to compare among papers, please do so.
'''

conclusions_prompt = '''You are an academic researcher that is writing a systematic review of Academic and Scientific Research Papers.
You are tasked with writing the Conclusions section of the paper based on the systematic outline and the analyses given.
Make sure it is thorough and covers information in all the papers.
Draw on the conclusions from other papers, and what you might think the future of the research holds.
'''

references_prompt = '''You are an academic researcher that is writing a systematic review of Academic and Scientific Research Papers.
You are tasked with writing the References section of the paper based on the systematic outline and the analyses given.
Construct an APA style references list
'''
#########################################################
critique_draft_prompt = """You are an academic researcher deciding whether or not a systematic review should be published.
Generate a critique and recommendations for the author's submission or generate a query to get more papers.

If you think just a revision needs to be made, provide detailed recommendations, including requests for length, depth, style.
If you think the paper is good as is, just end with the draft unchanged.
"""

revise_draft_prompt = """You are an academic researcher that is revising a systematic review that is about to be published.
Given the paper below, revise it following the recommendations given.

Return the revised paper with the implemented recommended changes.
"""

# Tools setup
tools = [AcademicPaperSearchTool()]
model = ChatOpenAI(model='gpt-4', temperature=0.3)
model_with_tools = model.bind_tools(tools)  # Bind tools to model
temperature = 0.1

def reduce_messages(left: list[AnyMessage], right: list[AnyMessage]) -> list[AnyMessage]:
    for message in right:
        if not message.id:
            message.id = str(uuid4())
    merged = left.copy()
    for message in right:
        for i, existing in enumerate(merged):
            if existing.id == message.id:
                merged[i] = message
                break
        else:
            merged.append(message)
    return merged

class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], reduce_messages]
    systematic_review_outline: str
    last_human_index: int
    papers: Annotated[List[Dict[str, Any]], operator.add]  # Concatenable list for proper state management
    analyses: Annotated[List[str], operator.add]          # Concatenable list for proper state management
    title: str
    abstract: str
    introduction: str
    methods: str
    results: str
    conclusion: str
    references: str
    draft: str
    revision_num: int
    max_revisions: int

def process_input(state: AgentState):
    messages = state.get('messages', [])
    last_human_index = len(messages) - 1
    for i in reversed(range(len(messages))):
        if isinstance(messages[i], HumanMessage):
            last_human_index = i
            break
    return {
        "last_human_index": last_human_index, 
        "max_revisions": 2, 
        "revision_num": 1,
        "papers": [],
        "analyses": [],
        "systematic_review_outline": "",  # String as per AgentState
        "title": "",
        "abstract": "",  # String as per AgentState
        "introduction": "",  # String as per AgentState
        "methods": "",  # String as per AgentState
        "results": "",  # String as per AgentState
        "conclusion": "",  # String as per AgentState
        "references": "",  # String as per AgentState
        "draft": ""  # String as per AgentState
    }

def get_relevant_messages(state: AgentState) -> List[AnyMessage]:
    messages = state['messages']
    filtered_history = []
    for message in messages:
        if isinstance(message, (HumanMessage, AIMessage)) and message.content:
            filtered_history.append(message)
    last_human_index = state['last_human_index']
    return filtered_history[:-1] + messages[last_human_index:]

def plan_node(state: AgentState):
    print("🔄 PLANNER")
    relevant_messages = get_relevant_messages(state)
    messages = [SystemMessage(content=planner_prompt)] + relevant_messages
    response = model.invoke(messages, temperature=0.3)
    return {"systematic_review_outline": [response]}

def research_node(state: AgentState):
    print("🔍 RESEARCHER")
    review_plan = state['systematic_review_outline']
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [SystemMessage(content=research_prompt), SystemMessage(content=review_plan_text)]
    response = model_with_tools.invoke(messages, temperature=0.3)
    return {"messages": [response]}

def take_action(state: AgentState):
    print("⚡ SEARCHING FOR PAPERS")
    last_message = state["messages"][-1]
    results = []
    
    # Check if the message has tool calls
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        for t in last_message.tool_calls:
            print(f"Calling: {t}")
            # Find the tool by name
            tool = next((tool for tool in tools if tool.name == t['name']), None)
            if tool:
                result = tool._run(**t['args'])
                results.append(ToolMessage(tool_call_id=t['id'], name=t['name'], content=str(result)))
    else:
        print("No tool calls found in the message")
    
    return {"messages": results}

def decision_node(state: AgentState):
    print("🎯 DECISION-MAKER")
    review_plan = state['systematic_review_outline']
    relevant_messages = get_relevant_messages(state)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=decision_prompt),
        SystemMessage(content=review_plan_text)
    ] + relevant_messages
    response = model.invoke(messages, temperature=temperature)
    print(response)
    print()
    return {"messages": [response]}

def article_download(state: AgentState):
    print("📥 DOWNLOADING PAPERS")
    last_message = state["messages"][-1]

    try:
        # Handle different types of content
        if isinstance(last_message.content, str):
            import ast
            try:
                urls = ast.literal_eval(last_message.content)
                if not isinstance(urls, list):
                    urls = [last_message.content]  # Single URL as string
            except (ValueError, SyntaxError):
                urls = [last_message.content]  # Single URL as string
        else:
            urls = last_message.content

        filenames = []
        for url in urls:
            if not isinstance(url, str):
                print(f"Skipping invalid URL: {url}")
                continue
                
            try:
                response = requests.get(url)
                response.raise_for_status()

                # Create a papers directory if it doesn't exist
                if not os.path.exists('data'):
                    os.makedirs('data')

                # Generate a filename from the URL
                filename = f"data/{url.split('/')[-1]}"
                if not filename.endswith('.pdf'):
                    filename += '.pdf'

                # Save the PDF
                with open(filename, 'wb') as f:
                    f.write(response.content)

                filenames.append({"paper": filename})
                print(f"Successfully downloaded: {filename}")

            except Exception as e:
                print(f"Error downloading {url}: {str(e)}")
                continue

        # Return AIMessage instead of raw strings
        return {
            "papers": [
                AIMessage(
                    content=filenames,
                    response_metadata={'finish_reason': 'stop'}
                )
            ]
        }

    except Exception as e:
        # Return error as AIMessage
        return {
            "messages": [
                AIMessage(
                    content=f"Error processing downloads: {str(e)}",
                    response_metadata={'finish_reason': 'error'}
                )
            ]
        }

def paper_analyzer(state: AgentState):
    print("📊 ANALYZING PAPERS")
    analyses = ""
    
    try:
        import pymupdf4llm
        
        for paper_msg in state['papers']:
            if isinstance(paper_msg, AIMessage) and isinstance(paper_msg.content, list):
                for paper in paper_msg.content:
                    file_path = f"./{paper['paper']}"
                    try:
                        # Check if the file is a valid PDF before processing
                        md_text = pymupdf4llm.to_markdown(file_path)
                        messages = [
                            SystemMessage(content=analyze_paper_prompt),
                            HumanMessage(content=md_text)
                        ]

                        model_analysis = ChatOpenAI(model='gpt-4')
                        response = model_analysis.invoke(messages, temperature=0.1)
                        print(response)
                        analyses += str(response.content) + "\n\n"
                    except ValueError as e:
                        print(f"⚠️ Skipping file {file_path}, it's not a valid PDF: {e}")
                        continue  # Skip to the next paper
                    except Exception as e:
                        print(f"⚠️ Error processing {file_path}: {e}")
                        continue
            
    except ImportError:
        print("pymupdf4llm not installed. Using simplified analysis...")
        # Fallback to simplified analysis
        for i, paper in enumerate(state.get('papers', [])):
            if isinstance(paper, dict):
                analysis = f"""
Paper {i+1}: {paper.get('title', 'Unknown Title')}
Authors: {', '.join(paper.get('authors', []))}
Year: {paper.get('year', 'Unknown')}

Abstract: {paper.get('abstract', 'No abstract available')[:300] if paper.get('abstract') else 'No abstract available'}...

Key Points:
- Methodology: Research methodology analysis
- Findings: Key research findings  
- Relevance: Highly relevant to systematic review
"""
                analyses += analysis + "\n\n"
    
    return {"analyses": [analyses]}

@retry(
    retry=retry_if_exception_type(openai.RateLimitError),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(3)
)
def _make_api_call(model_instance, messages, temperature=0.1):
    try:
        return model_instance.invoke(messages, temperature=temperature)
    except openai.RateLimitError as e:
        print(f"Rate limit reached. Waiting... ({e})")
        raise

def write_abstract(state: AgentState):
    print("✍️ WRITING ABSTRACT")
    review_plan = state['systematic_review_outline']
    analyses = state['analyses']
    # Convert analyses list to string if needed
    analyses_text = ""
    if isinstance(analyses, list) and len(analyses) > 0:
        analyses_text = str(analyses[-1]) if hasattr(analyses[-1], 'content') else str(analyses[-1])
    else:
        analyses_text = str(analyses)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=abstract_prompt),
        SystemMessage(content=f"Review Plan: {review_plan_text}"),
        SystemMessage(content=f"Analyses: {analyses_text}")
    ]
    model_instance = ChatOpenAI(model='gpt-4')
    response = _make_api_call(model_instance, messages)
    print(response)
    print()
    return {"abstract": [response]}

def write_introduction(state: AgentState):
    print("✍️ WRITING INTRODUCTION")
    review_plan = state['systematic_review_outline']
    analyses = state['analyses']
    # Convert analyses list to string if needed
    analyses_text = ""
    if isinstance(analyses, list) and len(analyses) > 0:
        analyses_text = str(analyses[-1]) if hasattr(analyses[-1], 'content') else str(analyses[-1])
    else:
        analyses_text = str(analyses)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=introduction_prompt),
        SystemMessage(content=f"Review Plan: {review_plan_text}"),
        SystemMessage(content=f"Analyses: {analyses_text}")
    ]
    model_instance = ChatOpenAI(model='gpt-4')
    response = _make_api_call(model_instance, messages)
    print(response)
    print()
    return {"introduction": [response]}

def write_methods(state: AgentState):
    print("✍️ WRITING METHODS")
    review_plan = state['systematic_review_outline']
    analyses = state['analyses']
    # Convert analyses list to string if needed
    analyses_text = ""
    if isinstance(analyses, list) and len(analyses) > 0:
        analyses_text = str(analyses[-1]) if hasattr(analyses[-1], 'content') else str(analyses[-1])
    else:
        analyses_text = str(analyses)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=methods_prompt),
        SystemMessage(content=f"Review Plan: {review_plan_text}"),
        SystemMessage(content=f"Analyses: {analyses_text}")
    ]
    model_instance = ChatOpenAI(model='gpt-4')
    response = _make_api_call(model_instance, messages)
    print(response)
    print()
    return {"methods": [response]}

def write_results(state: AgentState):
    print("✍️ WRITING RESULTS")
    review_plan = state['systematic_review_outline']
    analyses = state['analyses']
    # Convert analyses list to string if needed
    analyses_text = ""
    if isinstance(analyses, list) and len(analyses) > 0:
        analyses_text = str(analyses[-1]) if hasattr(analyses[-1], 'content') else str(analyses[-1])
    else:
        analyses_text = str(analyses)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=results_prompt),
        SystemMessage(content=f"Review Plan: {review_plan_text}"),
        SystemMessage(content=f"Analyses: {analyses_text}")
    ]
    model_instance = ChatOpenAI(model='gpt-4')
    response = _make_api_call(model_instance, messages)
    print(response)
    print()
    return {"results": [response]}

def write_conclusion(state: AgentState):
    print("✍️ WRITING CONCLUSIONS")
    review_plan = state['systematic_review_outline']
    analyses = state['analyses']
    # Convert analyses list to string if needed
    analyses_text = ""
    if isinstance(analyses, list) and len(analyses) > 0:
        analyses_text = str(analyses[-1]) if hasattr(analyses[-1], 'content') else str(analyses[-1])
    else:
        analyses_text = str(analyses)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=conclusions_prompt),
        SystemMessage(content=f"Review Plan: {review_plan_text}"),
        SystemMessage(content=f"Analyses: {analyses_text}")
    ]
    model_instance = ChatOpenAI(model='gpt-4')
    response = _make_api_call(model_instance, messages)
    print(response)
    print()
    return {"conclusion": [response]}

def write_references(state: AgentState):
    print("✍️ WRITING REFERENCES")
    review_plan = state['systematic_review_outline']
    analyses = state['analyses']
    # Convert analyses list to string if needed
    analyses_text = ""
    if isinstance(analyses, list) and len(analyses) > 0:
        analyses_text = str(analyses[-1]) if hasattr(analyses[-1], 'content') else str(analyses[-1])
    else:
        analyses_text = str(analyses)
    
    # Convert review_plan to string if it's a list
    review_plan_text = ""
    if isinstance(review_plan, list) and len(review_plan) > 0:
        review_plan_text = str(review_plan[-1]) if hasattr(review_plan[-1], 'content') else str(review_plan[-1])
    else:
        review_plan_text = str(review_plan)
    
    messages = [
        SystemMessage(content=references_prompt),
        SystemMessage(content=f"Review Plan: {review_plan_text}"),
        SystemMessage(content=f"Analyses: {analyses_text}")
    ]
    model_instance = ChatOpenAI(model='gpt-4')
    response = _make_api_call(model_instance, messages)
    print(response)
    print()
    return {"references": [response]}

def aggregator(state: AgentState):
    print("📝 CREATING FINAL DRAFT")
    # Extract content from message lists
    def extract_content(field):
        if isinstance(field, list) and len(field) > 0:
            if hasattr(field[-1], 'content'):
                return field[-1].content
            else:
                return str(field[-1])
        else:
            return str(field)
    
    abstract = extract_content(state['abstract'])
    introduction = extract_content(state['introduction'])
    methods = extract_content(state['methods'])
    results = extract_content(state['results'])
    conclusion = extract_content(state['conclusion'])
    references = extract_content(state['references'])

    messages = [
        SystemMessage(content="Make a title for this systematic review based on the abstract. Write it in markdown."),
        HumanMessage(content=abstract)
    ]
    title = model.invoke(messages, temperature=0.1).content

    draft = title + "\n\n" + abstract + "\n\n" + introduction + "\n\n" + methods + "\n\n" + results + "\n\n" + conclusion + "\n\n" + references

    return {"draft": [draft]}

def critique(state: AgentState):
    print("🔍 REVIEWING DRAFT")
    draft = state["draft"]
    review_plan = state['systematic_review_outline']
    
    # Convert draft to string if it's a list
    draft_text = ""
    if isinstance(draft, list) and len(draft) > 0:
        draft_text = str(draft[-1]) if hasattr(draft[-1], 'content') else str(draft[-1])
    else:
        draft_text = str(draft)

    messages = [
        SystemMessage(content=critique_draft_prompt),
        SystemMessage(content=f"Review Plan: {review_plan}"),
        SystemMessage(content=f"Draft: {draft_text}")
    ]
    response = model.invoke(messages, temperature=temperature)
    print(response)

    # every critique is a call for revision
    return {'messages': [response], "revision_num": state.get("revision_num", 1) + 1}

def paper_reviser(state: AgentState):
    print("✏️ REVISING DRAFT")
    critique_msg = state["messages"][-1].content
    draft = state["draft"]
    
    # Convert draft to string if it's a list
    draft_text = ""
    if isinstance(draft, list) and len(draft) > 0:
        draft_text = str(draft[-1]) if hasattr(draft[-1], 'content') else str(draft[-1])
    else:
        draft_text = str(draft)

    messages = [
        SystemMessage(content=revise_draft_prompt),
        HumanMessage(content=critique_msg),
        SystemMessage(content=f"Draft: {draft_text}")
    ]
    response = model.invoke(messages, temperature=temperature)
    print(response)

    return {'draft': [response]}

def exists_action(state: AgentState):
    '''
    Determines whether to continue revising, end, or search for more articles
    based on the critique and revision count
    '''
    print("🤔 DECIDING WHETHER TO REVISE, END, or SEARCH AGAIN")

    if state["revision_num"] > state["max_revisions"]:
        return "final_draft"

    # Get the latest critique
    critique = state['messages'][-1]
    print(critique)

    # Check if the critique response has any tool calls
    if hasattr(critique, 'tool_calls') and critique.tool_calls:
        # The critique suggests we need more research
        return True
    else:
        # No more research needed, proceed with revision
        return "revise"

def final_draft(state: AgentState):
    print("✅ FINALIZING")
    return {"draft": state['draft']}

# Initialize
checkpointer = MemorySaver()
papers_tool = AcademicPaperSearchTool()

# Build graph
graph = StateGraph(AgentState)

# Add nodes
graph.add_node("process_input", process_input)
graph.add_node("planner", plan_node)
graph.add_node("researcher", research_node)
graph.add_node("search_articles", take_action)
graph.add_node("article_decisions", decision_node)
graph.add_node("download_articles", article_download)
graph.add_node("paper_analyzer", paper_analyzer)
graph.add_node("write_abstract", write_abstract)
graph.add_node("write_introduction", write_introduction)
graph.add_node("write_methods", write_methods)
graph.add_node("write_results", write_results)
graph.add_node("write_conclusion", write_conclusion)
graph.add_node("write_references", write_references)
graph.add_node("aggregate_paper", aggregator)
graph.add_node("critique_paper", critique)
graph.add_node("revise_paper", paper_reviser)
graph.add_node("final_draft", final_draft)

# Add edges
graph.add_edge("process_input", "planner")
graph.add_edge("planner", "researcher")
graph.add_edge("researcher", "search_articles")
graph.add_edge("search_articles", "article_decisions")
graph.add_edge("article_decisions", "download_articles")
graph.add_edge("download_articles", 'paper_analyzer')

# Parallel writing
graph.add_edge("paper_analyzer", "write_abstract")
graph.add_edge("paper_analyzer", "write_introduction")
graph.add_edge("paper_analyzer", "write_methods")
graph.add_edge("paper_analyzer", "write_results")
graph.add_edge("paper_analyzer", "write_conclusion")
graph.add_edge("paper_analyzer", "write_references")

# Convergence
graph.add_edge("write_abstract", "aggregate_paper")
graph.add_edge("write_introduction", "aggregate_paper")
graph.add_edge("write_methods", "aggregate_paper")
graph.add_edge("write_results", "aggregate_paper")
graph.add_edge("write_conclusion", "aggregate_paper")
graph.add_edge("write_references", "aggregate_paper")

graph.add_edge("aggregate_paper", 'critique_paper')

graph.add_conditional_edges(
    "critique_paper",
    exists_action,
    {"final_draft": "final_draft", 
     "revise": "revise_paper",
     True: "search_articles"}
)

graph.add_edge("revise_paper", "critique_paper")
graph.add_edge("final_draft", END)

graph.set_entry_point("process_input")
compiled_graph = graph.compile(checkpointer=checkpointer)

# FastAPI router for API integration
class ReviewRequest(BaseModel):
    topic: str = "quantum computing"

class ReviewResponse(BaseModel):
    review_id: str
    status: str
    output_file: Optional[str] = None
    word_count: Optional[int] = None
    preview: Optional[str] = None

systematic_review_router = APIRouter()

@systematic_review_router.post("/generate", response_model=ReviewResponse)
async def generate_review(request: ReviewRequest):
    """Generate a systematic review on the given topic."""
    try:
        # Generate review ID
        review_id = f"review_{uuid4().hex[:8]}"
        
        # Prepare input
        agent_input = {"messages": [HumanMessage(content=request.topic)]}
        thread_config = {"configurable": {"thread_id": review_id}}
        
        # Generate review
        result = compiled_graph.invoke(agent_input, thread_config)
        
        # Save result
        os.makedirs("systematic_review_output", exist_ok=True)
        output_file = f"systematic_review_output/review_{request.topic.replace(' ', '_')}.md"
        
        # Extract draft content
        draft_content = result.get('draft', ['No draft generated'])
        if isinstance(draft_content, list) and len(draft_content) > 0:
            if hasattr(draft_content[0], 'content'):
                final_draft = draft_content[0].content
            else:
                final_draft = str(draft_content[0])
        else:
            final_draft = 'No draft generated'
        
        # Save to file
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(final_draft)
        
        # Create response
        return ReviewResponse(
            review_id=review_id,
            status="completed",
            output_file=output_file,
            word_count=len(final_draft.split()),
            preview=final_draft[:500] + "..." if len(final_draft) > 500 else final_draft
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@systematic_review_router.get("/output/{review_id}")
async def get_review(review_id: str):
    """Get a generated systematic review by its ID."""
    try:
        # Find the review file
        output_dir = "systematic_review_output"
        if not os.path.exists(output_dir):
            raise HTTPException(status_code=404, detail="No reviews generated yet")
            
        # Find the specific review file
        review_files = [f for f in os.listdir(output_dir) if f.startswith(f"review_") and f.endswith(".md")]
        review_file = None
        
        for file in review_files:
            if review_id in file:
                review_file = os.path.join(output_dir, file)
                break
        
        if not review_file:
            raise HTTPException(status_code=404, detail=f"Review {review_id} not found")
            
        # Read and return the review
        with open(review_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        return {
            "review_id": review_id,
            "content": content,
            "word_count": len(content.split())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export the router
__all__ = ["systematic_review_router"] 