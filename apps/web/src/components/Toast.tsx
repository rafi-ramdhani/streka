import { useToast } from '../core';
import { CheckSvg } from './bits';

// Bottom-center dark toast (Web:319-325).
export function Toast() {
  const toast = useToast((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: '#131712',
        color: '#fff',
        borderRadius: 14,
        padding: '13px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        boxShadow: '0 14px 40px rgba(19,23,18,.35)',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 40px)',
        animation: 'toastIn .18s ease',
      }}
    >
      <CheckSvg />
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{toast.title}</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a938a' }}>{toast.sub}</span>
      </div>
    </div>
  );
}
