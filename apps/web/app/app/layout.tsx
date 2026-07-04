'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthedEmailProvider } from '@/components/auth/AuthedContext';

type State = { status: 'loading' } | { status: 'authed'; email: string };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          setState({ status: 'authed', email: data.user.email });
        } else {
          router.replace('/signin');
        }
      })
      .catch(() => {
        // A dead API is treated like a missing session so /app never hangs.
        if (active) router.replace('/signin');
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (state.status === 'loading') {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }
  return <AuthedEmailProvider email={state.email}>{children}</AuthedEmailProvider>;
}
