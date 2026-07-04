'use client';

import { useEffect, useState } from 'react';
import { colors } from '@streka/tokens';
import { useAuthedEmail } from '@/components/auth/AuthedContext';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Slash } from './components/bits';
import { Toast } from './components/Toast';
import { Board } from './sections/Board';
import { Goals } from './sections/Goals';
import { Trends } from './sections/Trends';
import { useIsMobile } from './lib';
import { pullAll } from './sync';

export type Section = 'board' | 'trends' | 'goals';
type Load = 'loading' | 'ready' | 'error';

export function Dashboard() {
  const [section, setSection] = useState<Section>('board');
  const [load, setLoad] = useState<Load>('loading');
  const mobile = useIsMobile();
  const email = useAuthedEmail();

  useEffect(() => {
    let active = true;
    pullAll()
      .then(() => {
        if (active) setLoad('ready');
      })
      .catch(() => {
        if (active) setLoad('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const pill = (name: Section, label: string) => {
    const on = section === name;
    return (
      <div
        key={name}
        onClick={() => setSection(name)}
        style={{
          padding: '8px 18px',
          borderRadius: 999,
          background: on ? colors.appBg : 'transparent',
          color: on ? '#fff' : colors.mutedLight,
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {label}
      </div>
    );
  };

  const centered: React.CSSProperties = {
    textAlign: 'center',
    padding: '80px 0',
    fontSize: 14,
    fontWeight: 700,
    color: colors.mutedLight,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(255,255,255,.95)',
          borderBottom: '1px solid rgba(0,0,0,.07)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 6 }}>
            <Slash size={21} color={colors.appBg} />
            <span style={{ font: "900 italic 20px 'Archivo'", letterSpacing: '-.03em' }}>STREKA</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f0f2ee', borderRadius: 999, padding: 3 }}>
            {pill('board', 'Board')}
            {pill('trends', 'Trends')}
            {pill('goals', 'Goals')}
          </div>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: colors.mutedLight,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </span>
          <SignOutButton />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1120,
          margin: '0 auto',
          padding: mobile ? '16px 16px 40px' : '28px 24px 56px',
        }}
      >
        {load === 'loading' ? (
          <div style={centered}>Loading your data</div>
        ) : load === 'error' ? (
          <div style={centered}>Could not load your data</div>
        ) : (
          <>
            {section === 'board' ? <Board goGoals={() => setSection('goals')} /> : null}
            {section === 'trends' ? <Trends /> : null}
            {section === 'goals' ? <Goals /> : null}
          </>
        )}
      </div>
      <Toast />
    </div>
  );
}
