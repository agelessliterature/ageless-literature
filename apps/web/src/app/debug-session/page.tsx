'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugSessionPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Debug Session</h1>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Status: {status}</h2>
      </div>

      <div className="bg-gray-100 p-4 rounded overflow-auto">
        <pre className="text-sm">
          {JSON.stringify(
            {
              user: session?.user,
              accessToken: session?.accessToken
                ? '***' + session?.accessToken.substring(session?.accessToken.length - 10)
                : 'MISSING',
              expiresIn: session?.expires,
            },
            null,
            2,
          )}
        </pre>
      </div>

      {!session?.accessToken && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400">
          <p className="text-red-700">
            ⚠️ <strong>accessToken is missing from session!</strong>
          </p>
          <p className="text-red-600 text-sm mt-2">
            This is why admin endpoints return "Invalid authentication token"
          </p>
        </div>
      )}

      {session?.accessToken && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400">
          <p className="text-green-700">✓ accessToken is present in session</p>
        </div>
      )}
    </div>
  );
}
