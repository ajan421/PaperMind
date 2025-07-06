export interface PaperAnalysis {
  id: string;
  filename: string;
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'error';
  summary?: string;
  gaps?: ResearchGap[];
  insights?: string[];
}

export interface ResearchGap {
  id: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  language?: string;
  sources?: string[];
}

export interface PodcastGeneration {
  id: string;
  title: string;
  filename: string;
  duration: number;
  status: 'generating' | 'completed' | 'error';
  audioUrl?: string;
  generatedAt: Date;
  style: 'conversational' | 'academic' | 'popular';
}

export interface SystematicReview {
  id: string;
  topic: string;
  type: 'systematic' | 'meta-analysis' | 'scoping' | 'literature';
  timeRange: string;
  sections: {
    abstract: string;
    introduction: string;
    methods: string;
    results: string;
    conclusions: string;
    references: string[];
  };
  statistics: {
    studiesReviewed: number;
    countries: number;
    yearsCovered: number;
    qualityScore: number;
  };
  status: 'generating' | 'completed' | 'error';
  generatedAt: Date;
}

export interface ResearchInsight {
  id: string;
  title: string;
  description: string;
  type: 'paper' | 'news' | 'blog' | 'conference';
  source: string;
  publishedAt: Date;
  views: number;
  impact: 'high' | 'medium' | 'low';
  tags: string[];
  url: string;
}

export interface InsightsAnalysisResponse {
  status: string;
  research_focus: string;
  papers_analyzed: number;
  news_analyzed: number;
  paper_insights: Array<{
    title: string;
    authors: string[];
    key_contributions: string;
    technical_implications: string;
    potential_applications: string;
    methodology: string;
    significance_score: number;
    arxiv_id: string;
    url: string;
  }>;
  news_insights: Array<{
    title: string;
    summary: string;
    industry_impact: string;
    technical_relevance: string;
    url: string;
    source: string;
  }>;
  final_report: string | null;
  report_file: string | null;
}

export interface CAGDocument {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'error';
  uploadedAt: Date;
  pageCount?: number;
}

export interface ConversationStats {
  message_count: number;
  conversation_history: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

export interface DocumentStatus {
  status: string;
  processed_files: string[];
  total_chunks: number;
  start_time: string;
  end_time: string;
  processing_time_seconds: number;
}

export interface ApiHealth {
  status: string;
  service: string;
}

export interface InsightsStatus {
  status: string;
  availability: boolean;
}

export interface SampleTopics {
  sample_topics: string[];
}

export interface ApiInfo {
  message: string;
  version: string;
  description: string;
  tools: Record<string, {
    endpoint: string;
    method: string;
    description: string;
  }>;
  additional_endpoints: Record<string, {
    endpoint: string;
    method: string;
    description: string;
  }>;
  documentation: string;
  interactive_api: string;
}
