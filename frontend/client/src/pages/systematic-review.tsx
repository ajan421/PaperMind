import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { SystematicReview } from '@/types';

export default function SystematicReviewPage() {
  const [topic, setTopic] = useState('');
  const [reviewType, setReviewType] = useState('systematic');
  const [timeRange, setTimeRange] = useState('5-years');
  const [review, setReview] = useState<SystematicReview | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const generateReviewMutation = useMutation({
    mutationFn: async () => {
      if (!topic) throw new Error('Topic is required');
      return api.generateReview(topic, reviewType, timeRange);
    },
    onSuccess: (data) => {
      // Simulate progress for demo
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Create mock review
            const mockReview: SystematicReview = {
              id: data.reviewId,
              topic,
              type: reviewType as any,
              timeRange,
              sections: {
                abstract: `Background: ${topic} applications have shown significant promise in recent years, transforming various processes and outcomes. This systematic review examines the current state of ${topic} implementations.\n\nMethods: We conducted a comprehensive search of PubMed, IEEE Xplore, and ACM Digital Library for studies published in the specified timeframe. Studies were included if they reported on ${topic} applications with measurable outcomes.\n\nResults: A total of 127 studies met our inclusion criteria. The most common applications showed significant improvements compared to traditional methods.\n\nConclusions: ${topic} shows significant potential, particularly in accuracy and efficiency. However, challenges remain in implementation and scalability.`,
                introduction: `The integration of ${topic} represents one of the most significant technological advances in recent years. From early applications to sophisticated implementations, ${topic} has demonstrated unprecedented potential to improve outcomes.\n\nRecent advances have opened new possibilities for automated processes, decision support, and personalized approaches. However, successful implementation requires careful consideration of accuracy, interpretability, and compliance.\n\nThis systematic review aims to provide a comprehensive analysis of current ${topic} applications, examining their effectiveness, challenges, and future potential.`,
                methods: `We conducted a systematic review following PRISMA guidelines. Literature searches were performed in PubMed, IEEE Xplore, and ACM Digital Library using relevant keywords and MeSH terms.\n\nInclusion criteria included: (1) studies published in the specified timeframe, (2) peer-reviewed articles, (3) studies reporting quantitative outcomes, (4) English language publications.\n\nExclusion criteria included: (1) conference abstracts, (2) editorial commentaries, (3) studies without measurable outcomes.\n\nData extraction was performed independently by two reviewers using a standardized form.`,
                results: `Database searches yielded 2,847 potentially relevant articles. After removing duplicates and screening titles and abstracts, 342 articles underwent full-text review. Finally, 127 studies met inclusion criteria.\n\nThe studies were conducted across 15 countries, with the majority from North America (45%) and Europe (32%). Study designs included randomized controlled trials (43%), cohort studies (31%), and cross-sectional studies (26%).\n\nOverall, the included studies showed significant improvements in key metrics, with effect sizes ranging from moderate to large.`,
                conclusions: `This systematic review provides evidence that ${topic} applications are effective and show promise for widespread implementation. The technology demonstrates consistent benefits across various domains.\n\nHowever, several challenges remain, including standardization of approaches, validation in diverse populations, and long-term sustainability. Future research should focus on addressing these limitations.\n\nImplementation guidelines and best practices are needed to facilitate broader adoption and ensure consistent quality outcomes.`,
                references: [
                  'Smith, J. et al. (2023). Advances in modern technology applications. Journal of Technology, 45(3), 123-135.',
                  'Johnson, A. & Brown, B. (2023). Systematic approaches to implementation. Tech Review, 12(4), 67-78.',
                  'Davis, C. et al. (2022). Effectiveness of automated systems: A meta-analysis. Science Today, 89(2), 234-245.',
                ],
              },
              statistics: {
                studiesReviewed: 127,
                countries: 15,
                yearsCovered: 5,
                qualityScore: 89,
              },
              status: 'completed',
              generatedAt: new Date(),
            };
            setReview(mockReview);
            setGenerationProgress(0);
            toast({
              title: "Review generated!",
              description: "Your systematic review is ready.",
            });
            return 0;
          }
          return prev + 10;
        });
      }, 500);
    },
    onError: (error) => {
      setGenerationProgress(0);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please enter a research topic first.",
        variant: "destructive",
      });
      return;
    }
    setGenerationProgress(1);
    generateReviewMutation.mutate();
  };

  const handleDownload = (format: 'pdf' | 'md') => {
    toast({
      title: "Download started",
      description: `Downloading review as ${format.toUpperCase()}...`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Systematic Review Generator</h1>
          <p className="text-muted-foreground">
            Generate comprehensive systematic reviews from topics or uploaded papers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generation Section */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Generate Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Research Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Machine Learning in Healthcare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Review Type</label>
                <Select value={reviewType} onValueChange={setReviewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="systematic">Systematic Review</SelectItem>
                    <SelectItem value="meta-analysis">Meta-Analysis</SelectItem>
                    <SelectItem value="scoping">Scoping Review</SelectItem>
                    <SelectItem value="literature">Literature Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5-years">Last 5 years</SelectItem>
                    <SelectItem value="10-years">Last 10 years</SelectItem>
                    <SelectItem value="all-time">All time</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!topic || generateReviewMutation.isPending}
                className="w-full"
              >
                Generate Review
              </Button>

              {generationProgress > 0 && (
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Generating systematic review...
                    </div>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Content */}
          <div className="lg:col-span-2">
            <Card className="material-elevation-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Review</CardTitle>
                  {review && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload('pdf')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload('md')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Markdown
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!review ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-4">📄</div>
                    <p>Enter a research topic to generate a systematic review.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Tabs defaultValue="abstract" className="w-full">
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="abstract">Abstract</TabsTrigger>
                        <TabsTrigger value="introduction">Introduction</TabsTrigger>
                        <TabsTrigger value="methods">Methods</TabsTrigger>
                        <TabsTrigger value="results">Results</TabsTrigger>
                        <TabsTrigger value="conclusions">Conclusions</TabsTrigger>
                        <TabsTrigger value="references">References</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="abstract" className="mt-4">
                        <div className="prose max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Abstract</h3>
                          <div className="whitespace-pre-line text-sm text-muted-foreground">
                            {review.sections.abstract}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="introduction" className="mt-4">
                        <div className="prose max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Introduction</h3>
                          <div className="whitespace-pre-line text-sm text-muted-foreground">
                            {review.sections.introduction}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="methods" className="mt-4">
                        <div className="prose max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Methods</h3>
                          <div className="whitespace-pre-line text-sm text-muted-foreground">
                            {review.sections.methods}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="results" className="mt-4">
                        <div className="prose max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Results</h3>
                          <div className="whitespace-pre-line text-sm text-muted-foreground">
                            {review.sections.results}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="conclusions" className="mt-4">
                        <div className="prose max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Conclusions</h3>
                          <div className="whitespace-pre-line text-sm text-muted-foreground">
                            {review.sections.conclusions}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="references" className="mt-4">
                        <div className="prose max-w-none">
                          <h3 className="text-lg font-semibold mb-3">References</h3>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {review.sections.references.map((ref, index) => (
                              <li key={index}>{index + 1}. {ref}</li>
                            ))}
                          </ul>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {review.statistics.studiesReviewed}
                        </div>
                        <div className="text-xs text-muted-foreground">Studies Reviewed</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {review.statistics.countries}
                        </div>
                        <div className="text-xs text-muted-foreground">Countries</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {review.statistics.yearsCovered}
                        </div>
                        <div className="text-xs text-muted-foreground">Years Covered</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {review.statistics.qualityScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Quality Score</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
