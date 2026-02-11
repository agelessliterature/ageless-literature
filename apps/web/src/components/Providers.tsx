'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
// Import to initialize FontAwesome icon library
import '@/lib/fontawesome';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside the component to avoid issues with SSR
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider basePath={process.env.NODE_ENV === 'production' ? '/v2/api/auth' : '/api/auth'}>
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
