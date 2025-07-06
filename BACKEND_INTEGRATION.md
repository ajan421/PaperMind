# PaperMind - Backend-Frontend Integration Guide

## Overview
PaperMind is a comprehensive AI-powered research platform that integrates multiple backend services with a modern React frontend. This document outlines the complete backend API integration and frontend implementation.

## 🚀 Backend Services & Endpoints

### 1. Research Assistant (`/research`)
**Service**: Provides AI-powered Q&A capabilities for research queries.

#### Endpoints:
- `POST /research/ask` - Submit research questions
  - **Body**: `{ "query": "string" }`
  - **Response**: `{ "result": "string", "sources": ["string"] }`
- `GET /research/stream` - Real-time streaming of research analysis

#### Frontend Integration:
- **Page**: `/research-assistant`
- **Features**: Interactive chat interface, quick question suggestions, streaming responses
- **Components**: `ChatInterface`, query history management

### 2. Podcast Generator (`/podcast`)
**Service**: Converts research papers into engaging podcast conversations.

#### Endpoints:
- `POST /podcast/generate` - Generate podcast from PDF
  - **Body**: FormData with `pdf_file` and optional `stream_audio`
  - **Response**: `{ "status": "string", "audio_file": "string", "script_file": "string" }`
- `GET /podcast/stream/{filename}` - Stream generated audio with range support
- `GET /podcast/test-stream` - Test audio streaming functionality

#### Frontend Integration:
- **Page**: `/podcast-generator`
- **Features**: File upload, audio streaming, download capabilities, multiple voice support
- **Components**: `FileUpload`, `AudioPlayer` with seeking support

### 3. Gap Analysis (`/gaps`)
**Service**: Identifies research gaps and opportunities in academic papers.

#### Endpoints:
- `POST /gaps/analyze` - Analyze research gaps in uploaded PDF
  - **Body**: FormData with `pdf_file`
  - **Response**: `{ "status": "string", "analysis": { "research_gaps": [], "methodology_gaps": [], "technology_gaps": [] } }`

#### Frontend Integration:
- **Page**: `/gap-analyzer`
- **Features**: PDF analysis, gap visualization, confidence scoring, recommendations
- **Components**: Advanced gap categorization, priority indicators

### 4. Systematic Review (`/systematic-review`)
**Service**: Generates comprehensive systematic reviews from research topics.

#### Endpoints:
- `POST /systematic-review/generate` - Generate systematic review
  - **Body**: `{ "topic": "string" }`
  - **Response**: `{ "review_id": "string", "status": "string", "word_count": number, "preview": "string" }`
- `GET /systematic-review/output/{review_id}` - Retrieve generated review
  - **Response**: `{ "review_id": "string", "content": "string", "word_count": number }`

#### Frontend Integration:
- **Page**: `/systematic-review`
- **Features**: Topic-based generation, progress tracking, Markdown rendering, download options
- **Components**: Progress indicators, markdown viewer, statistics display

### 5. CAG System (`/cag`)
**Service**: Cache-Augmented Generation with multi-language document Q&A.

#### Endpoints:
- `POST /cag/upload` - Upload and process documents
  - **Body**: FormData with multiple `files`
  - **Response**: `{ "message": "string", "processed_files": [], "total_chunks": number }`
- `POST /cag/ask-question` - Ask questions about processed documents
  - **Body**: FormData with `question` and `language`
  - **Response**: `{ "response": "string", "language": "string" }`
- `GET /cag/document-status` - Check document processing status
- `GET /cag/conversation-stats` - Get conversation history and statistics
- `POST /cag/clear-conversation` - Clear conversation history
- `POST /cag/reset-session` - Reset entire session and clear data
- `GET /cag/health` - Check CAG service health

#### Frontend Integration:
- **Page**: `/cag-system`
- **Features**: Multi-file upload, multi-language support, conversation history, session management
- **Components**: Language selector, document status tracking, conversation interface

### 6. Research Insights (`/insights`)
**Service**: Analyzes latest research papers and news trends.

#### Endpoints:
- `POST /insights/analyze` - Generate research insights
  - **Body**: `{ "research_focus": "string", "max_papers": number, "max_news": number }`
  - **Response**: Comprehensive insights with papers, news, and final report
- `GET /insights/status` - Check service availability
- `GET /insights/sample-topics` - Get sample research topics

#### Frontend Integration:
- **Page**: `/research-insights`
- **Features**: Topic analysis, paper insights, news trends, comprehensive reports
- **Components**: Tabbed interface, insights visualization, export capabilities

## 🔧 Frontend Architecture

### API Client (`src/lib/api.ts`)
Centralized API client with:
- Type-safe request/response handling
- Error handling with proper error types
- Streaming support for real-time features
- Health check utilities
- Connection testing

### Type Definitions (`src/types/index.ts`)
Comprehensive TypeScript types for:
- API request/response models
- UI component props
- Data structures
- Error handling

### Error Handling (`src/lib/error-handling.ts`)
- Custom `ApiError` class
- Global error handling utilities
- Health check functions
- Service connectivity monitoring

### System Status (`src/components/ui/system-status.tsx`)
Real-time system monitoring component:
- Backend service health checks
- Service availability indicators
- Performance metrics
- Error state handling

## 🎯 Key Features

### 1. Type Safety
- All API endpoints have corresponding TypeScript types
- Request/response validation
- Runtime error handling

### 2. Real-time Updates
- Server-Sent Events for streaming responses
- Progress tracking for long-running operations
- Live system status monitoring

### 3. Error Resilience
- Comprehensive error handling
- Retry mechanisms
- Graceful degradation
- User-friendly error messages

### 4. Performance Optimization
- Lazy loading of components
- Query caching with React Query
- Optimistic updates
- Background refetching

### 5. Multi-language Support
- CAG system supports multiple languages
- Internationalization ready
- Language-specific responses

### 6. File Handling
- Multiple file upload support
- Progress tracking
- File type validation
- Stream processing

## 🚀 Development Setup

### Backend Requirements
- Python 3.8+
- FastAPI
- Required API keys (OpenAI, Semantic Scholar, etc.)

### Frontend Requirements
- Node.js 18+
- React 18
- TypeScript
- Tailwind CSS

### Environment Configuration
```env
# Backend (.env)
OPENAI_API_KEY=your_key_here
SEMANTIC_SCHOLAR=your_key_here
GEMINI_API_KEY=your_key_here

# Frontend
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:8000
```

### Running the Application
```bash
# Backend
cd backend
pip install -r requirements.txt
python main_app.py

# Frontend
cd frontend
npm install
npm run dev
```

## 📊 System Status Dashboard

The home page includes a comprehensive system status dashboard that monitors:
- Core API health
- CAG system availability
- Research Insights service status
- Performance metrics
- Feature availability

## 🔒 Security Considerations

- CORS properly configured for production
- File upload validation
- API rate limiting (backend-side)
- Error message sanitization
- Input validation on all endpoints

## 📈 Monitoring & Analytics

- Real-time health checks
- Service availability tracking
- Performance metrics collection
- Error rate monitoring
- User interaction analytics

## 🚀 Future Enhancements

- WebSocket support for real-time collaboration
- Advanced caching strategies
- Progressive Web App features
- Offline functionality
- Enhanced multi-language support

## 📝 API Documentation

Full API documentation is available at:
- Interactive Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

This integration provides a robust, scalable, and user-friendly research platform that leverages the full power of the PaperMind backend services.
