import type { ReactNode } from 'react';
import { useIsMobile } from '../lib';

// Centered 420px modal at >=860px; bottom sheet below (Web:252-260).
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const mobile = useIsMobile();
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(19,23,18,.45)',
          zIndex: 40,
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 41,
          display: 'flex',
          justifyContent: 'center',
          alignItems: mobile ? 'flex-end' : 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            background: '#fff',
            borderRadius: mobile ? '22px 22px 0 0' : 22,
            padding: 24,
            width: mobile ? '100%' : 420,
            maxWidth: 440,
            boxShadow: '0 30px 80px rgba(19,23,18,.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-.02em' }}>{title}</div>
            <div
              onClick={onClose}
              style={{ fontSize: 12.5, fontWeight: 800, color: '#6b736b', cursor: 'pointer' }}
            >
              Close
            </div>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export function OptionRow({
  label,
  meta,
  metaColor = '#17a253',
  onClick,
}: {
  label: string;
  meta: string;
  metaColor?: string;
  onClick: () => void;
}) {
  return (
    <div
      className="opt-row"
      onClick={onClick}
      style={{
        background: '#f5f7f3',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: metaColor }}>{meta}</div>
    </div>
  );
}
