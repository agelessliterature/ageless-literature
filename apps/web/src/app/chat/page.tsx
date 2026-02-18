'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import InlineError from '@/components/ui/InlineError';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/api';
import { useChatSocket } from '@/hooks/useChatSocket';

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get('vendorId');
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle new messages from socket
  const handleNewMessage = useCallback(
    (_message: any) => {
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['customer-messages', conversationId] });
    },
    [conversationId, queryClient],
  );

  // Initialize chat socket
  const {
    sendMessage: sendSocketMessage,
    emitTyping,
    isConnected,
  } = useChatSocket({
    conversationId: conversationId ? parseInt(conversationId) : undefined,
    onNewMessage: handleNewMessage,
    onError: (error) => {
      console.error('Socket error:', error);
    },
  });

  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['customer-conversation', vendorId],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/customer/chat/conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ vendorId }),
      });
      if (!res.ok) throw new Error('Failed to get conversation');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session && !!vendorId,
  });

  useEffect(() => {
    if (conversationData?.conversation?.id) {
      setConversationId(conversationData.conversation.id);
    }
  }, [conversationData]);

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['customer-messages', conversationId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`api/customer/chat/messages/${conversationId}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session && !!conversationId,
    refetchInterval: isConnected ? 10000 : 5000, // Slower polling when socket connected
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(getApiUrl('api/customer/chat/messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          conversationId,
          message: text,
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['customer-messages', conversationId] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  if (status === 'loading' || conversationLoading) {
    return <PageLoading message="Loading chat..." fullPage={false} />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  if (!vendorId) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InlineError message="Invalid chat request. Vendor ID required." />
      </div>
    );
  }

  const messages = messagesData?.messages || [];
  const vendor = conversationData?.conversation?.vendor;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !conversationId) return;

    // Try to send via socket first
    if (isConnected && sendSocketMessage) {
      const sent = sendSocketMessage(messageText);
      if (sent) {
        setMessageText('');
        // Still use mutation for optimistic update and fallback
        sendMessageMutation.mutate(messageText);
        return;
      }
    }

    // Fallback to REST API
    sendMessageMutation.mutate(messageText);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Emit typing start
    emitTyping(true);

    // Set timeout to emit typing stop
    const timeout = setTimeout(() => {
      emitTyping(false);
    }, 1000);

    setTypingTimeout(timeout);
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Chat with {vendor?.businessName || 'Vendor'}</h1>
        <p className="text-gray-600">Start a conversation with this bookseller</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {/* Messages Area */}
        <div className="h-[500px] overflow-y-auto p-4 border-b">
          {messagesLoading ? (
            <PageLoading message="Loading messages..." fullPage={false} />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={['fal', 'comments']}
              title="No messages yet"
              description="Send a message to start the conversation!"
            />
          ) : (
            <div className="space-y-4">
              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.isCustomer ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isCustomer ? 'text-white/70' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={!conversationId || sendMessageMutation.isPending}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || !conversationId || sendMessageMutation.isPending}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sendMessageMutation.isPending ? (
                <FontAwesomeIcon icon={['fal', 'spinner']} spin />
              ) : (
                <FontAwesomeIcon icon={['fal', 'paper-plane']} />
              )}
            </button>
          </div>
          {isConnected && (
            <p className="text-xs text-green-600 mt-2">
              <FontAwesomeIcon icon={['fas', 'circle']} className="mr-1" />
              Real-time messaging active
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function CustomerChatPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading chat..." fullPage={false} />}>
      <ChatContent />
    </Suspense>
  );
}
