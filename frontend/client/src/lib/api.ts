import { apiRequest } from './queryClient';
import type { 
  ApiHealth, 
  InsightsStatus, 
  SampleTopics, 
  ApiInfo,
  DocumentStatus,
  ConversationStats,
  InsightsAnalysisResponse
} from '@/types';

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000';

export const api = {
  // Research Assistant
  async askQuestion(question: string): Promise<{ result: string }> {
    const response = await fetch(`${API_BASE}/research/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: question }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get answer');
    }
    
    return response.json();
  },

  // Podcast Generator
  async generatePodcast(file: File): Promise<{ audio_file: string; script_file: string; status: string }> {
    const formData = new FormData();
    formData.append('pdf_file', file);
    formData.append('stream_audio', 'false'); // Get file info instead of streaming
    
    const response = await fetch(`${API_BASE}/podcast/generate`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate podcast');
    }
    
    return response.json();
  },

  streamPodcast(filename: string): string {
    const streamUrl = `${API_BASE}/podcast/stream/${filename}`;
    console.log(`Generated streaming URL for ${filename}: ${streamUrl}`);
    return streamUrl;
  },

  // Get all generated podcasts from backend output directory
  async getGeneratedPodcasts(): Promise<{ podcasts: { filename: string; created_at: string; size: number }[] }> {
    try {
      const response = await fetch(`${API_BASE}/podcast/list`);
      
      if (!response.ok) {
        // If endpoint doesn't exist yet, return empty array
        if (response.status === 404) {
          return { podcasts: [] };
        }
        throw new Error('Failed to fetch generated podcasts');
      }
      
      return response.json();
    } catch (error) {
      // Fallback for when backend endpoint doesn't exist yet
      console.warn('Podcast list endpoint not available yet:', error);
      return { podcasts: [] };
    }
  },

  // Research Gap Analyzer
  async analyzeGaps(file: File): Promise<{ status: string; analysis: any }> {
    const formData = new FormData();
    formData.append('pdf_file', file); // Backend expects 'pdf_file' parameter
    
    const response = await fetch(`${API_BASE}/gaps/analyze`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze gaps');
    }
    
    return response.json();
  },

  // Systematic Review
  async generateReview(topic: string): Promise<{ review_id: string; status: string; output_file?: string; word_count?: number; preview?: string }> {
    const response = await fetch(`${API_BASE}/systematic-review/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate review');
    }
    
    return response.json();
  },

  async getReview(reviewId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/systematic-review/output/${reviewId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get review');
    }
    
    return response.json();
  },

  // CAG System
  async uploadCAGDocuments(files: File[]): Promise<{ message: string; processed_files: string[]; total_chunks: number }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await fetch(`${API_BASE}/cag/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload documents');
    }
    
    return response.json();
  },

  async askCAGQuestion(question: string, language: string): Promise<{ response: string }> {
    const formData = new FormData();
    formData.append('question', question);
    formData.append('language', language);
    
    const response = await fetch(`${API_BASE}/cag/ask-question`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to get answer');
    }
    
    return response.json();
  },

  async getDocumentStatus(): Promise<DocumentStatus> {
    const response = await fetch(`${API_BASE}/cag/document-status`);
    
    if (!response.ok) {
      throw new Error('Failed to get document status');
    }
    
    return response.json();
  },

  async getConversationStats(): Promise<ConversationStats> {
    const response = await fetch(`${API_BASE}/cag/conversation-stats`);
    
    if (!response.ok) {
      throw new Error('Failed to get conversation stats');
    }
    
    return response.json();
  },

  async resetSession(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/cag/reset-session`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset session');
    }
    
    return response.json();
  },

  async clearConversation(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/cag/clear-conversation`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear conversation');
    }
    
    return response.json();
  },

  // Research Insights
  async analyzeInsights(topic: string, maxPapers: number = 10, maxNews: number = 8): Promise<InsightsAnalysisResponse> {
    const response = await fetch(`${API_BASE}/insights/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        research_focus: topic,
        max_papers: maxPapers,
        max_news: maxNews
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze insights');
    }
    
    return response.json();
  },

  async getInsightsStatus(): Promise<InsightsStatus> {
    const response = await fetch(`${API_BASE}/insights/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get insights status');
    }
    
    return response.json();
  },

  async getSampleTopics(): Promise<SampleTopics> {
    const response = await fetch(`${API_BASE}/insights/sample-topics`);
    
    if (!response.ok) {
      throw new Error('Failed to get sample topics');
    }
    
    return response.json();
  },

  // Health and system endpoints
  async getHealth(): Promise<ApiHealth> {
    const response = await fetch(`${API_BASE}/health`);
    
    if (!response.ok) {
      throw new Error('Failed to get health status');
    }
    
    return response.json();
  },

  async getApiInfo(): Promise<ApiInfo> {
    const response = await fetch(`${API_BASE}/`);
    
    if (!response.ok) {
      throw new Error('Failed to get API info');
    }
    
    return response.json();
  },

  async getCAGHealth(): Promise<{
    status: string;
    timestamp: string;
    gemini_api_configured: boolean;
    documents_processed: boolean;
    total_documents: number;
    total_chunks: number;
  }> {
    const response = await fetch(`${API_BASE}/cag/health`);
    
    if (!response.ok) {
      throw new Error('Failed to get CAG health status');
    }
    
    return response.json();
  },

  // Streaming utilities
  createResearchStream(onMessage: (data: any) => void, onError?: (error: Event) => void): EventSource {
    const eventSource = new EventSource(`${API_BASE}/research/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing stream data:', error);
      }
    };
    
    if (onError) {
      eventSource.onerror = onError;
    }
    
    return eventSource;
  },

  // Utility to test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  },
};
