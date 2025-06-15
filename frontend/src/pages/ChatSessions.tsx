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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Chat Sessions</h1>
      </div>
      <div className="flex flex-col w-full">
        <SessionList
          onSelectSession={handleSelectSession}
          selectedSessionId={undefined}
          onNewChat={handleNewChat}
        />
      </div>
      <CreateSessionModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          console.log('Modal close button clicked');
          setIsCreateModalOpen(false);
        }} 
      />
    </div>
  );
};

export default ChatSessions; 