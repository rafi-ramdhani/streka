'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@streka/tokens';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
    router.replace('/');
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
