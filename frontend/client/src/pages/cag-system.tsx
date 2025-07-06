import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/ui/file-upload';
import { ChatInterface } from '@/components/ui/chat-interface';
import { Languages, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ChatMessage, CAGDocument, ConversationStats } from '@/types';

export default function CAGSystem() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [documents, setDocuments] = useState<CAGDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationStats, setConversationStats] = useState<ConversationStats>({
    totalMessages: 0,
    languagesUsed: ['English'],
    documentsReferenced: 0,
    sessionDuration: 0,
  });
  const { toast } = useToast();

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return api.uploadCAGDocuments(files);
    },
    onSuccess: (data) => {
      const newDocuments = data.documentIds.map((id, index) => ({
        id,
        filename: `document_${index + 1}.pdf`,
        status: 'processing' as const,
        uploadedAt: new Date(),
        pageCount: Math.floor(Math.random() * 50) + 10,
      }));
      
      setDocuments(prev => [...prev, ...newDocuments]);
      
      // Simulate processing completion
      setTimeout(() => {
        setDocuments(prev => prev.map(doc => 
          newDocuments.find(newDoc => newDoc.id === doc.id)
            ? { ...doc, status: 'completed' }
            : doc
        ));
      }, 3000);
      
      toast({
        title: "Documents uploaded",
        description: `${newDocuments.length} document(s) uploaded and being processed.`,
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

  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      return api.askCAGQuestion(question, selectedLanguage);
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        content: data.answer,
        sender: 'assistant',
        timestamp: new Date(),
        sources: data.sources,
        language: selectedLanguage,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation stats
      setConversationStats(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
        languagesUsed: [...new Set([...prev.languagesUsed, getLanguageName(selectedLanguage)])],
        documentsReferenced: Math.max(prev.documentsReferenced, documents.length),
      }));
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
    onSuccess: () => {
      setMessages([]);
      setConversationStats({
        totalMessages: 0,
        languagesUsed: ['English'],
        documentsReferenced: 0,
        sessionDuration: 0,
      });
      toast({
        title: "Session reset",
        description: "Conversation history has been cleared.",
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
      uploadDocumentsMutation.mutate(files);
    }
  };

  const handleSendMessage = (message: string) => {
    if (documents.length === 0) {
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
    
    // Update conversation stats
    setConversationStats(prev => ({
      ...prev,
      totalMessages: prev.totalMessages + 1,
    }));
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
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'ja': 'Japanese',
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
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
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
                    toast({
                      title: "Conversation Stats",
                      description: `${conversationStats.totalMessages} messages, ${conversationStats.languagesUsed.length} languages used`,
                    });
                  }}
                >
                  View Conversation Stats
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
                      toast({
                        title: "Detailed Stats",
                        description: `Session active for ${Math.floor(conversationStats.sessionDuration / 60)} minutes`,
                      });
                    }}
                  >
                    View Details
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-primary">
                      {conversationStats.totalMessages}
                    </div>
                    <div className="text-xs text-muted-foreground">Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary">
                      {conversationStats.languagesUsed.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Languages</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary">
                      {conversationStats.documentsReferenced}
                    </div>
                    <div className="text-xs text-muted-foreground">Documents</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
