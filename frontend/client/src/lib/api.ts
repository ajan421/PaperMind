import { apiRequest } from './queryClient';
import type { 
  ApiHealth, 
  InsightsStatus, 
  SampleTopics, 
  ApiInfo,
  DocumentStatus,
  ConversationStats,
  InsightsAnalysisResponse,
  PodcastGenerationResponse,
  ReviewGenerationResponse,
  ReviewContentResponse,
  GapAnalysisResponse,
  QueryResponse
} from '@/types';

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000';

export const api = {
  // Research Assistant
  async askQuestion(question: string): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE}/research/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: question }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get answer: ${errorText}`);
    }
    
    return response.json();
  },

  // Podcast Generator - Enhanced version that handles backend streaming behavior
  async generatePodcast(file: File): Promise<PodcastGenerationResponse> {
    try {
      // First, try to generate with stream_audio=false for JSON response
      const formData = new FormData();
      formData.append('pdf_file', file);
      formData.append('stream_audio', 'false');
      
      const response = await fetch(`${API_BASE}/podcast/generate`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }
      
      // Check if we got JSON response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      // If we got audio stream instead, the file is still generated
      // We need to construct the response manually
      console.warn('Backend returned audio stream despite stream_audio=false. File should be generated.');
      
      // Since the podcast is generated successfully, use a predictable filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = file.name.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '_');
      
      return {
        status: 'success',
        audio_file: 'podcast.mp3', // Backend typically saves as podcast.mp3
        script_file: 'podcast_script.json'
      };
      
    } catch (error) {
      console.error('Podcast generation error:', error);
      throw error;
    }
  },

  // Generate and stream podcast directly (for immediate playback)
  async generateAndStreamPodcast(file: File): Promise<Response> {
    const formData = new FormData();
    formData.append('pdf_file', file);
    formData.append('stream_audio', 'true'); // Stream audio directly
    
    const response = await fetch(`${API_BASE}/podcast/generate`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate and stream podcast: ${errorText}`);
    }
    
    return response; // Return the response for streaming
  },

  streamPodcast(filename: string): string {
    // Remove any path separators and get just the filename
    const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
    const streamUrl = `${API_BASE}/podcast/stream/${cleanFilename}`;
    console.log(`Generated streaming URL for ${cleanFilename}: ${streamUrl}`);
    return streamUrl;
  },

  // Test streaming endpoint
  testPodcastStream(): string {
    return `${API_BASE}/podcast/test-stream`;
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
  async analyzeGaps(file: File): Promise<GapAnalysisResponse> {
    const formData = new FormData();
    formData.append('pdf_file', file); // Backend expects 'pdf_file' parameter
    
    const response = await fetch(`${API_BASE}/gaps/analyze`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to analyze gaps: ${errorText}`);
    }
    
    return response.json();
  },

  // Systematic Review
  async generateReview(topic: string): Promise<ReviewGenerationResponse> {
    const response = await fetch(`${API_BASE}/systematic-review/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate review: ${errorText}`);
    }
    
    return response.json();
  },

  async getReview(reviewId: string): Promise<ReviewContentResponse> {
    const response = await fetch(`${API_BASE}/systematic-review/output/${reviewId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get review: ${errorText}`);
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

  // Alternative method: Generate and use the test stream
  async generatePodcastWithFallback(file: File): Promise<PodcastGenerationResponse> {
    try {
      // Generate the podcast (this will create the file even if response is malformed)
      const formData = new FormData();
      formData.append('pdf_file', file);
      
      const response = await fetch(`${API_BASE}/podcast/generate`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status} ${response.statusText}`);
      }
      
      // Regardless of response format, if we reach here, generation likely succeeded
      // The backend saves the file as podcast.mp3 in the output directory
      
      return {
        status: 'success',
        audio_file: 'podcast.mp3',
        script_file: 'podcast_script.json'
      };
      
    } catch (error) {
      console.error('Podcast generation failed:', error);
      throw error;
    }
  },
};
