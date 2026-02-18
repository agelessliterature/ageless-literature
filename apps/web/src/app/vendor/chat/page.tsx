'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/api';
import { useChatSocket } from '@/hooks/useChatSocket';
import PageLoading from '@/components/ui/PageLoading';

export default function VendorChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle new messages from socket
  const handleNewMessage = useCallback(
    (_message: any) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-conversations'] });
    },
    [selectedConversation?.id, queryClient],
  );

  // Initialize chat socket
  const {
    sendMessage: sendSocketMessage,
    emitTyping,
    isConnected,
  } = useChatSocket({
    conversationId: selectedConversation?.id,
    onNewMessage: handleNewMessage,
    onError: (error) => {
      console.error('Socket error:', error);
    },
  });

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['vendor-conversations'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/chat/conversations'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
    refetchInterval: 15000, // Slower polling for conversations
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['vendor-messages', selectedConversation?.id],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`api/vendor/chat/messages/${selectedConversation.id}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session && !!selectedConversation,
    refetchInterval: isConnected ? 10000 : 5000, // Slower polling when socket connected
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(getApiUrl('api/vendor/chat/messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: text,
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['vendor-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-conversations'] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  if (status === 'loading') {
    return <PageLoading message="Loading chat..." fullPage={false} />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const conversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

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
      <div className="mb-6 sm:mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Live Chat</h1>
        <p className="text-gray-600 mt-2">Communicate with your customers</p>
      </div>

      <div
        className="bg-white border border-gray-200 flex flex-col md:flex-row"
        style={{ height: '70vh', minHeight: '400px', maxHeight: '600px' }}
      >
        {/* Conversations List */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto h-1/3 md:h-full">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
          </div>
          {conversationsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{conv.customer?.name || 'Customer'}</p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                  {selectedConversation.customer?.name || 'Customer'}
                </h3>
                <p className="text-sm text-gray-500">{selectedConversation.customer?.email}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">No messages yet</div>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isVendor ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.isVendor ? 'bg-primary text-white' : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${msg.isVendor ? 'text-blue-100' : 'text-gray-500'}`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="bg-primary text-white px-6 py-2 hover:bg-opacity-90 transition disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={['fal', 'paper-plane']} />
                  </button>
                </div>
                {isConnected && (
                  <p className="text-xs text-green-600 mt-2">
                    <FontAwesomeIcon icon={['fas', 'circle']} className="mr-1" />
                    Real-time messaging active
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
