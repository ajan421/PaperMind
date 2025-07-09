import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './button';
import { Textarea } from './textarea';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  quickQuestions?: string[];
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Ask a question...",
  className,
  quickQuestions = [],
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleQuickQuestion = (question: string) => {
    if (!isLoading) {
      onSendMessage(question);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <ScrollArea className="flex-1 p-4 border border-gray-200 rounded-lg mb-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="mx-auto h-12 w-12 mb-4" />
              <p>Start a conversation by asking a question!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'chat-bubble p-4 max-w-[80%]',
                    message.sender === 'user'
                      ? 'gradient-primary text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md border border-gray-100 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === 'assistant' && (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    {message.sender === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      {message.sender === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                          <ReactMarkdown 
                            components={{
                              a: ({ href, children }) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
                                >
                                  {children}
                                </a>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-bold text-gray-900 dark:text-gray-100">
                                  {children}
                                </strong>
                              ),
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-outside ml-4 space-y-1 mb-3">{children}</ol>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-outside ml-4 space-y-1 mb-3">{children}</ul>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold mb-2 mt-3 text-gray-900 dark:text-gray-100">{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-bold mb-2 mt-3 text-gray-900 dark:text-gray-100">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-bold mb-1 mt-2 text-gray-900 dark:text-gray-100">{children}</h3>
                              ),
                              code: ({ children }) => (
                                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto text-sm">{children}</pre>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      {message.language && (
                        <div className="text-xs opacity-75 mt-1">
                          {message.language}
                        </div>
                      )}
                      {message.sources && message.sources.length > 0 && (
                        <div className="text-xs opacity-75 mt-2">
                          Sources: {message.sources.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="chat-bubble bg-gradient-to-r from-purple-50 to-blue-50 p-4 shadow-md border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                  <span className="text-sm text-purple-700 font-medium">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {quickQuestions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Quick Questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickQuestion(question)}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100 hover:border-purple-300 transition-all duration-200"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="pr-12 resize-none"
          rows={3}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute bottom-2 right-2"
          disabled={!input.trim() || isLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
