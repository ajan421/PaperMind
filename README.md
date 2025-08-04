# 🧠 PaperMind - AI-Powered Research Automation Platform

PaperMind is a comprehensive research automation platform that leverages advanced AI technologies to streamline academic research workflows. The platform provides intelligent tools for research paper analysis, content generation, gap identification, and knowledge synthesis.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🔬 Core Research Tools

**🤖 Research Assistant**
- AI-powered Q&A system for research papers
- Advanced PDF processing and text extraction
- Contextual understanding with citation support
- Real-time streaming responses

**🎙️ Podcast Generator**
- Convert research papers into engaging podcast conversations
- Multi-voice audio generation with Azure Speech Services
- Streaming audio playback with seeking support
- Customizable conversation styles

**🔍 Research Gap Analyzer**
- Automated identification of research opportunities
- Confidence scoring for gap analysis
- Comprehensive suggestions for future research directions
- Integration with academic paper databases

**📊 Systematic Review Generator**
- Automated systematic literature review creation
- Multi-agent workflow for comprehensive analysis
- APA-style reference generation
- Structured academic output format

**⚡ CAG (Cache-Augmented Generation) System**
- Multi-language document Q&A capabilities
- Conversation history management
- Session-based document caching
- Translation support for global research

**📈 Research Insights Analyzer**
- Latest AI/ML research paper discovery
- Technical news aggregation and analysis
- Impact scoring and trend identification
- Comprehensive research reports

### 🛠️ Technical Features

- **📄 PDF Preview System**: In-browser PDF viewing with zoom controls
- **⚡ Real-time Streaming**: Server-sent events for live responses
- **🌍 Multi-language Support**: Translation and analysis in multiple languages
- **📱 Responsive Design**: Mobile-friendly interface with Material-UI
- **🛡️ Error Handling**: Comprehensive error management and user feedback
- **🎵 Audio Streaming**: Range request support for efficient audio playback

## 🏗️ Architecture

### 🐍 Backend (FastAPI)
```
backend/
├── main_app.py              # Main FastAPI application
├── researchassistant.py     # Research Q&A functionality
├── AgentPodcast.py          # Podcast generation system
├── gap.py                   # Research gap analysis
├── systematicreview.py      # Systematic review generation
├── cag.py                   # Cache-Augmented Generation
├── insights.py              # Research insights analyzer
├── pdf_utils.py             # PDF processing utilities
└── prompts/                 # AI prompts and templates
```

### ⚛️ Frontend (React + TypeScript)
```
frontend/client/src/
├── pages/                   # Main application pages
├── components/              # Reusable UI components
├── contexts/                # React contexts (theme, etc.)
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and API clients
└── types/                   # TypeScript type definitions
```

## 📋 Prerequisites

### 💻 System Requirements
- Python 3.8+
- Node.js 16+
- npm or yarn package manager

### 🔑 API Keys Required
- OpenAI API key (for GPT models)
- Azure Speech Services key (for audio generation)
- Tavily API key (for news search)
- Optional: Supabase credentials (for data storage)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/ajan421/PaperMind.git
cd PaperMind
```

### 2. 🐍 Backend Setup

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Environment Configuration
Create a `.env` file in the backend directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Azure Speech Services
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region

# Tavily API (for news search)
TAVILY_API_KEY=your_tavily_api_key

# Optional: Supabase (for data storage)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Application Settings
ENVIRONMENT=development
DEBUG=true
```

### 3. ⚛️ Frontend Setup

#### Install Node.js Dependencies
```bash
cd frontend
npm install
```

#### Frontend Environment Configuration
Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development

# Optional: Additional frontend configurations
VITE_APP_NAME=PaperMind
VITE_APP_VERSION=2.0.0
```

## ⚙️ Configuration

### 🐍 Backend Configuration

The backend uses FastAPI with the following key configurations:

- **CORS**: Configured for cross-origin requests
- **File Upload**: Supports PDF uploads up to 10MB
- **Streaming**: Server-sent events for real-time responses
- **Audio**: Range request support for audio streaming

### ⚛️ Frontend Configuration

The frontend is built with Vite and includes:

- **Material-UI**: Component library and theming
- **React Query**: Data fetching and caching
- **TypeScript**: Type-safe development
- **Responsive Design**: Mobile-first approach

## 🎯 Usage

### 🚀 Starting the Application

#### 1. Start the Backend Server
```bash
cd backend
uvicorn main_app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
Interactive API documentation: `http://localhost:8000/docs`

