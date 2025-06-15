import config from '../config';

// Change API_BASE_URL to use config.apiUrl
const API_BASE_URL = config.apiUrl;

// Export the getAuthToken function
export const getAuthToken = () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  provider: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  messages?: ChatMessage[];  // Optional because it's only included when requested
}

export interface CreateSessionRequest {
  model: string;
  provider: string;
  title?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionResponse extends Omit<ChatSession, 'messages'> {
  messages: ChatMessage[];
}

export interface ChatRequest {
  message: string;
  provider: string;
  model: string;
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  system_message?: string;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
}

// Update the response interface to match the API
export interface SessionsResponse {
  sessions: ChatSession[];
  total: number;
}

export const chatService = {
  // Make API_BASE_URL available
  API_BASE_URL,

  // Create a new chat session
  async createSession(data: CreateSessionRequest): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  },

  // List all chat sessions - updated to match API response
  async listSessions(page = 1, pageSize = 10): Promise<SessionsResponse> {
    const response = await fetch(
      `${API_BASE_URL}/chat/sessions?page=${page}&page_size=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  // Get a specific session with messages
  async getSession(sessionId: string, includeMessages = true): Promise<SessionResponse> {
    const response = await fetch(
      `${API_BASE_URL}/chat/sessions/${sessionId}?include_messages=${includeMessages}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Session fetch error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error('Failed to fetch session');
    }
    const data = await response.json();
    // Log the complete response
    console.log('Complete API response:', JSON.stringify(data, null, 2));
    return data;
  },

  // Update session metadata
  async updateSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update session');
    return response.json();
  },

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete session');
  },

  // Remove the WebSocket method and add streaming chat
  async streamChat(sessionId: string, request: ChatRequest): Promise<ReadableStream<ChatResponse>> {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to start chat stream');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body as unknown as ReadableStream<ChatResponse>;
  },
}; 