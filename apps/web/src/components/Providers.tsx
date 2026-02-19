'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside the component to avoid issues with SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
            gcTime: 1000 * 60 * 15, // 15 minutes - cache garbage collection time
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Don't refetch if data is fresh
            refetchOnReconnect: 'always',
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors (client errors)
              const status = (error as { status?: number })?.status;
              if (status && status >= 400 && status < 500) return false;
              // Retry up to 2 times for network/server errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
          },
          mutations: {
            retry: 1,
            // Optimistic caching for mutations
            onSuccess: () => {
              // Most mutations should invalidate related queries
              // This will be overridden by specific mutation implementations
            },
          },
        },
      }),
  );

  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/auth`}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
