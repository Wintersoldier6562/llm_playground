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

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="large" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-6">
        <Button
          appearance="primary"
          onClick={onNewChat}
          style={{ background: 'var(--color-primary)', color: 'var(--color-sidebar-active-text)' }}
        >
          New Chat
        </Button>
      </div>
      {sessions?.sessions.map((session: ChatSession) => (
        <div
          key={session.id}
          className="card p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => onSelectSession(session)}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="bg-[#23272F] rounded-lg p-4 border border-[#2C333A]">
                <h3 className="text-white font-medium">{session.title || 'Untitled Chat'}</h3>
                <p className="text-sm text-[#B6C2CF] mt-1">
                  {session.model} ({session.provider})
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6C2CF]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <time className="text-sm text-[#B6C2CF]" dateTime={session.created_at}>
                  {formatDate(session.created_at)}
                </time>
                {session.updated_at && (
                  <>
                    <span className="text-sm text-[#B6C2CF]">•</span>
                    <time className="text-sm text-[#B6C2CF]" dateTime={session.updated_at}>
                      Updated: {formatDate(session.updated_at)}
                    </time>
                  </>
                )}
              </div>
              {!session.is_active && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-[#39424D] text-[#B6C2CF] rounded">
                  Inactive
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this session?')) {
                  deleteSessionMutation.mutate(session.id);
                }
              }}
              className="mt-4 md:mt-0 ml-0 md:ml-4 text-[#EF5C48] hover:text-[#CA3521] transition-colors text-sm font-medium flex items-center gap-1"
              title="Delete session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
