'use client';

import { createContext, useContext } from 'react';

const AuthedEmailContext = createContext<string | null>(null);

export function AuthedEmailProvider({ email, children }: { email: string; children: React.ReactNode }) {
  return <AuthedEmailContext.Provider value={email}>{children}</AuthedEmailContext.Provider>;
}

export function useAuthedEmail(): string {
  const email = useContext(AuthedEmailContext);
  if (email === null) throw new Error('useAuthedEmail must be used within AuthedEmailProvider');
  return email;
}
