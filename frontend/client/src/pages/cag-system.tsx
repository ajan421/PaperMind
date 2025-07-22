import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/ui/file-upload';
import { ChatInterface } from '@/components/ui/chat-interface';
import { Languages, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ChatMessage, CAGDocument, ConversationStats, DocumentStatus } from '@/types';

export default function CAGSystem() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [documents, setDocuments] = useState<CAGDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  // Query for document status
  const { data: documentStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['cag-document-status'],
    queryFn: api.getDocumentStatus,
    refetchInterval: documents.some(doc => doc.status === 'processing') ? 2000 : false,
  });

  // Query for conversation stats
  const { data: conversationStats, refetch: refetchStats } = useQuery({
    queryKey: ['cag-conversation-stats'],
    queryFn: api.getConversationStats,
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Update documents when status changes
  useEffect(() => {
    if (documentStatus && documentStatus.processed_files.length > 0) {
      const updatedDocs = documentStatus.processed_files.map((filename, index) => ({
        id: `doc-${index}`,
        filename,
        status: 'completed' as const,
        uploadedAt: new Date(),
        pageCount: Math.floor(Math.random() * 50) + 10, // We don't get this from backend
      }));
      setDocuments(updatedDocs);
    }
  }, [documentStatus]);

  // Update messages from conversation history
  useEffect(() => {
    if (conversationStats && conversationStats.conversation_history.length > 0) {
      const historyMessages = conversationStats.conversation_history.map((msg, index) => ({
        id: `msg-${index}`,
        content: msg.content,
        sender: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        timestamp: new Date(msg.timestamp),
        language: selectedLanguage,
      }));
      setMessages(historyMessages);
    }
  }, [conversationStats, selectedLanguage]);

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return api.uploadCAGDocuments(files);
    },
    onSuccess: (data) => {
      // Create document entries from the filenames
      const newDocuments = data.processed_files.map((filename, index) => ({
        id: `doc-${Date.now()}-${index}`,
        filename,
        status: 'completed' as const,
        uploadedAt: new Date(),
        pageCount: Math.floor(Math.random() * 50) + 10,
      }));
      
      setDocuments(prev => [...prev, ...newDocuments]);
      
      toast({
        title: "Documents uploaded",
        description: `${data.processed_files.length} document(s) uploaded and processed. Total chunks: ${data.total_chunks}`,
      });
      
      // Refetch status to get updated info
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      return api.askCAGQuestion(question, selectedLanguage);
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        content: data.response,
        sender: 'assistant',
        timestamp: new Date(),
        language: selectedLanguage,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Refetch conversation stats to get updated history
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetSessionMutation = useMutation({
    mutationFn: async () => {
      return api.resetSession();
    },
    onSuccess: (data) => {
      setMessages([]);
      setDocuments([]);
      toast({
        title: "Session reset",
        description: data.message,
      });
      // Refetch both queries
      refetchStatus();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearConversationMutation = useMutation({
    mutationFn: async () => {
      return api.clearConversation();
    },
    onSuccess: (data) => {
      setMessages([]);
      toast({
        title: "Conversation cleared",
        description: data.message,
      });
      refetchStats();
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
      uploadDocumentsMutation.mutate(files);
    }
  };

  const handleSendMessage = (message: string) => {
    if (documents.length === 0 && (!documentStatus || documentStatus.processed_files.length === 0)) {
      toast({
        title: "No documents uploaded",
        description: "Please upload documents first.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      language: selectedLanguage,
    };
    
    setMessages(prev => [...prev, userMessage]);
    askQuestionMutation.mutate(message);
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Document removed",
      description: "Document has been removed from the session.",
    });
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      'en': 'English'
    };
    return languages[code] || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">CAG System</h1>
          <p className="text-muted-foreground">
            Multi-language Q&A on uploaded documents with conversation history
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Management */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFilesChange={handleFilesChange}
                accept=".pdf"
                multiple
                maxSize={10}
                placeholder="Upload multiple PDFs"
              />

              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {documents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Uploaded Documents</h3>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm truncate">{doc.filename}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const messageCount = conversationStats?.message_count || 0;
                    const historyLength = conversationStats?.conversation_history.length || 0;
                    toast({
                      title: "Conversation Stats",
                      description: `${messageCount} messages in session, ${historyLength} in recent history`,
                    });
                  }}
                >
                  View Conversation Stats
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => clearConversationMutation.mutate()}
                  disabled={clearConversationMutation.isPending}
                >
                  Clear Conversation
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => resetSessionMutation.mutate()}
                  disabled={resetSessionMutation.isPending}
                >
                  Reset Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="material-elevation-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Conversation</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Languages className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Auto-translate enabled</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={askQuestionMutation.isPending}
                  placeholder="Ask a question about your documents (any language)..."
                />
              </CardContent>
            </Card>

            {/* Conversation History */}
            <Card className="material-elevation-2 mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Conversation Stats</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const totalDocs = documentStatus?.processed_files.length || 0;
                      const totalChunks = documentStatus?.total_chunks || 0;
                      toast({
                        title: "Detailed Stats",
                        description: `${totalDocs} documents processed, ${totalChunks} text chunks`,
                      });
                    }}
                  >
                    View Details
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-primary">
                      {conversationStats?.message_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary">
                      {documentStatus?.processed_files.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Documents</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary">
                      {documentStatus?.total_chunks || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Text Chunks</div>
                  </div>
                </div>
                
                {documentStatus?.status && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Processing Status</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{documentStatus.status}</p>
                    {documentStatus.processing_time_seconds > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Processed in {documentStatus.processing_time_seconds}s
                      </p>
                    )}
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
