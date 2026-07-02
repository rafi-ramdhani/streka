import { Txt } from './Txt';

// Always "STREKA": Archivo italic 900, -0.03em.
export function Wordmark({ size, color }: { size: number; color: string }) {
  return (
    <Txt size={size} w={900} italic color={color} ls={-0.03} lineHeight={1}>
      STREKA
    </Txt>
  );
}
