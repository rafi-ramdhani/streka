'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@streka/tokens';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // The local session is being abandoned regardless, so a failed request
      // must not leave the button stuck or surface as an unhandled rejection.
    } finally {
      router.replace('/');
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        padding: '10px 18px',
        borderRadius: 14,
        border: `1px solid ${colors.cardLightBorder}`,
        background: colors.white,
        fontSize: 14,
        fontWeight: 800,
        cursor: busy ? 'default' : 'pointer',
      }}
    >
      Sign out
    </button>
  );
}
