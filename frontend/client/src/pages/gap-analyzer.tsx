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
  } | null>(null);
  const { toast } = useToast();

  const analyzeGapsMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error('No file uploaded');
      return api.analyzeGaps(uploadedFile);
    },
    onSuccess: (data) => {
      // Mock data for demonstration
      const mockResult = {
        gaps: [
          {
            id: '1',
            title: 'Limited Dataset Diversity',
            description: 'The study primarily uses datasets from Western populations, lacking diversity in geographic and demographic representation.',
            confidence: 87,
            priority: 'high' as const,
            recommendations: ['Expand dataset collection to include diverse geographic regions'],
          },
          {
            id: '2',
            title: 'Longitudinal Analysis Missing',
            description: 'The research lacks long-term follow-up studies to validate the sustainability of the proposed methods.',
            confidence: 73,
            priority: 'medium' as const,
            recommendations: ['Design longitudinal studies to validate long-term effectiveness'],
          },
          {
            id: '3',
            title: 'Scalability Concerns',
            description: 'The proposed solution\'s scalability to larger datasets or real-world applications remains unclear.',
            confidence: 45,
            priority: 'low' as const,
            recommendations: ['Conduct scalability analysis with larger datasets'],
          },
        ],
        recommendations: [
          'Expand dataset collection to include diverse geographic regions',
          'Design longitudinal studies to validate long-term effectiveness',
          'Conduct scalability analysis with larger datasets',
          'Explore cross-cultural validation of research findings',
        ],
        confidence: 68,
      };
      setAnalysisResult(mockResult);
      toast({
        title: "Analysis completed!",
        description: `Found ${mockResult.gaps.length} research gaps with ${mockResult.confidence}% average confidence.`,
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
                    {/* Identified Gaps */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Identified Research Gaps</h3>
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
                            <div className="flex items-center text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              <span>Confidence: {gap.confidence}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
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
                          {analysisResult.confidence}%
                        </div>
                        <div className="text-xs text-muted-foreground">Avg. Confidence</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {analysisResult.recommendations.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Recommendations</div>
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
