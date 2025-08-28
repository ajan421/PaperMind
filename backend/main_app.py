from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from each module
from researchassistant import research_router
from gap import gap_router
from AgentPodcast import podcast_router
from systematicreview import systematic_review_router
from cag import cag_router
from insights import insights_router
from cag_evaluation import evaluation_router

app = FastAPI(
    title="PaperMind API - Research Tools",
    description="""
    ## 🧠 PaperMind API
    
    AI-powered tools for research paper analysis and content generation.
    
    ### Available Tools:
    - **ASK**: Get AI-powered answers about research papers
    - **Generate Podcast**: Convert PDFs into engaging podcast conversations
    - **Stream Podcast**: Stream generated audio with seeking support
    - **Analyze Gaps**: Identify research opportunities in academic papers
    - **Systematic Review**: Generate comprehensive systematic reviews
    - **CAG System**: Cache-Augmented Generation with multi-language support
    - **Research Insights**: Analyze latest research papers and news trends
    
    ### Features:
    - Real-time streaming responses
    - Audio streaming with range request support
    - Research gap identification
    - Conversational podcast generation with multiple voices
    - Automated systematic review generation
    - Multi-language document Q&A with Google Gemini
    - Conversation history management
    - AI/ML research paper and news analysis
    """,
    version="2.0.0",
    contact={
        "name": "PaperMind Team",
        "url": "https://github.com/papermind",
    },
    license_info={
        "name": "MIT",
    }
)

# Add CORS middleware for streaming support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"]
)

# Include routers from each module
app.include_router(research_router, prefix="/research", tags=["Research Assistant"])
app.include_router(gap_router, prefix="/gaps", tags=["Gap Analysis"])
app.include_router(podcast_router, prefix="/podcast", tags=["Podcast Generation"])
app.include_router(systematic_review_router, prefix="/systematic-review", tags=["Systematic Review"])
app.include_router(cag_router, prefix="/cag", tags=["Cache-Augmented Generation"])
app.include_router(insights_router, prefix="/insights", tags=["Research Insights"])
app.include_router(evaluation_router, prefix="/evaluation", tags=["CAG Evaluation"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to PaperMind API",
        "version": "2.0.0",
        "description": "AI-powered research paper analysis and podcast generation",
        "tools": {
            "ask": {
                "endpoint": "/research/ask",
                "method": "POST",
                "description": "Ask questions about research papers and get AI-powered answers"
            },
            "generate_podcast": {
                "endpoint": "/podcast/generate",
                "method": "POST",
                "description": "Convert research papers into engaging podcast conversations"
            },
            "stream_podcast": {
                "endpoint": "/podcast/stream/{filename}",
                "method": "GET",
                "description": "Stream generated podcast audio with seeking support"
            },
            "analyze_gaps": {
                "endpoint": "/gaps/analyze",
                "method": "POST",
                "description": "Identify research gaps and opportunities in academic papers"
            },
            "systematic_review": {
                "endpoint": "/systematic-review/generate",
                "method": "POST",
                "description": "Generate comprehensive systematic reviews of research papers"
            },
            "cag_upload": {
                "endpoint": "/cag/upload",
                "method": "POST",
                "description": "Upload and process PDF documents for CAG system"
            },
            "cag_ask": {
                "endpoint": "/cag/ask-question",
                "method": "POST",
                "description": "Ask questions about processed documents with multi-language support"
            },
            "research_insights": {
                "endpoint": "/insights/analyze",
                "method": "POST",
                "description": "Generate comprehensive research insights from latest papers and news"
            }
        },
        "additional_endpoints": {
            "stream_research": {
                "endpoint": "/research/stream",
                "method": "GET",
                "description": "Real-time streaming of research analysis"
            },
            "test_audio": {
                "endpoint": "/podcast/test-stream",
                "method": "GET",
                "description": "Test audio streaming with existing podcast"
            },
            "get_review": {
                "endpoint": "/systematic-review/output/{review_id}",
                "method": "GET",
                "description": "Get a generated systematic review by ID"
            },
            "health": {
                "endpoint": "/health",
                "method": "GET",
                "description": "Check API health status"
            },
            "cag_status": {
                "endpoint": "/cag/document-status",
                "method": "GET",
                "description": "Check CAG document processing status"
            },
            "cag_conversation_stats": {
                "endpoint": "/cag/conversation-stats",
                "method": "GET",
                "description": "Get CAG conversation statistics"
            },
            "cag_reset": {
                "endpoint": "/cag/reset-session",
                "method": "POST",
                "description": "Reset CAG session and clear all data"
            },
            "insights_status": {
                "endpoint": "/insights/status",
                "method": "GET",
                "description": "Check Research Insights service availability"
            },
            "insights_sample_topics": {
                "endpoint": "/insights/sample-topics",
                "method": "GET",
                "description": "Get sample research topics for insights analysis"
            }
        },
        "documentation": "/docs",
        "interactive_api": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PaperMind API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 