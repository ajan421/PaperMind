import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/ui/file-upload';
import { AudioPlayer } from '@/components/ui/audio-player';
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { PodcastGeneration } from '@/types';

export default function PodcastGenerator() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [style, setStyle] = useState('conversational');
  const [duration, setDuration] = useState('10-15');
  const [generatedPodcasts, setGeneratedPodcasts] = useState<PodcastGeneration[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const generatePodcastMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error('No file uploaded');
      return api.generatePodcast(uploadedFile, style, duration);
    },
    onSuccess: (data) => {
      // Simulate progress for demo
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Add mock podcast to list
            const newPodcast: PodcastGeneration = {
              id: data.id,
              title: uploadedFile?.name.replace('.pdf', '') || 'Generated Podcast',
              filename: 'generated-podcast.mp3',
              duration: 765, // 12:45
              status: 'completed',
              audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Mock URL
              generatedAt: new Date(),
              style: style as any,
            };
            setGeneratedPodcasts(prev => [newPodcast, ...prev]);
            setGenerationProgress(0);
            toast({
              title: "Podcast generated!",
              description: "Your podcast is ready to listen.",
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

  const handleFilesChange = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleGenerate = () => {
    if (!uploadedFile) {
      toast({
        title: "No file uploaded",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }
    setGenerationProgress(1);
    generatePodcastMutation.mutate();
  };

  const handleDownload = (podcast: PodcastGeneration) => {
    // Mock download functionality
    toast({
      title: "Download started",
      description: `Downloading ${podcast.title}...`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 gradient-secondary rounded-2xl flex items-center justify-center shadow-lg">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Podcast Generator
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Transform research papers into engaging podcast conversations
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Section */}
          <Card className="material-elevation-4 bg-gradient-to-br from-white to-pink-50 border-0 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 gradient-secondary rounded-xl flex items-center justify-center">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                Generate Podcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                onFilesChange={handleFilesChange}
                accept=".pdf"
                maxSize={10}
                placeholder="Upload Research Paper"
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Podcast Style</label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational">Conversational Interview</SelectItem>
                      <SelectItem value="academic">Academic Discussion</SelectItem>
                      <SelectItem value="popular">Popular Science</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5-10">5-10 minutes</SelectItem>
                      <SelectItem value="10-15">10-15 minutes</SelectItem>
                      <SelectItem value="15-20">15-20 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!uploadedFile || generatePodcastMutation.isPending}
                className="w-full"
              >
                Generate Podcast
              </Button>

              {generationProgress > 0 && (
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Generating podcast... This may take a few minutes.
                    </div>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Section */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Generated Podcasts</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedPodcasts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-4">🎙️</div>
                  <p>No podcasts generated yet. Upload a PDF and generate your first podcast!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedPodcasts.map((podcast) => (
                    <AudioPlayer
                      key={podcast.id}
                      src={podcast.audioUrl!}
                      title={podcast.title}
                      subtitle={`Generated ${podcast.generatedAt.toLocaleDateString()} • ${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}`}
                      onDownload={() => handleDownload(podcast)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
