'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@streka/tokens';

const ERROR_COPY: Record<number, string> = {
  400: 'Enter a valid email and a password of at least 8 characters',
  401: 'Wrong email or password',
  409: 'That email is already registered',
};

const GENERIC_ERROR = 'Something went wrong, try again';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const label = mode === 'signin' ? 'Sign in' : 'Sign up';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/app');
        return;
      }
      setError(ERROR_COPY[res.status] ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    }
    setBusy(false);
  }

  return (
    <main style={{ maxWidth: 380, margin: '0 auto', padding: '64px 20px' }}>
      <h1 style={{ font: "900 italic 28px 'Archivo'", letterSpacing: '-.03em', margin: '0 0 24px' }}>
        {label}
      </h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '14px 0 6px' }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error && (
          <p role="alert" style={{ color: colors.danger, fontSize: 13, fontWeight: 600, margin: '14px 0 0' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} style={buttonStyle(busy)}>
          {label}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 18, color: colors.mutedLight }}>
        {mode === 'signin' ? (
          <>New here? <a href="/signup">Create an account</a></>
        ) : (
          <>Already have an account? <a href="/signin">Sign in</a></>
        )}
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '11px 12px',
  borderRadius: 12,
  border: `1px solid ${colors.cardLightBorder}`,
  fontSize: 15,
  fontWeight: 500,
};

function buttonStyle(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    marginTop: 22,
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: colors.ink,
    color: colors.white,
    fontSize: 15,
    fontWeight: 900,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.6 : 1,
  };
}
