import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/ui/file-upload';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ResearchGap } from '@/types';

export default function GapAnalyzer() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    gaps: ResearchGap[];
    recommendations: string[];
    confidence: number;
    mainPaper?: any;
    relatedPapers?: any[];
    researchLandscape?: string;
  } | null>(null);
  const { toast } = useToast();

  // Transform backend response to frontend format
  const transformBackendResponse = (backendData: any) => {
    const analysis = backendData.analysis;
    
    if (!analysis) {
      throw new Error('No analysis data received');
    }

    // Transform research gaps from backend format to frontend format
    const gaps: ResearchGap[] = (analysis.research_gaps || []).map((gap: any, index: number) => ({
      id: (index + 1).toString(),
      title: gap.description?.substring(0, 50) + '...' || `Research Gap ${index + 1}`,
      description: gap.description || 'No description available',
      confidence: Math.round((gap.confidence_score || 0) * 100),
      priority: gap.confidence_score > 0.7 ? 'high' : gap.confidence_score > 0.4 ? 'medium' : 'low',
      recommendations: gap.suggested_directions || []
    }));

    // Extract recommendations from all gaps
    const allRecommendations = gaps.flatMap(gap => gap.recommendations);
    const uniqueRecommendations = Array.from(new Set(allRecommendations));

    // Calculate average confidence
    const avgConfidence = gaps.length > 0 
      ? Math.round(gaps.reduce((sum, gap) => sum + gap.confidence, 0) / gaps.length)
      : 0;

    return {
      gaps,
      recommendations: uniqueRecommendations,
      confidence: avgConfidence,
      mainPaper: analysis.main_paper,
      relatedPapers: analysis.related_papers,
      researchLandscape: analysis.research_landscape
    };
  };

  const analyzeGapsMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error('No file uploaded');
      return api.analyzeGaps(uploadedFile);
    },
    onSuccess: (data) => {
      try {
        const transformedResult = transformBackendResponse(data);
        setAnalysisResult(transformedResult);
        toast({
          title: "Analysis completed!",
          description: `Found ${transformedResult.gaps.length} research gaps with ${transformedResult.confidence}% average confidence.`,
        });
      } catch (error) {
        console.error('Error transforming response:', error);
        toast({
          title: "Error",
          description: "Failed to process analysis results.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFilesChange = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleAnalyze = () => {
    if (!uploadedFile) {
      toast({
        title: "No file uploaded",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }
    analyzeGapsMutation.mutate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Research Gap Analyzer</h1>
          <p className="text-muted-foreground">
            Identify research gaps and opportunities in your field
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Upload Paper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFilesChange={handleFilesChange}
                accept=".pdf"
                maxSize={10}
                placeholder="Upload research paper"
              />

              <Button
                onClick={handleAnalyze}
                disabled={!uploadedFile || analyzeGapsMutation.isPending}
                className="w-full"
              >
                Analyze Gaps
              </Button>

              {analyzeGapsMutation.isPending && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Analyzing research gaps...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take 30-60 seconds</p>
                </div>
              )}

              {analyzeGapsMutation.isError && (
                <div className="text-center text-red-600 text-xs">
                  <p>Analysis failed. Please try again.</p>
                  <p className="text-gray-500 mt-1">
                    {analyzeGapsMutation.error?.message || 'Unknown error occurred'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="lg:col-span-2">
            <Card className="material-elevation-2">
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisResult ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-4">📊</div>
                    <p>Upload a research paper to identify gaps and opportunities.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Main Paper Info */}
                    {analysisResult.mainPaper && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Analyzed Paper</h3>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">
                            {analysisResult.mainPaper.title || 'Untitled Paper'}
                          </h4>
                          {analysisResult.mainPaper.keywords && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(typeof analysisResult.mainPaper.keywords === 'string' 
                                ? analysisResult.mainPaper.keywords.split(',') 
                                : analysisResult.mainPaper.keywords).slice(0, 5).map((keyword: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {analysisResult.mainPaper.findings && (
                            <p className="text-sm text-blue-800">
                              <strong>Key Findings:</strong> {analysisResult.mainPaper.findings.substring(0, 200)}...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Research Landscape */}
                    {analysisResult.researchLandscape && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Research Landscape</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {analysisResult.researchLandscape}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Identified Gaps */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Identified Research Gaps</h3>
                      {analysisResult.gaps.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>No specific research gaps were identified in this paper.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {analysisResult.gaps.map((gap) => (
                            <div key={gap.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium">{gap.title}</h4>
                                <Badge className={getPriorityColor(gap.priority)}>
                                  {gap.priority === 'high' ? 'High Confidence' : 
                                   gap.priority === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {gap.description}
                              </p>
                              {gap.recommendations.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-medium text-gray-700 mb-1">Suggestions:</h5>
                                  <ul className="text-xs text-gray-600 list-disc list-inside">
                                    {gap.recommendations.slice(0, 2).map((rec, idx) => (
                                      <li key={idx}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="flex items-center text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                <span>Confidence: {gap.confidence}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recommendations */}
                    {analysisResult.recommendations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Research Recommendations</h3>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <ul className="space-y-2 text-sm">
                            {analysisResult.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start">
                                <ArrowRight className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Related Papers */}
                    {analysisResult.relatedPapers && analysisResult.relatedPapers.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Related Literature</h3>
                        <div className="space-y-3">
                          {analysisResult.relatedPapers.slice(0, 3).map((paper: any, index: number) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-3">
                              <h4 className="font-medium text-sm mb-1">
                                {paper.title || 'Untitled Paper'}
                              </h4>
                              {paper.authors && (
                                <p className="text-xs text-gray-600 mb-2">{paper.authors}</p>
                              )}
                              {paper.snippet && (
                                <p className="text-xs text-gray-700">
                                  {paper.snippet.substring(0, 150)}...
                                </p>
                              )}
                              <Badge variant="outline" className="mt-2 text-xs">
                                {paper.source || 'Unknown Source'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {analysisResult.gaps.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Gaps Identified</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {analysisResult.confidence || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Avg. Confidence</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {analysisResult.relatedPapers?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Related Papers</div>
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
