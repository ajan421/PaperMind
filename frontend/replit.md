# PaperMind - Research Automation Platform

## Overview

PaperMind is a comprehensive research automation platform built with React and Express.js that provides AI-powered tools for academic research. The application features a modern Material UI-inspired interface with multiple research assistance tools including document analysis, podcast generation, systematic reviews, and multi-language Q&A capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Custom component library built with Radix UI primitives and Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reload with Vite integration

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Application pages/routes
│   │   ├── lib/         # Utility functions and API client
│   │   └── hooks/       # Custom React hooks
├── server/           # Express.js backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database abstraction layer
│   └── vite.ts       # Vite integration for development
├── shared/           # Shared code between frontend and backend
│   └── schema.ts     # Database schema and validation
└── migrations/       # Database migration files
```

## Key Components

### Research Tools
1. **Research Assistant**: PDF upload and AI-powered Q&A interface
2. **Podcast Generator**: Converts research papers into audio content
3. **Research Gap Analyzer**: Identifies gaps and opportunities in research
4. **Systematic Review Generator**: Creates comprehensive literature reviews
5. **CAG System**: Multi-language document analysis with conversation history
6. **Research Insights**: Discovers and summarizes latest research papers

### UI Components
- **AppShell**: Main application layout with Material Design principles
- **NavigationDrawer**: Side navigation with route management
- **FileUpload**: Drag-and-drop file upload with validation
- **ChatInterface**: Real-time conversation interface
- **AudioPlayer**: Custom audio player for podcast playback

### API Integration
- Centralized API client in `client/src/lib/api.ts`
- Mock API responses for development
- Error handling and loading states
- File upload support for PDF processing

## Data Flow

1. **User Interaction**: Users interact with React components
2. **API Requests**: Frontend makes HTTP requests to Express backend
3. **Data Processing**: Backend processes requests and interacts with database
4. **State Management**: TanStack React Query manages server state and caching
5. **UI Updates**: Components re-render based on state changes

### Database Schema
- **Users Table**: Basic user authentication (currently in memory storage)
- **PostgreSQL Integration**: Configured with Drizzle ORM for type-safe database operations
- **Schema Definition**: Centralized in `shared/schema.ts` for consistency

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **State Management**: TanStack React Query
- **Form Handling**: React Hook Form with Zod validation
- **Utilities**: date-fns, lucide-react icons

### Backend Dependencies
- **Web Framework**: Express.js with TypeScript
- **Database**: Drizzle ORM, @neondatabase/serverless
- **Session Management**: express-session, connect-pg-simple
- **Development**: tsx for TypeScript execution, esbuild for production builds

### Development Tools
- **Build System**: Vite with React plugin
- **TypeScript**: Strict type checking across the application
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Development
- **Local Development**: `npm run dev` starts both frontend and backend
- **Hot Reload**: Vite provides fast refresh for frontend changes
- **Database**: Uses Neon Database for development and production

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: esbuild bundles Node.js application
- **Database Migrations**: Drizzle Kit handles schema changes
- **Environment Variables**: DATABASE_URL required for database connection

### Database Management
- **Migrations**: Stored in `migrations/` directory
- **Schema Updates**: `npm run db:push` applies changes
- **Type Safety**: Drizzle generates TypeScript types from schema

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 05, 2025. Initial setup