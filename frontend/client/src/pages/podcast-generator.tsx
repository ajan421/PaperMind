import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { AudioPlayer } from '@/components/ui/audio-player';
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { PodcastGeneration } from '@/types';

export default function PodcastGenerator() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedPodcasts, setGeneratedPodcasts] = useState<PodcastGeneration[]>([]);
  const { toast } = useToast();

  // Load the podcast.mp3 file from output directory
  useEffect(() => {
    // Add the existing podcast.mp3 file to the list
    const existingPodcast: PodcastGeneration = {
      id: 'existing-podcast',
      title: 'Generated Podcast',
      filename: 'podcast.mp3',
      duration: 0,
      status: 'completed',
      audioUrl: api.streamPodcast('podcast.mp3'),
      generatedAt: new Date(),
      style: 'conversational',
    };
    
    console.log('Loading existing podcast.mp3:', existingPodcast);
    setGeneratedPodcasts([existingPodcast]);
  }, []);

  const generatePodcastMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error('No file uploaded');
      return api.generatePodcast(uploadedFile);
    },
    onSuccess: (data) => {
      console.log('Podcast generation response:', data);
      
      // Create podcast entry with actual backend data
      const podcastTitle = uploadedFile?.name.replace('.pdf', '').replace(/[-_]/g, ' ') || 'Generated Podcast';
      
      // Ensure we have the filename from backend response
      if (!data.audio_file) {
        console.error('Backend response missing audio_file:', data);
        throw new Error('No audio file returned from backend');
      }
      
      const streamingUrl = api.streamPodcast(data.audio_file);
      console.log(`Created streaming URL: ${streamingUrl} for file: ${data.audio_file}`);
      
      const newPodcast: PodcastGeneration = {
        id: Date.now().toString(),
        title: podcastTitle,
        filename: data.audio_file,
        duration: 0, // Will be loaded when audio metadata loads
        status: 'completed',
        audioUrl: streamingUrl, // Stream endpoint: /podcast/stream/{filename}
        generatedAt: new Date(),
        style: 'conversational',
      };
      
      console.log('Adding new podcast to list:', newPodcast);
      setGeneratedPodcasts(prev => {
        const updated = [newPodcast, ...prev];
        console.log('Updated podcasts list:', updated);
        return updated;
      });
      
      toast({
        title: "Podcast generated!",
        description: `Your podcast "${newPodcast.title}" is ready to play.`,
      });
    },
    onError: (error) => {
      console.error('Podcast generation error:', error);
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
      console.log('File uploaded:', files[0].name);
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
    
    console.log('Starting podcast generation for:', uploadedFile.name);
    toast({
      title: "Generating podcast...",
      description: "This may take a few minutes. Please wait.",
    });
    
    generatePodcastMutation.mutate();
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
                Transform research papers into engaging conversational podcasts and play them instantly
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

              <Button
                onClick={handleGenerate}
                disabled={!uploadedFile || generatePodcastMutation.isPending}
                className="w-full"
              >
                {generatePodcastMutation.isPending ? 'Generating...' : 'Generate Podcast'}
              </Button>

              {generatePodcastMutation.isPending && (
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Generating podcast... This may take a few minutes.
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Section */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Play Podcast</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedPodcasts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-4 text-4xl">🎧</div>
                  <p>No podcasts available to play. Generate your first podcast from a PDF!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedPodcasts.map((podcast) => (
                    <AudioPlayer
                      key={podcast.id}
                      src={podcast.audioUrl!}
                      title={podcast.title}
                      subtitle={`Ready to play • Generated ${podcast.generatedAt.toLocaleDateString()}`}
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
