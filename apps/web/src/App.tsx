import { useState } from 'react';
import { colors } from '@streka/tokens';
import { Slash } from './components/bits';
import { Toast } from './components/Toast';
import { Board } from './sections/Board';
import { Goals } from './sections/Goals';
import { Trends } from './sections/Trends';
import { useIsMobile } from './lib';

export type Section = 'board' | 'trends' | 'goals';

export function App() {
  const [section, setSection] = useState<Section>('board');
  const mobile = useIsMobile();

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
            <span
              style={{
                font: "900 italic 20px 'Archivo'",
                letterSpacing: '-.03em',
              }}
            >
              STREKA
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f0f2ee', borderRadius: 999, padding: 3 }}>
            {pill('board', 'Board')}
            {pill('trends', 'Trends')}
            {pill('goals', 'Goals')}
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              color: colors.mutedLight,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: colors.accent }} />
            Synced · iPhone, just now
          </div>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#d8e4d6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12.5,
              color: '#3a4a3a',
            }}
          >
            JT
          </div>
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
        {section === 'board' ? <Board goGoals={() => setSection('goals')} /> : null}
        {section === 'trends' ? <Trends /> : null}
        {section === 'goals' ? <Goals /> : null}
      </div>
      <Toast />
    </div>
  );
}