#### 2. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 🔬 Using the Research Tools

#### 🤖 Research Assistant
1. Navigate to the Research Assistant page
2. Upload a PDF research paper
3. Ask questions about the content
4. Receive AI-powered answers with citations

#### 🎙️ Podcast Generator
1. Go to the Podcast Generator page
2. Upload a research paper (PDF)
3. Click "Generate Podcast"
4. Listen to the generated audio conversation

#### 🔍 Gap Analyzer
1. Access the Gap Analyzer tool
2. Upload a research paper
3. Click "Analyze Gaps"
4. Review identified research opportunities

#### 📊 Systematic Review
1. Navigate to Systematic Review
2. Enter your research topic
3. Start the review generation process
4. Download the completed review as Markdown

#### 📈 Research Insights
1. Go to Research Insights
2. Enter your research focus area
3. Click "Analyze"
4. Review the comprehensive research report

## 📚 API Documentation

### 🔌 Core Endpoints

#### 🤖 Research Assistant
```
POST /research/ask
- Upload PDF and ask questions
- Returns streaming AI responses

GET /research/conversation-history
- Retrieve conversation history
```

#### 🎙️ Podcast Generation
```
POST /podcast/generate
- Generate podcast from PDF
- Returns audio file information

GET /podcast/stream/{filename}
- Stream generated audio
- Supports range requests
```

#### 🔍 Gap Analysis
```
POST /gaps/analyze
- Analyze research gaps in PDF
- Returns gaps with confidence scores
```

#### 📊 Systematic Review
```
POST /systematic-review/generate
- Generate systematic review
- Returns review ID

GET /systematic-review/output/{review_id}
- Retrieve generated review
```

#### 📈 Research Insights
```
POST /insights/analyze
- Analyze latest research in topic area
- Returns comprehensive report
```

### Response Formats

All endpoints return JSON responses with consistent error handling:

```json
{
  "status": "success|error",
  "data": {},
  "message": "Description",
  "timestamp": "ISO timestamp"
}
```

## 💻 Development

### 🏗️ Code Structure

#### 🐍 Backend Development
- **FastAPI**: RESTful API development
- **LangChain**: LLM integration and workflow management
- **LangGraph**: Multi-agent workflow orchestration
- **Pydantic**: Data validation and serialization

#### ⚛️ Frontend Development
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Material-UI**: Component library
- **Vite**: Fast development and building

### 🧪 Testing

#### 🐍 Backend Testing
```bash
cd backend
pytest tests/
```

#### ⚛️ Frontend Testing
```bash
cd frontend
npm run test
```

### 🏭 Building for Production

#### 🐍 Backend Production Build
```bash
cd backend
pip install gunicorn
gunicorn main_app:app --workers 4 --bind 0.0.0.0:8000
```

#### ⚛️ Frontend Production Build
```bash
cd frontend
npm run build
npm run start
```

### 🐳 Docker Deployment

Create production Docker containers:

```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "main_app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# Frontend Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "start"]
```

## Troubleshooting

### Common Issues

#### Backend Issues
- **API Key Errors**: Ensure all required API keys are set in environment variables
- **PDF Processing**: Verify PyMuPDF installation for PDF handling
- **Audio Generation**: Check Azure Speech Services configuration

#### Frontend Issues
- **CORS Errors**: Verify backend CORS configuration
- **Build Failures**: Check Node.js version compatibility
- **API Connection**: Ensure backend server is running

#### Performance Optimization
- **Large PDFs**: Consider splitting large documents for better processing
- **Memory Usage**: Monitor memory consumption with multiple concurrent requests
- **Audio Streaming**: Implement proper caching for generated audio files

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- **Python**: Follow PEP 8 style guidelines
- **TypeScript**: Use ESLint and Prettier configurations
- **Git**: Use conventional commit messages
- **Documentation**: Update relevant documentation

### Feature Requests
- Open an issue with detailed description
- Provide use case and expected behavior
- Include mockups or examples if applicable

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Check the [documentation](docs/)
- Review existing issues and discussions

## Acknowledgments

- OpenAI for GPT model access
- LangChain for LLM integration framework
- Material-UI for React components
- FastAPI for backend framework
- All contributors and maintainers

---

**PaperMind** - Empowering researchers with AI-driven automation tools for the modern academic workflow.
