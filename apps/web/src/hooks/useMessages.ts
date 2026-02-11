import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket';
import type { Message, MessageThread, ApiResponse } from '@/types';

// Fetch message threads
export const useMessageThreads = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['message-threads'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MessageThread[]>>('/messages/threads');
      return data.data || [];
    },
    enabled: !!session,
  });
};

// Fetch messages with a specific user
export const useMessages = (otherUserId: number) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['messages', otherUserId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Message[]>>(`/messages/${otherUserId}`);
      return data.data || [];
    },
    enabled: !!session && !!otherUserId,
  });
};

// Send a message
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipientId, content }: { recipientId: number; content: string }) => {
      const { data } = await api.post<ApiResponse<Message>>('/messages', {
        recipientId,
        content,
      });
      return data.data;
    },
    onSuccess: (message) => {
      if (message) {
        queryClient.invalidateQueries({ queryKey: ['messages', message.recipientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
};

// Mark messages as read
export const useMarkMessagesRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.put<ApiResponse<void>>(`/messages/${userId}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
};

// Real-time messaging hook with Socket.IO
export const useRealtimeMessages = (otherUserId: number) => {
  const { data: session } = useSession();
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = initSocket(session.accessToken);

    // Listen for incoming messages
    socket.on('receiveMessage', (message: Message) => {
      if (message.senderId === otherUserId) {
        setNewMessage(message);
        queryClient.invalidateQueries({ queryKey: ['messages', otherUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    });

    // Listen for typing indicators
    socket.on('userTyping', (_data: { userId: number; isTyping: boolean }) => {
      // Handle typing indicator - can be implemented later
    });

    return () => {
      disconnectSocket();
    };
  }, [session, otherUserId, queryClient]);

  const sendRealtimeMessage = (content: string) => {
    const socket = getSocket();
    if (socket && session?.user?.id) {
      socket.emit('sendMessage', {
        senderId: parseInt(session.user.id),
        recipientId: otherUserId,
        content,
      });
    }
  };

  const emitTyping = (isTyping: boolean) => {
    const socket = getSocket();
    if (socket && session?.user?.id) {
      socket.emit('typing', {
        userId: parseInt(session.user.id),
        recipientId: otherUserId,
        isTyping,
      });
    }
  };

  return {
    newMessage,
    sendRealtimeMessage,
    emitTyping,
  };
};
