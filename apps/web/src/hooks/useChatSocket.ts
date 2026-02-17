import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
}

interface UseChatSocketOptions {
  conversationId?: number;
  onNewMessage?: (message: ChatMessage) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onError?: (error: string) => void;
}

export const useChatSocket = ({
  conversationId,
  onNewMessage,
  onTypingStart,
  onTypingStop,
  onError,
}: UseChatSocketOptions) => {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.accessToken) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    // Connect to /chat namespace
    const socket = io(`${socketUrl}/chat`, {
      auth: {
        token: session.accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Chat socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Chat socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Chat socket connection error:', error.message);
      onError?.(error.message);
    });

    // Handle new messages
    socket.on('message:new', (message: ChatMessage) => {
      console.log('New message received:', message);
      onNewMessage?.(message);
    });

    // Handle message errors
    socket.on('message:error', ({ error }) => {
      console.error('Message error:', error);
      onError?.(error);
    });

    // Handle typing indicators
    socket.on('typing:user', (userId: string) => {
      onTypingStart?.(userId);
    });

    socket.on('typing:stop', (userId: string) => {
      onTypingStop?.(userId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.accessToken, onNewMessage, onTypingStart, onTypingStop, onError]);

  // Join conversation room when conversationId changes
  useEffect(() => {
    if (conversationId && socketRef.current?.connected) {
      console.log('Joining conversation:', conversationId);
      socketRef.current.emit('join:conversation', conversationId);

      return () => {
        if (socketRef.current?.connected) {
          console.log('Leaving conversation:', conversationId);
          socketRef.current.emit('leave:conversation', conversationId);
        }
      };
    }
    return undefined;
  }, [conversationId]);

  // Send message via socket
  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !conversationId || !session?.user?.id) {
        console.error('Cannot send message: socket not ready or missing data');
        return false;
      }

      socketRef.current.emit('message:send', {
        conversationId,
        senderId: parseInt(session.user.id),
        content: content.trim(),
      });

      return true;
    },
    [conversationId, session?.user?.id],
  );

  // Emit typing indicator
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || !conversationId) return;

      if (isTyping) {
        socketRef.current.emit('typing:start', conversationId);
      } else {
        socketRef.current.emit('typing:stop', conversationId);
      }
    },
    [conversationId],
  );

  return {
    sendMessage,
    emitTyping,
    isConnected: socketRef.current?.connected ?? false,
  };
};
