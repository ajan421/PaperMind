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

  

  const generatePodcastMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error('No file uploaded');
      
      try {
        // Try the main method first
        return await api.generatePodcast(uploadedFile);
      } catch (error) {
        console.warn('Main generation method failed, trying fallback:', error);
        // If main method fails due to response parsing, try fallback
        return await api.generatePodcastWithFallback(uploadedFile);
      }
    },
    onSuccess: (data) => {
      console.log('Podcast generation response:', data);
      
      // Validate response data
      if (!data.audio_file || data.status !== 'success') {
        console.error('Invalid backend response:', data);
        throw new Error('Invalid response from server');
      }
      
      // Create podcast entry with backend data
      const podcastTitle = uploadedFile?.name
        .replace('.pdf', '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) || 'Generated Podcast';
      
      // Create streaming URL using just the filename
      const streamingUrl = api.streamPodcast(data.audio_file);
      console.log(`Created streaming URL: ${streamingUrl} for file: ${data.audio_file}`);
      
      const newPodcast: PodcastGeneration = {
        id: Date.now().toString(),
        title: podcastTitle,
        filename: data.audio_file,
        duration: 0, // Will be loaded when audio metadata loads
        status: 'completed',
        audioUrl: streamingUrl,
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
        title: "🎉 Podcast generated successfully!",
        description: `Your podcast "${newPodcast.title}" is ready to play.`,
      });
    },
    onError: (error) => {
      console.error('Podcast generation error:', error);
      
      // Check if the file was actually generated despite the error
      const isJsonError = error.message.includes('Unexpected token') || error.message.includes('not valid JSON');
      
      if (isJsonError) {
        // JSON parsing error but file might be generated
        toast({
          title: "⚠️ Generation completed with issues",
          description: "Podcast was generated but there was a response format issue. Check the player below.",
          variant: "default",
        });
        
        // Add a podcast entry anyway since the file is likely generated
        const podcastTitle = uploadedFile?.name
          .replace('.pdf', '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()) || 'Generated Podcast';
        
        const newPodcast: PodcastGeneration = {
          id: Date.now().toString(),
          title: `${podcastTitle} (Check Status)`,
          filename: 'podcast.mp3',
          duration: 0,
          status: 'completed',
          audioUrl: api.streamPodcast('podcast.mp3'),
          generatedAt: new Date(),
          style: 'conversational',
        };
        
        setGeneratedPodcasts(prev => [newPodcast, ...prev]);
      } else {
        toast({
          title: "❌ Generation failed",
          description: error.message || "Failed to generate podcast. Please try again.",
          variant: "destructive",
        });
      }
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
        title: "📄 No file uploaded",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (10MB limit typical for API)
    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "📏 File too large",
        description: "Please upload a PDF file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Starting podcast generation for:', uploadedFile.name, `(${(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    toast({
      title: "🎧 Generating podcast...",
      description: "This may take a few minutes. Please wait while we process your PDF.",
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

              {uploadedFile && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-sm">File Ready:</span>
                  </div>
                  <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                    📄 {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!uploadedFile || generatePodcastMutation.isPending}
                className="w-full"
              >
                {generatePodcastMutation.isPending ? 'Generating...' : 'Generate Podcast'}
              </Button>

              {generatePodcastMutation.isPending && (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      🎧 Generating podcast from "{uploadedFile?.name}"...
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      This may take 2-5 minutes depending on document length
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Processing Steps:</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-blue-600 dark:text-blue-400 text-xs">
                      <li>• Extracting text from PDF</li>
                      <li>• Generating conversational script</li>
                      <li>• Converting to speech with AI voices</li>
                      <li>• Creating final audio file</li>
                    </ul>
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
