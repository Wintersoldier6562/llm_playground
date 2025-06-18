import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { 
  chatService, 
  type ChatMessage, 
  type ChatSession, 
  type ChatRequest,
  getAuthToken
} from '../../services/chatService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import { PageHeader } from '../../components/PageHeader';

interface ChatWindowProps {
  session: ChatSession;
}

const ChatMessageBubble = ({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser
            ? 'bg-[#579DFF] text-[#1B2638]'
            : 'bg-[#23272F] text-[#B6C2CF]'
        } ${isStreaming ? 'animate-pulse' : ''}`}
        style={{ wordBreak: 'break-word' }}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatWindowWithSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => chatService.getSession(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) return <div className="h-full flex items-center justify-center"><Spinner size="large" /></div>;
  if (error instanceof Error || !session) return <div className="h-full flex items-center justify-center"><div className="text-[#EF5C48]">Error loading session</div></div>;
  
  return <ChatWindow session={session} />;
};

const ChatWindow = ({ session }: ChatWindowProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const { data: sessionData, isLoading: sessionDataLoading, error: sessionDataError } = useQuery({
    queryKey: ['session', session.id],
    queryFn: () => chatService.getSession(session.id, true),
  });

  const messages = React.useMemo(() => {
    const baseMessages = sessionData?.messages || [];
    let allMessages = [...baseMessages];
    
    if (isStreaming && streamingMessage) {
      allMessages.push({ 
        role: 'assistant' as const, 
        content: streamingMessage,
        created_at: new Date().toISOString(),
      });
    }
    
    // Sort messages by created_at in ascending order (oldest first)
    return allMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [sessionData?.messages, isStreaming, streamingMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessage('');
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      role: 'user' as const,
      content: inputMessage.trim(),
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData(['session', session.id], (old: any) => ({
      ...old,
      messages: [...(old?.messages || []), userMessage],
    }));

    setInputMessage('');
    setIsStreaming(true);
    setStreamingMessage('');
    abortControllerRef.current = new AbortController();

    try {
      const request: ChatRequest = {
        message: userMessage.content,
        provider: session.provider,
        model: session.model,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
        system_message: "You are a helpful assistant."
      };

      const response = await fetch(`${chatService.API_BASE_URL}/chat/sessions/${session.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to start chat stream');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setStreamingMessage(prev => prev + parsed.content);
              }
            } catch (e) {
              if (data !== '[DONE]') {
                setStreamingMessage(prev => prev + data);
              }
            }
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['session', session.id] });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat stream aborted');
      } else {
        console.error('Error in chat stream:', error);
        queryClient.setQueryData(['session', session.id], (old: any) => ({
          ...old,
          messages: [
            ...(old?.messages || []),
            {
              role: 'assistant',
              content: 'Sorry, there was an error processing your message. Please try again.',
              created_at: new Date().toISOString(),
            }
          ],
        }));
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  if (sessionDataLoading) {
    return (
      <>
        <PageHeader title="Chat" />
        <div className="p-8">
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        </div>
      </>
    );
  }

  if (sessionDataError || !sessionData) {
    return (
      <>
        <PageHeader title="Chat" />
        <div className="p-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-[#EF5C48]">Error loading chat history</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Chat" />
      <div className="p-8">
        <div className="flex-1 flex flex-col transition-all duration-300 bg-[#22272B] rounded-md">
          <div className="p-4 border-b border-[#2C333A]">
            <h2 className="text-lg font-semibold text-white">{session.title || 'Untitled Chat'}</h2>
            <p className="text-sm text-[#B6C2CF]">
              {session.model} ({session.provider})
            </p>
            <div className="flex items-center gap-2 mt-2">
              {session.session_type && (
                <span className="inline-block px-2 py-0.5 text-xs bg-[#3B82F6]/20 text-[#3B82F6] rounded border border-[#3B82F6]/30">
                  {session.session_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              )}
              {!session.is_active && (
                <span className="inline-block px-2 py-0.5 text-xs bg-[#39424D] text-[#B6C2CF] rounded">
                  Inactive
                </span>
              )}
            </div>
            {session.context && (
              <div className="mt-2 p-2 bg-[#1E293B] rounded border border-[#334155]">
                <p className="text-xs text-[#94A3B8] mb-1">Context:</p>
                <p className="text-sm text-[#B6C2CF]">{session.context}</p>
              </div>
            )}
            {isStreaming && (
              <div className="text-xs text-[#579DFF] mt-2">
                AI is typing...
                <Button
                  appearance="danger"
                  spacing="compact"
                  onClick={handleStopStreaming}
                  className="ml-2"
                >
                  Stop
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <ChatMessageBubble
                key={index}
                message={message as ChatMessage}
                isStreaming={isStreaming && index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#2C333A] bg-[#22272B]">
            <div className="flex space-x-2">
              <Textfield
                name="chat-input"
                value={inputMessage}
                onChange={e => setInputMessage((e.target as HTMLInputElement).value)}
                placeholder="Type your message..."
                isDisabled={isStreaming || !session.is_active}
                elemAfterInput={null}
                className="input"
                style={{ background: 'var(--color-input-bg)', color: 'white', borderColor: 'var(--color-input-border)' }}
              />
              <Button
                type="submit"
                appearance="primary"
                isDisabled={isStreaming || !inputMessage.trim() || !session.is_active}
                style={{ background: 'var(--color-primary)', color: 'var(--color-sidebar-active-text)' }}
              >
                {isStreaming ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export { ChatWindow }; 