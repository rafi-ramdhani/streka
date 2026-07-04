'use client';

import { useAuthedEmail } from '@/components/auth/AuthedContext';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function AppHome() {
  const email = useAuthedEmail();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 20px' }}>
      <h1 style={{ font: "900 italic 32px 'Archivo'", letterSpacing: '-.03em', margin: 0 }}>
        You are signed in
      </h1>
      <p style={{ margin: '12px 0 28px', fontWeight: 600 }}>Signed in as {email}</p>
      <SignOutButton />
    </main>
  );
}
