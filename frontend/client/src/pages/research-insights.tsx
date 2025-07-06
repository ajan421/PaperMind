import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, Eye, Bookmark, Share2, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ResearchInsight } from '@/types';

export default function ResearchInsights() {
  const [topic, setTopic] = useState('');
  const [timeRange, setTimeRange] = useState('30-days');
  const [sources, setSources] = useState<string[]>(['papers', 'news']);
  const [insights, setInsights] = useState<ResearchInsight[]>([]);
  const [activeTab, setActiveTab] = useState('papers');
  const { toast } = useToast();

  // Fetch sample topics from the API
  const { data: sampleTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ['sampleTopics'],
    queryFn: () => api.getSampleTopics(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const searchInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!topic) throw new Error('Topic is required');
      return api.analyzeInsights(topic, sources, timeRange);
    },
    onSuccess: (data) => {
      // Mock insights data
      const mockInsights: ResearchInsight[] = [
        {
          id: '1',
          title: 'Attention Is All You Need: Revisiting Transformer Architectures for Language Understanding',
          description: 'This paper introduces a novel approach to transformer architectures that significantly improves performance on natural language understanding tasks while reducing computational requirements.',
          type: 'paper',
          source: 'arXiv',
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          views: 1234,
          impact: 'high',
          tags: ['transformers', 'nlp', 'attention'],
          url: 'https://arxiv.org/abs/example',
        },
        {
          id: '2',
          title: 'Multi-Modal Learning for Enhanced Computer Vision Applications',
          description: 'A comprehensive study on integrating multiple modalities for improved computer vision performance across various applications including medical imaging and autonomous systems.',
          type: 'paper',
          source: 'Nature ML',
          publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          views: 856,
          impact: 'medium',
          tags: ['computer-vision', 'multimodal', 'ml'],
          url: 'https://nature.com/articles/example',
        },
        {
          id: '3',
          title: 'OpenAI Releases New GPT-4 Turbo with Enhanced Capabilities',
          description: 'OpenAI has announced the release of GPT-4 Turbo, featuring improved context length, better instruction following, and reduced hallucination rates.',
          type: 'news',
          source: 'TechCrunch',
          publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          views: 15200,
          impact: 'high',
          tags: ['openai', 'gpt-4', 'llm'],
          url: 'https://techcrunch.com/example',
        },
      ];
      
      setInsights(mockInsights);
      toast({
        title: "Insights found!",
        description: `Found ${mockInsights.length} relevant insights for "${topic}".`,
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

  const handleSourceChange = (source: string, checked: boolean) => {
    setSources(prev => 
      checked ? [...prev, source] : prev.filter(s => s !== source)
    );
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
                {sampleTopics?.topics && sampleTopics.topics.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Suggested topics:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sampleTopics.topics.slice(0, 6).map((suggestedTopic, index) => (
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

              <div>
                <label className="block text-sm font-medium mb-2">Source Filter</label>
                <div className="space-y-2">
                  {[
                    { id: 'papers', label: 'Research Papers' },
                    { id: 'news', label: 'News Articles' },
                    { id: 'blogs', label: 'Technical Blogs' },
                    { id: 'conference', label: 'Conference Proceedings' },
                  ].map((source) => (
                    <div key={source.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={source.id}
                        checked={sources.includes(source.id)}
                        onCheckedChange={(checked) => handleSourceChange(source.id, checked as boolean)}
                      />
                      <label htmlFor={source.id} className="text-sm">
                        {source.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30-days">Last 30 days</SelectItem>
                    <SelectItem value="3-months">Last 3 months</SelectItem>
                    <SelectItem value="6-months">Last 6 months</SelectItem>
                    <SelectItem value="1-year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSearch}
                disabled={!topic || searchInsightsMutation.isPending}
                className="w-full"
              >
                Search Insights
              </Button>

              {searchInsightsMutation.isPending && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Searching latest research...</p>
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
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      Updated {formatTimeAgo(new Date(Date.now() - 2 * 60 * 60 * 1000))}
                    </span>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-4">🔍</div>
                    <p>Enter a research topic to discover the latest insights.</p>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="papers">Papers ({paperInsights.length})</TabsTrigger>
                      <TabsTrigger value="news">News ({newsInsights.length})</TabsTrigger>
                      <TabsTrigger value="trends">Trends</TabsTrigger>
                    </TabsList>

                    <TabsContent value="papers" className="mt-4">
                      <div className="space-y-4">
                        {paperInsights.map((insight) => (
                          <div
                            key={insight.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium text-foreground pr-4 flex-1">
                                {insight.title}
                              </h3>
                              <Badge className={getImpactColor(insight.impact)}>
                                {insight.impact === 'high' ? 'High Impact' : 
                                 insight.impact === 'medium' ? 'Trending' : 'New'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {insight.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {insight.source} • {formatTimeAgo(insight.publishedAt)}
                                </span>
                                <span className="flex items-center">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {insight.views.toLocaleString()} views
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleBookmark(insight)}
                                >
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShare(insight)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="news" className="mt-4">
                      <div className="space-y-4">
                        {newsInsights.map((insight) => (
                          <div
                            key={insight.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium text-foreground pr-4 flex-1">
                                {insight.title}
                              </h3>
                              <Badge className="bg-red-100 text-red-800">
                                Breaking
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {insight.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {insight.source} • {formatTimeAgo(insight.publishedAt)}
                                </span>
                                <span className="flex items-center">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {insight.views.toLocaleString()} views
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleBookmark(insight)}
                                >
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShare(insight)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="trends" className="mt-4">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium mb-3">Trending Topics</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { topic: 'Large Language Models', trend: 45 },
                              { topic: 'Multimodal AI', trend: 32 },
                              { topic: 'Federated Learning', trend: 28 },
                              { topic: 'Neural Architecture Search', trend: 12 },
                            ].map((item) => (
                              <div key={item.topic} className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium mb-2">{item.topic}</h4>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                                  <span>+{item.trend}% interest this month</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-3">Research Hotspots</h3>
                          <div className="space-y-3">
                            {[
                              { field: 'Computer Vision', papers: 127 },
                              { field: 'Natural Language Processing', papers: 89 },
                              { field: 'Reinforcement Learning', papers: 64 },
                            ].map((item) => (
                              <div key={item.field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">{item.field}</span>
                                <span className="text-sm text-muted-foreground">
                                  {item.papers} papers this month
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
