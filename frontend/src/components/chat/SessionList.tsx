import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type ChatSession, type SessionsResponse } from '../../services/chatService';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never updated';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

interface SessionListProps {
  onSelectSession: (session: ChatSession | null) => void;
  selectedSessionId?: string;
  onNewChat?: () => void;
}

export const SessionList = ({ onSelectSession, selectedSessionId, onNewChat }: SessionListProps) => {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery<SessionsResponse>({
    queryKey: ['sessions'],
    queryFn: () => chatService.listSessions(),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => chatService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.setQueryData(['session', 'current'], null);
      onSelectSession(null);
    },
  });

  if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner size="large" /></div>;

  return (
    <div className="flex flex-col h-full w-full">
      <h2 className="text-lg font-semibold px-4 pt-4 pb-2 text-white">Chat Sessions</h2>
      <div className="px-4 pb-4">
        <Button
          appearance="primary"
          shouldFitContainer
          onClick={onNewChat}
          style={{ background: 'var(--color-primary)', color: 'var(--color-sidebar-active-text)' }}
        >
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions?.sessions.map((session: ChatSession) => (
          <div
            key={session.id}
            className={`p-4 border-b border-[#2C333A] cursor-pointer transition-colors ${
              session.id === selectedSessionId
                ? 'bg-[#22272B] border-l-4 border-l-[#579DFF] text-white'
                : 'hover:bg-[#23272F] text-[#B6C2CF]'
            }`}
            onClick={() => onSelectSession(session)}
            style={{ borderLeftWidth: session.id === selectedSessionId ? 4 : 0 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">{session.title || 'Untitled Chat'}</h3>
                <p className="text-sm text-[#B6C2CF]">
                  {session.model} ({session.provider})
                </p>
                <p className="text-xs text-[#B6C2CF]">
                  Created: {formatDate(session.created_at)}
                  {session.updated_at && ` • Updated: ${formatDate(session.updated_at)}`}
                </p>
                {!session.is_active && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-[#39424D] text-[#B6C2CF] rounded">
                    Inactive
                  </span>
                )}
              </div>
              <Button
                appearance="danger"
                spacing="compact"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this session?')) {
                    deleteSessionMutation.mutate(session.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
