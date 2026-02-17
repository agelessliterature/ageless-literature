/**
 * Notifications Page
 * Full list of user notifications with filtering and actions
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import { mapNotificationToUI } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { initSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data: notificationsData, isLoading } = useNotifications(
    page,
    20,
    filter === 'all' ? {} : { isRead: filter === 'read' },
  );
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // Initialize Socket.IO and listen for notification events
  useEffect(() => {
    if (!session?.accessToken) return;

    const socket = initSocket(session.accessToken);

    // Listen for real-time notification updates
    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:read', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:read_all', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notification:read_all');
    };
  }, [session?.accessToken, queryClient]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoading message="Loading notifications..." fullPage={false} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination;
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    const uiData = mapNotificationToUI(notification);
    router.push(uiData.href);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Notifications</h1>
            <p className="text-gray-600">Stay updated with your account activity</p>
          </div>
          {hasUnread && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="px-4 py-2 bg-secondary text-primary rounded-lg hover:bg-secondary/90 transition-colors font-medium disabled:opacity-50"
            >
              <FontAwesomeIcon icon={['fal', 'check-double']} className="mr-2" />
              Mark All Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['all', 'unread', 'read'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => {
                setFilter(filterType);
                setPage(1);
              }}
              className={`px-6 py-3 font-medium transition-all relative ${
                filter === filterType ? 'text-secondary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filter === filterType && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={['fal', 'bell-slash']}
          title="No notifications yet"
          description={
            filter === 'unread'
              ? "You're all caught up! No unread notifications."
              : filter === 'read'
                ? 'No read notifications to show.'
                : "When you receive notifications, they'll appear here."
          }
        />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {notifications.map((notification) => {
              const uiData = mapNotificationToUI(notification);
              return (
                <div
                  key={notification.id}
                  className={`p-6 transition-all relative ${
                    !notification.isRead ? 'bg-blue-50/30' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`${uiData.color} flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center`}
                    >
                      <FontAwesomeIcon icon={uiData.icon} className="text-xl" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div
                          onClick={() => handleNotificationClick(notification)}
                          className="cursor-pointer flex-1"
                        >
                          <h3 className="text-lg font-semibold text-primary mb-1 hover:text-secondary transition-colors">
                            {uiData.title}
                          </h3>
                          <p className="text-gray-700">{uiData.message}</p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-3 h-3 bg-secondary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span suppressHydrationWarning>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.readAt && (
                          <span suppressHydrationWarning>
                            Read{' '}
                            {formatDistanceToNow(new Date(notification.readAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-3">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            className="text-sm text-secondary hover:underline disabled:opacity-50"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          disabled={deleteNotificationMutation.isPending}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FontAwesomeIcon icon={['fal', 'chevron-left']} className="mr-2" />
                Previous
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, current, and adjacent pages
                    return (
                      p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1)
                    );
                  })
                  .map((p, idx, arr) => {
                    // Add ellipsis
                    if (idx > 0 && p > arr[idx - 1] + 1) {
                      return [
                        <span key={`ellipsis-${p}`} className="px-2 text-gray-400">
                          ...
                        </span>,
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-lg transition-colors ${
                            page === p
                              ? 'bg-secondary text-primary font-semibold'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>,
                      ];
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          page === p
                            ? 'bg-secondary text-primary font-semibold'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <FontAwesomeIcon icon={['fal', 'chevron-right']} className="ml-2" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Back to Account */}
      <div className="mt-8 text-center">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-secondary hover:underline"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} />
          Back to Account
        </Link>
      </div>
    </div>
  );
}
