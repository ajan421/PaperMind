import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, Eye, Bookmark, Share2, TrendingUp, TrendingDown, Lightbulb, FileText, Download, ExternalLink, Users, Zap, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ResearchInsight, InsightsAnalysisResponse } from '@/types';
import ReactMarkdown from 'react-markdown';

export default function ResearchInsights() {
  const [topic, setTopic] = useState('');
  const [maxPapers, setMaxPapers] = useState(10);
  const [maxNews, setMaxNews] = useState(8);
  const [analysisResult, setAnalysisResult] = useState<InsightsAnalysisResponse | null>(null);
  const [insights, setInsights] = useState<ResearchInsight[]>([]);
  const [activeTab, setActiveTab] = useState('papers');
  const { toast } = useToast();

  // Fetch sample topics from the API
  const { data: sampleTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ['sampleTopics'],
    queryFn: () => api.getSampleTopics(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Check insights service status
  const { data: insightsStatus } = useQuery({
    queryKey: ['insightsStatus'],
    queryFn: () => api.getInsightsStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const searchInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!topic) throw new Error('Topic is required');
      return api.analyzeInsights(topic, maxPapers, maxNews);
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      
      // Convert backend insights to frontend format
      const convertedInsights: ResearchInsight[] = [
        // Convert paper insights
        ...data.paper_insights.map((paper, index) => ({
          id: `paper-${index}`,
          title: paper.title,
          description: paper.key_contributions,
          type: 'paper' as const,
          source: paper.arxiv_id ? 'arXiv' : 'Research',
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          views: Math.floor(Math.random() * 5000) + 100,
          impact: (paper.significance_score >= 8 ? 'high' : paper.significance_score >= 6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          tags: [paper.methodology, 'research'],
          url: paper.url,
        })),
        // Convert news insights
        ...data.news_insights.map((news, index) => ({
          id: `news-${index}`,
          title: news.title,
          description: news.summary,
          type: 'news' as const,
          source: news.source,
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
          views: Math.floor(Math.random() * 10000) + 500,
          impact: 'high' as const,
          tags: ['industry', 'news'],
          url: news.url,
        })),
      ];
      
      setInsights(convertedInsights);
      toast({
        title: "Analysis complete!",
        description: `Analyzed ${data.papers_analyzed} papers and ${data.news_analyzed} news articles for "${data.research_focus}".`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please enter a research topic first.",
        variant: "destructive",
      });
      return;
    }
    searchInsightsMutation.mutate();
  };

  const handleDownloadReport = () => {
    if (!analysisResult) {
      toast({
        title: "No report available",
        description: "Generate insights first to download a report.",
        variant: "destructive",
      });
      return;
    }

    const markdownContent = generateComprehensiveMarkdown();
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Create a more professional filename
    const sanitizedTopic = analysisResult.research_focus
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `research_insights_${sanitizedTopic}_${timestamp}.md`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "📄 Report downloaded",
      description: "Professional research insights report saved as markdown.",
    });
  };

  const handleBookmark = (insight: ResearchInsight) => {
    toast({
      title: "Bookmarked",
      description: `"${insight.title}" has been bookmarked.`,
    });
  };

  const handleShare = (insight: ResearchInsight) => {
    toast({
      title: "Shared",
      description: `"${insight.title}" has been shared.`,
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'paper':
        return 'bg-blue-100 text-blue-800';
      case 'news':
        return 'bg-red-100 text-red-800';
      case 'blog':
        return 'bg-purple-100 text-purple-800';
      case 'conference':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  const paperInsights = insights.filter(i => i.type === 'paper');
  const newsInsights = insights.filter(i => i.type === 'news');

  // Enhanced markdown formatting utilities
  const formatPaperInsightToMarkdown = (paper: any, index: number) => {
    const scoreIndicator = paper.significance_score >= 8 ? '🟢' : 
                          paper.significance_score >= 6 ? '🟡' : '🔵';
    
    return `## ${index + 1}. ${paper.title}

> ${scoreIndicator} **Significance Score:** ${paper.significance_score}/10 | **Authors:** ${paper.authors.join(', ')}

${paper.arxiv_id ? `📄 **ArXiv ID:** [${paper.arxiv_id}](${paper.url || '#'})` : ''}
${paper.url && !paper.arxiv_id ? `🔗 **Paper URL:** [View Paper](${paper.url})` : ''}

### 🔬 Key Contributions
${paper.key_contributions}

### ⚡ Technical Implications
${paper.technical_implications}

### 🎯 Potential Applications
${paper.potential_applications}

### 🛠️ Methodology
${paper.methodology}

---

`;
  };

  const formatNewsInsightToMarkdown = (news: any, index: number) => {
    return `## ${index + 1}. ${news.title}

> 📰 **Source:** ${news.source} | 🔗 [Read Article](${news.url || '#'})

### 📝 Summary
${news.summary}

### 🏭 Industry Impact
${news.industry_impact}

### 🔧 Technical Relevance
${news.technical_relevance}

---

`;
  };

  const generateComprehensiveMarkdown = () => {
    if (!analysisResult) return '';

    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let markdown = `# 📊 Research Insights Report

**🔍 Research Topic:** ${analysisResult.research_focus}  
**📅 Generated:** ${date}  
**📚 Papers Analyzed:** ${analysisResult.papers_analyzed}  
**📰 News Articles Analyzed:** ${analysisResult.news_analyzed}  
**✅ Status:** ${analysisResult.status}

---

## 📈 Executive Summary

This comprehensive research insights report provides an in-depth analysis of current developments in **${analysisResult.research_focus}**. The analysis covers ${analysisResult.papers_analyzed} research papers and ${analysisResult.news_analyzed} industry news articles to deliver actionable insights for researchers and practitioners.

`;

    // Top research findings section
    if (analysisResult.paper_insights.length > 0) {
      const topPapers = analysisResult.paper_insights
        .sort((a, b) => b.significance_score - a.significance_score)
        .slice(0, 3);
      
      markdown += `### 🏆 Top Research Findings

`;
      topPapers.forEach((paper, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        markdown += `${medal} **${paper.title}** (Score: ${paper.significance_score}/10)\n`;
      });
      
      markdown += `\n---\n\n`;
    }

    if (analysisResult.paper_insights.length > 0) {
      markdown += `# 📚 Research Papers Analysis

*Detailed analysis of ${analysisResult.paper_insights.length} research papers*

`;
      analysisResult.paper_insights.forEach((paper, index) => {
        markdown += formatPaperInsightToMarkdown(paper, index);
      });
    }

    if (analysisResult.news_insights.length > 0) {
      markdown += `
# 📰 Industry News Analysis

*Coverage of ${analysisResult.news_insights.length} industry news articles*

`;
      analysisResult.news_insights.forEach((news, index) => {
        markdown += formatNewsInsightToMarkdown(news, index);
      });
    }

    if (analysisResult.final_report) {
      markdown += `
# 🎯 Comprehensive Analysis

${analysisResult.final_report}

---

## 📋 Research Methodology

This report was generated using advanced AI analysis of academic papers and industry news. The significance scores are calculated based on citation potential, methodological rigor, and practical applicability.

**Analysis Parameters:**
- Maximum papers analyzed: ${analysisResult.papers_analyzed}
- Maximum news articles: ${analysisResult.news_analyzed}
- Research focus: ${analysisResult.research_focus}
- Generation date: ${date}

---

*Generated by PaperMind Research Insights Tool*
`;
    }

    return markdown;
  };

  // Enhanced copy markdown with better formatting
  const copyMarkdownToClipboard = () => {
    const markdownContent = generateComprehensiveMarkdown();
    navigator.clipboard.writeText(markdownContent).then(() => {
      toast({
        title: "✅ Copied to clipboard",
        description: "Professional markdown report copied successfully.",
      });
    }).catch(() => {
      toast({
        title: "❌ Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Research Insights Tool</h1>
          <p className="text-muted-foreground">
            Discover and summarize the latest research papers and news in AI/ML
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Section */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Search Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Research Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Natural Language Processing"
                />
                
                {/* Sample Topics Section */}
                {sampleTopics?.sample_topics && sampleTopics.sample_topics.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Suggested topics:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sampleTopics.sample_topics.slice(0, 6).map((suggestedTopic: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setTopic(suggestedTopic)}
                          className="text-xs h-7 px-3"
                        >
                          {suggestedTopic}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {topicsLoading && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                    <div className="w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    Loading suggestions...
                  </div>
                )}
              </div>
    
              <Button
                onClick={handleSearch}
                disabled={!topic || searchInsightsMutation.isPending}
                className="w-full"
              >
                {searchInsightsMutation.isPending ? 'Analyzing...' : 'Search Insights'}
              </Button>

              {analysisResult?.final_report && (
                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              )}

              {searchInsightsMutation.isPending && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Searching and analyzing research...</p>
                </div>
              )}

              {insightsStatus && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${insightsStatus.status === 'available' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-medium">Service Status</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {insightsStatus.status === 'available' ? 'Ready to analyze' : 'Service unavailable'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="lg:col-span-2">
            <Card className="material-elevation-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Research Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-4">🔍</div>
                    <p>Enter a research topic to discover the latest insights.</p>
                    {insightsStatus?.status !== 'available' && (
                      <p className="text-sm text-red-500 mt-2">
                        Service is currently unavailable. Please check back later.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Analysis Summary */}
                    {analysisResult && (
                      <div className="mb-6 p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-2">Analysis Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-semibold text-primary">{analysisResult.papers_analyzed}</div>
                            <div className="text-muted-foreground">Papers Analyzed</div>
                          </div>
                          <div>
                            <div className="font-semibold text-primary">{analysisResult.news_analyzed}</div>
                            <div className="text-muted-foreground">News Articles</div>
                          </div>
                          <div>
                            <div className="font-semibold text-primary">{analysisResult.research_focus}</div>
                            <div className="text-muted-foreground">Research Focus</div>
                          </div>
                          <div>
                            <div className="font-semibold text-primary">{analysisResult.status}</div>
                            <div className="text-muted-foreground">Status</div>
                          </div>
                        </div>
                        {analysisResult.final_report && (
                          <div className="mt-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">Comprehensive report generated</span>
                          </div>
                        )}
                      </div>
                    )}

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="papers">Papers ({paperInsights.length})</TabsTrigger>
                        <TabsTrigger value="news">News ({newsInsights.length})</TabsTrigger>
                        <TabsTrigger value="analysis">Analysis {analysisResult?.final_report ? '✓' : ''}</TabsTrigger>
                      </TabsList>                      <TabsContent value="papers" className="mt-4">
                        <div className="space-y-6">
                          {analysisResult?.paper_insights.map((paper, index) => (
                            <Card key={index} className="border-l-4 border-l-blue-500">
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                      {paper.title}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                      <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span>{paper.authors.join(', ')}</span>
                                      </div>
                                      {paper.arxiv_id && (
                                        <div className="flex items-center gap-1">
                                          <FileText className="h-4 w-4" />
                                          <span>{paper.arxiv_id}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`${
                                        paper.significance_score >= 8 ? 'border-green-500 text-green-700' :
                                        paper.significance_score >= 6 ? 'border-yellow-500 text-yellow-700' :
                                        'border-blue-500 text-blue-700'
                                      }`}
                                    >
                                      {paper.significance_score}/10
                                    </Badge>
                                    {paper.url && (
                                      <Button variant="ghost" size="sm" asChild>
                                        <a href={paper.url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Zap className="h-4 w-4 text-orange-500" />
                                      <h4 className="font-medium">Key Contributions</h4>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-muted-foreground">
                                      <ReactMarkdown>{paper.key_contributions}</ReactMarkdown>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="h-4 w-4 text-purple-500" />
                                      <h4 className="font-medium">Technical Implications</h4>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-muted-foreground">
                                      <ReactMarkdown>{paper.technical_implications}</ReactMarkdown>
                                    </div>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <h5 className="font-medium text-sm mb-2">Methodology</h5>
                                      <div className="prose prose-sm max-w-none text-muted-foreground">
                                        <ReactMarkdown>{paper.methodology}</ReactMarkdown>
                                      </div>
                                    </div>
                                    <div>
                                      <h5 className="font-medium text-sm mb-2">Applications</h5>
                                      <div className="prose prose-sm max-w-none text-muted-foreground">
                                        <ReactMarkdown>{paper.potential_applications}</ReactMarkdown>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )) || (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No papers analyzed yet. Run an insights search to see results.</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                    <TabsContent value="news" className="mt-4">
                      <div className="space-y-6">
                        {analysisResult?.news_insights.map((news, index) => (
                          <Card key={index} className="border-l-4 border-l-red-500">
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {news.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                    <Badge variant="outline" className="border-red-500 text-red-700">
                                      {news.source}
                                    </Badge>
                                    <Badge variant="secondary">
                                      Industry News
                                    </Badge>
                                  </div>
                                </div>
                                {news.url && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={news.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Summary</h4>
                                  <div className="prose prose-sm max-w-none text-muted-foreground">
                                    <ReactMarkdown>{news.summary}</ReactMarkdown>
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Industry Impact</h5>
                                    <div className="prose prose-sm max-w-none text-muted-foreground">
                                      <ReactMarkdown>{news.industry_impact}</ReactMarkdown>
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Technical Relevance</h5>
                                    <div className="prose prose-sm max-w-none text-muted-foreground">
                                      <ReactMarkdown>{news.technical_relevance}</ReactMarkdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )) || (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No news analyzed yet. Run an insights search to see results.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="analysis" className="mt-4">
                      <div className="space-y-6">
                        {analysisResult?.final_report ? (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Comprehensive Research Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown 
                                  components={{
                                    h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>,
                                    h3: ({children}) => <h3 className="text-lg font-medium mb-2 text-foreground">{children}</h3>,
                                    p: ({children}) => <p className="mb-3 text-muted-foreground leading-relaxed">{children}</p>,
                                    ul: ({children}) => <ul className="list-disc pl-6 mb-3 text-muted-foreground">{children}</ul>,
                                    ol: ({children}) => <ol className="list-decimal pl-6 mb-3 text-muted-foreground">{children}</ol>,
                                    li: ({children}) => <li className="mb-1">{children}</li>,
                                    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                                    em: ({children}) => <em className="italic">{children}</em>,
                                    code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                                    blockquote: ({children}) => <blockquote className="border-l-4 border-muted pl-4 italic text-muted-foreground">{children}</blockquote>,
                                  }}
                                >
                                  {analysisResult.final_report}
                                </ReactMarkdown>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <h3 className="text-lg font-medium mb-2">No Analysis Report Available</h3>
                            <p className="text-sm mb-4">Run an insights search to generate a comprehensive analysis report.</p>
                            <p className="text-xs">The report will include executive summary, key findings, and strategic insights.</p>
                          </div>
                        )}

                        {analysisResult && analysisResult.paper_insights.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Top Research Findings
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {analysisResult.paper_insights
                                  .sort((a, b) => b.significance_score - a.significance_score)
                                  .slice(0, 3)
                                  .map((paper, index) => (
                                  <div key={index} className="border-l-4 border-l-green-500 pl-4 py-2">
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-medium text-foreground">{paper.title}</h4>
                                      <Badge variant="outline" className="border-green-500 text-green-700">
                                        #{index + 1} • {paper.significance_score}/10
                                      </Badge>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-muted-foreground">
                                      <ReactMarkdown>{paper.key_contributions}</ReactMarkdown>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {analysisResult && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-3">
                                <Button onClick={handleDownloadReport} className="flex-1">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Full Report
                                </Button>
                                <Button variant="outline" onClick={copyMarkdownToClipboard}>
                                  Copy Markdown
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
