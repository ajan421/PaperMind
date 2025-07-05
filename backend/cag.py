"""
Cache-Augmented Generation (CAG) Module
A FastAPI module for document processing and AI-powered Q&A

This module provides:
- PDF processing and text extraction
- AI integration with Google Gemini
- Multi-language support with translation
- Conversation management
- File upload handling
"""

import os
import time
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# FastAPI imports
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, ConfigDict

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# Translation imports
from deep_translator import GoogleTranslator

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables. Please set it in a .env file.")

# Pydantic models
class DocumentStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    status: str
    processed_files: List[str]
    total_chunks: int
    start_time: str
    end_time: str
    processing_time_seconds: float

class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    response: str

class ConversationStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    message_count: int
    conversation_history: List[Dict[str, str]]

# Global session state
session_state = {
    "contexts": {},
    "processComplete": False,
    "start_time": None,
    "end_time": None,
    "document_names": [],
    "total_chunk_count": 0,
    "conversation_history": []
}

# Utility functions
def save_uploaded_file(file: UploadFile, upload_dir: str = "uploads") -> str:
    """Save uploaded file to disk and return the file path."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    return file_path

def process_pdf(pdf_file: str) -> tuple[List[str], int]:
    """
    Process PDF file to extract text and split into chunks.
    
    Args:
        pdf_file: Path to the PDF file
        
    Returns:
        tuple: (list of text chunks, total chunk count)
    """
    try:
        loader = PyPDFLoader(pdf_file)
        pages = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=150,
            length_function=len,
            is_separator_regex=False
        )
        
        context = []
        chunk_count = 0

        for page in pages:
            chunks = text_splitter.split_text(page.page_content)
            context.extend(chunks)
            chunk_count += len(chunks)

        logger.info(f"Processed {chunk_count} chunks from {pdf_file}")
        return context, chunk_count
        
    except Exception as e:
        logger.error(f"Error processing PDF {pdf_file}: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

def ask_question_to_gemini(context: str, question: str, language: str) -> str:
    """
    Ask a question to Gemini AI with provided context and return translated response.
    
    Args:
        context: Combined text context from processed documents
        question: User's question
        language: Target language for response
        
    Returns:
        str: AI-generated response (translated if needed)
    """
    if not GEMINI_API_KEY:
        return "Error: Gemini API key not configured. Please set GEMINI_API_KEY in your environment."
    
    system_prompt = f"""
    You are a helpful assistant. Answer the question based on the following context:
    {context}
    
    Please provide a clear, accurate, and helpful response based only on the information provided in the context.
    If the information is not available in the context, please say so clearly.
    """
    
    try:
        chat_llm = ChatGoogleGenerativeAI(
            api_key=GEMINI_API_KEY,
            model="gemini-1.5-flash",
            temperature=0.7,
            max_tokens=None,
            timeout=None,
            max_retries=2,
        )
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=question)
        ]
        
        result = chat_llm.invoke(messages)
        response = result.content if hasattr(result, "content") else "Sorry, I couldn't retrieve a proper response."
        
        # Translate response to target language if not English
        if language.lower() not in ['en', 'english']:
            try:
                translator = GoogleTranslator(source="en", target=language)
                translated_response = translator.translate(response)
                response = translated_response
            except Exception as translation_error:
                logger.warning(f"Translation failed: {translation_error}. Returning original response.")
        
        logger.info(f"Generated response for question: {question}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return "Sorry, I encountered an error while processing your question. Please try again."

def translate_response(response: str, target_language: str) -> str:
    """Translate response to target language."""
    try:
        translator = GoogleTranslator(source="en", target=target_language)
        return translator.translate(response)
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return response

# Create FastAPI router
cag_router = APIRouter()

@cag_router.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """
    Upload and process PDF files.
    
    Args:
        files: List of PDF files to upload
        
    Returns:
        JSON response with processing results
    """
    # Check if all files have filenames and are PDFs
    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="All files must have filenames")
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    session_state["start_time"] = time.time()
    total_chunk_count = 0

    try:
        for file in files:
            file_path = save_uploaded_file(file)
            context, chunk_count = process_pdf(file_path)
            session_state["contexts"][file.filename] = context
            session_state["document_names"].append(file.filename)
            total_chunk_count += chunk_count

        session_state["total_chunk_count"] = total_chunk_count
        session_state["processComplete"] = True
        session_state["end_time"] = time.time()

        return JSONResponse(content={
            "message": "PDFs uploaded and processed successfully.",
            "processed_files": session_state["document_names"],
            "total_chunks": total_chunk_count
        })
        
    except Exception as e:
        logger.error(f"Error in upload process: {e}")
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")

@cag_router.get("/document-status", response_model=DocumentStatus)
async def document_status():
    """
    Get the status of document processing.
    
    Returns:
        DocumentStatus: Current processing status and statistics
    """
    if session_state["processComplete"]:
        total_time = session_state["end_time"] - session_state["start_time"]
        return DocumentStatus(
            status="Documents processed successfully.",
            processed_files=session_state["document_names"],
            total_chunks=session_state["total_chunk_count"],
            start_time=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(session_state["start_time"])),
            end_time=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(session_state["end_time"])),
            processing_time_seconds=round(total_time, 2)
        )
    return DocumentStatus(
        status="Document processing in progress or no documents uploaded.",
        processed_files=[],
        total_chunks=0,
        start_time="",
        end_time="",
        processing_time_seconds=0.0
    )

@cag_router.post("/ask-question", response_model=QuestionResponse)
async def ask_question(
    language: str = Form(...),
    question: str = Form(...)
):
    """
    Ask a question about the processed documents.
    
    Args:
        language: Target language for the response
        question: The question to ask
        
    Returns:
        QuestionResponse: AI-generated answer
    """
    if not session_state["processComplete"]:
        raise HTTPException(status_code=400, detail="No documents processed yet. Please upload and process documents first.")
    
    # Store user question in conversation history
    session_state["conversation_history"].append({
        "role": "user",
        "content": question,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
    })
    
    # Combine all document contexts
    combined_context = "\n".join(
        chunk for context in session_state["contexts"].values() 
        for chunk in context
    )
    
    # Generate response
    response = ask_question_to_gemini(combined_context, question, language)
    
    # Store AI response in conversation history
    session_state["conversation_history"].append({
        "role": "assistant",
        "content": response,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
    })
    
    # Keep only last 20 messages to prevent memory issues
    if len(session_state["conversation_history"]) > 20:
        session_state["conversation_history"] = session_state["conversation_history"][-20:]
    
    return QuestionResponse(response=response)

@cag_router.post("/clear-conversation")
async def clear_conversation():
    """
    Clear the conversation history.
    
    Returns:
        JSON response confirming conversation cleared
    """
    session_state["conversation_history"] = []
    return JSONResponse(content={"message": "Conversation history cleared successfully."})

@cag_router.get("/conversation-stats", response_model=ConversationStats)
async def conversation_stats():
    """
    Get conversation statistics and recent history.
    
    Returns:
        ConversationStats: Conversation statistics
    """
    return ConversationStats(
        message_count=len(session_state["conversation_history"]),
        conversation_history=session_state["conversation_history"][-10:] if session_state["conversation_history"] else []
    )

@cag_router.post("/reset-session")
async def reset_session():
    """
    Reset the entire session state (clear documents and conversation).
    
    Returns:
        JSON response confirming session reset
    """
    session_state.update({
        "contexts": {},
        "processComplete": False,
        "start_time": None,
        "end_time": None,
        "document_names": [],
        "total_chunk_count": 0,
        "conversation_history": []
    })
    return JSONResponse(content={"message": "Session reset successfully. All documents and conversation history cleared."})

@cag_router.get("/health")
async def health_check():
    """
    Health check endpoint for the CAG module.
    
    Returns:
        JSON response with system status
    """
    return {
        "status": "healthy",
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()),
        "gemini_api_configured": bool(GEMINI_API_KEY),
        "documents_processed": session_state["processComplete"],
        "total_documents": len(session_state["document_names"]),
        "total_chunks": session_state["total_chunk_count"]
    }

# Export the router
__all__ = ["cag_router"] 