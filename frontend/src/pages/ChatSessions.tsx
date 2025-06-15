import React, { useState } from 'react';
import { SessionList } from '../components/chat/SessionList';
import type { ChatSession } from '../services/chatService';
import Page from '@atlaskit/page';
import { useNavigate } from 'react-router-dom';
import { CreateSessionModal } from '../components/chat/CreateSessionModal';

export const ChatSessions: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  // Add debug logging for modal state changes
  React.useEffect(() => {
    console.log('Modal state changed:', { isCreateModalOpen });
  }, [isCreateModalOpen]);

  const handleSelectSession = (session: ChatSession | null) => {
    if (session) {
      navigate(`/chat/${session.id}`);
    }
  };

  const handleNewChat = () => {
    console.log('New Chat button clicked');
    setIsCreateModalOpen(true);
  };

  return (
    <Page>
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center w-full" style={{ background: 'var(--color-background)' }}>
        <div className="flex flex-col w-full h-full px-8 py-12">
          <h2 className="text-2xl font-bold text-[#F8FAFC] mb-6 text-center">Chat Sessions</h2>
          <SessionList
            onSelectSession={handleSelectSession}
            selectedSessionId={undefined}
            onNewChat={handleNewChat}
          />
        </div>
      </div>
      <CreateSessionModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          console.log('Modal close button clicked');
          setIsCreateModalOpen(false);
        }} 
      />
    </Page>
  );
};

export default ChatSessions; 