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
  console.log('selectedSessionId', selectedSessionId);
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
                {session.session_type && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-[#3B82F6]/20 text-[#3B82F6] rounded border border-[#3B82F6]/30">
                    {session.session_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                )}
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
              className="mt-4 md:mt-0 ml-0 md:ml-4 text-[#EF5C48] hover:text-[#CA3521] transition-all duration-200 text-sm font-medium flex items-center gap-1 group"
              title="Delete session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 transform group-hover:scale-110 transition-transform duration-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
