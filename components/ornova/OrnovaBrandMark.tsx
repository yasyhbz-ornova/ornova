type Props = { className?: string };

const ORNOVA_SYMBOL_MARKUP = `
  <svg class="ornova-symbol" viewBox="0 0 100 108" aria-hidden="true" focusable="false">
    <circle cx="50" cy="66" r="23" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M50 6v85M22 66h10m36 0h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    <path d="M50 12 54 24 66 28 54 32 50 44 46 32 34 28 46 24z" fill="currentColor" />
  </svg>`;

export const ORNOVA_BRAND_MARKUP = `${ORNOVA_SYMBOL_MARKUP}
  <span class="ornova-script-wordmark">ornova</span>
  <span class="ornova-english-motto">more than metal, this is my design.</span>
`;

export function OrnovaSymbol({ className }: Props) {
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ORNOVA_SYMBOL_MARKUP }} />;
}

export function OrnovaBrandMark({ className }: Props) {
  return (
    <div
      className={className ? `ornova-brand-mark ${className}` : "ornova-brand-mark"}
      role="img"
      aria-label="نشان اُرنوا؛ more than metal, this is my design."
      dangerouslySetInnerHTML={{ __html: ORNOVA_BRAND_MARKUP }}
    />
  );
}
