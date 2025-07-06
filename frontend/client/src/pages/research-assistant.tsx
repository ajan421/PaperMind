import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatInterface } from '@/components/ui/chat-interface';
import { Bot, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ChatMessage } from '@/types';

export default function ResearchAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      return api.askQuestion(question);
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        content: data.result,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    askQuestionMutation.mutate(message);
  };


  const quickQuestions = [
    "What are the latest trends in AI research?",
    "Explain transformer architectures",
    "What is reinforcement learning?",
    "How does machine learning work?",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Research Assistant
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Get AI-powered answers to your research questions instantly
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Chat Interface */}
          <Card className="material-elevation-4 bg-gradient-to-br from-white to-blue-50 border-0 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                AI Research Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[600px]">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={askQuestionMutation.isPending}
                placeholder="Ask any research question - no file upload needed!"
                quickQuestions={quickQuestions}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
