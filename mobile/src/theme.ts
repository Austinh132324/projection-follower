// The BetFollow dark palette, ported from web/src/index.css :root variables so
// the native app matches the web dashboard exactly.

export const colors = {
  bg: '#0a0a10',
  bgElev: '#12121c',
  surface: '#16161f',
  surface2: '#1c1c28',
  border: '#262633',
  borderStrong: '#33334a',
  text: '#f4f4f8',
  muted: '#9a9ab0',
  faint: '#6a6a80',

  accent: '#7c5cff',
  accent2: '#b14dff',

  pos: '#34d399',
  neg: '#f65f6e',
  push: '#f0b849',

  // Tints used behind pills / boxes.
  accentTint: 'rgba(124, 92, 255, 0.16)',
  posTint: 'rgba(52, 211, 153, 0.15)',
  negTint: 'rgba(246, 95, 110, 0.15)',
  pushTint: 'rgba(240, 184, 73, 0.15)',
  accentText: '#b6a4ff',
};

export const radius = {
  lg: 18,
  md: 14,
  sm: 12,
  pill: 999,
};

/** The accent gradient is faked as a solid in most places; expose both stops. */
export const accentGradient = ['#7c5cff', '#b14dff'] as const;
