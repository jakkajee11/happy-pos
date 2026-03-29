export interface ThemePreset {
  id: string
  name: string
  emoji: string
  primary: string        // main action color
  primaryDark: string    // hover/pressed
  primaryLight: string   // light bg (e.g. active nav bg)
  primaryBorder: string  // borders / rings
  primaryText: string    // text color on white bg
  primaryShadow: string  // box-shadow color (rgba)
  sidebarDark?: boolean  // dark sidebar mode
  sidebarBg?: string     // override sidebar bg
  sidebarBorder?: string // override sidebar border
  sidebarText?: string   // override sidebar text
  sidebarTextMuted?: string
  sidebarHoverBg?: string
  sidebarActiveBg?: string
  sidebarActiveText?: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'orange-classic',
    name: 'Orange Classic',
    emoji: '🍊',
    primary: '#f97316',
    primaryDark: '#ea580c',
    primaryLight: '#fff7ed',
    primaryBorder: '#fdba74',
    primaryText: '#ea580c',
    primaryShadow: 'rgba(249,115,22,0.20)',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    emoji: '🌊',
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#eff6ff',
    primaryBorder: '#93c5fd',
    primaryText: '#2563eb',
    primaryShadow: 'rgba(59,130,246,0.20)',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    emoji: '🌿',
    primary: '#10b981',
    primaryDark: '#059669',
    primaryLight: '#ecfdf5',
    primaryBorder: '#6ee7b7',
    primaryText: '#059669',
    primaryShadow: 'rgba(16,185,129,0.20)',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    emoji: '🌸',
    primary: '#ec4899',
    primaryDark: '#db2777',
    primaryLight: '#fdf2f8',
    primaryBorder: '#f9a8d4',
    primaryText: '#db2777',
    primaryShadow: 'rgba(236,72,153,0.20)',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    emoji: '🔮',
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    primaryLight: '#f5f3ff',
    primaryBorder: '#c4b5fd',
    primaryText: '#7c3aed',
    primaryShadow: 'rgba(139,92,246,0.20)',
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    emoji: '☕',
    primary: '#d97706',
    primaryDark: '#b45309',
    primaryLight: '#fffbeb',
    primaryBorder: '#fcd34d',
    primaryText: '#b45309',
    primaryShadow: 'rgba(217,119,6,0.20)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryBorder: '#a5b4fc',
    primaryText: '#4f46e5',
    primaryShadow: 'rgba(99,102,241,0.20)',
    sidebarDark: true,
    sidebarBg: '#0f172a',
    sidebarBorder: '#1e293b',
    sidebarText: '#e2e8f0',
    sidebarTextMuted: '#94a3b8',
    sidebarHoverBg: '#1e293b',
    sidebarActiveBg: '#1e293b',
    sidebarActiveText: '#818cf8',
  },
  {
    id: 'teal-breeze',
    name: 'Teal Breeze',
    emoji: '🩵',
    primary: '#14b8a6',
    primaryDark: '#0d9488',
    primaryLight: '#f0fdfa',
    primaryBorder: '#5eead4',
    primaryText: '#0d9488',
    primaryShadow: 'rgba(20,184,166,0.20)',
  },
  {
    id: 'red-passion',
    name: 'Red Passion',
    emoji: '🔴',
    primary: '#f43f5e',
    primaryDark: '#e11d48',
    primaryLight: '#fff1f2',
    primaryBorder: '#fda4af',
    primaryText: '#e11d48',
    primaryShadow: 'rgba(244,63,94,0.20)',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    emoji: '🌟',
    primary: '#eab308',
    primaryDark: '#ca8a04',
    primaryLight: '#fefce8',
    primaryBorder: '#fde047',
    primaryText: '#ca8a04',
    primaryShadow: 'rgba(234,179,8,0.20)',
  },
]

export function getThemePreset(themeId: string, customPrimaryColor?: string): ThemePreset {
  const base = THEME_PRESETS.find(t => t.id === themeId) ?? THEME_PRESETS[0]

  if (themeId === 'custom' && customPrimaryColor) {
    return { ...base, id: 'custom', name: 'Custom', emoji: '🎨', primary: customPrimaryColor }
  }

  return base
}

// Derive a lighter version of a hex color (mix with white)
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function lighten(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  const lr = Math.round(r + (255 - r) * factor)
  const lg = Math.round(g + (255 - g) * factor)
  const lb = Math.round(b + (255 - b) * factor)
  return `rgb(${lr},${lg},${lb})`
}

function darken(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  const dr = Math.round(r * (1 - factor))
  const dg = Math.round(g * (1 - factor))
  const db = Math.round(b * (1 - factor))
  return `rgb(${dr},${dg},${db})`
}

/** Returns all CSS variable values for a theme — used for instant live preview via element.style.setProperty */
export function getThemeVariables(theme: ThemePreset, customPrimaryColor?: string): Record<string, string> {
  const p = customPrimaryColor && theme.id === 'custom'
    ? { ...theme, primary: customPrimaryColor }
    : theme
  return {
    '--hp-primary':          p.primary,
    '--hp-primary-dark':     p.primaryDark,
    '--hp-primary-light':    p.primaryLight,
    '--hp-primary-border':   p.primaryBorder,
    '--hp-primary-text':     p.primaryText,
    '--hp-primary-shadow':   p.primaryShadow,
    '--hp-primary-100':      lighten(p.primary, 0.88),
    '--hp-primary-text-d':   darken(p.primaryText, 0.15),
  }
}

export function generateThemeCSS(theme: ThemePreset, customPrimaryColor?: string): string {
  const p = customPrimaryColor && theme.id === 'custom'
    ? { ...theme, primary: customPrimaryColor }
    : theme

  const vars = getThemeVariables(p, customPrimaryColor)

  const css = `
/* ===== Happy POS Theme: ${p.name} ${p.emoji} ===== */
:root {
  --hp-primary: ${vars['--hp-primary']};
  --hp-primary-dark: ${vars['--hp-primary-dark']};
  --hp-primary-light: ${vars['--hp-primary-light']};
  --hp-primary-border: ${vars['--hp-primary-border']};
  --hp-primary-text: ${vars['--hp-primary-text']};
  --hp-primary-shadow: ${vars['--hp-primary-shadow']};
  --hp-primary-100: ${vars['--hp-primary-100']};
  --hp-primary-text-d: ${vars['--hp-primary-text-d']};
}

/* Primary backgrounds — reference CSS variables for instant live-swap */
.bg-orange-500 { background-color: var(--hp-primary) !important; }
.bg-orange-400 { background-color: var(--hp-primary) !important; }
.bg-orange-600 { background-color: var(--hp-primary-dark) !important; }
.bg-orange-50  { background-color: var(--hp-primary-light) !important; }
.bg-orange-100 { background-color: var(--hp-primary-100) !important; }

/* Hover backgrounds */
.hover\\:bg-orange-500:hover { background-color: var(--hp-primary) !important; }
.hover\\:bg-orange-600:hover { background-color: var(--hp-primary-dark) !important; }
.hover\\:bg-orange-50:hover  { background-color: var(--hp-primary-light) !important; }
.hover\\:bg-orange-100:hover { background-color: var(--hp-primary-100) !important; }

/* Active / selected */
.active\\:bg-orange-600:active { background-color: var(--hp-primary-dark) !important; }

/* Primary text */
.text-orange-500 { color: var(--hp-primary-text) !important; }
.text-orange-600 { color: var(--hp-primary-text) !important; }
.text-orange-700 { color: var(--hp-primary-text-d) !important; }

/* Hover text */
.hover\\:text-orange-500:hover { color: var(--hp-primary-text) !important; }
.hover\\:text-orange-600:hover { color: var(--hp-primary-dark) !important; }

/* Borders */
.border-orange-300 { border-color: var(--hp-primary-border) !important; }
.border-orange-400 { border-color: var(--hp-primary-border) !important; }
.border-orange-500 { border-color: var(--hp-primary) !important; }

/* Hover borders */
.hover\\:border-orange-300:hover { border-color: var(--hp-primary-border) !important; }
.hover\\:border-orange-400:hover { border-color: var(--hp-primary-border) !important; }

/* Focus rings */
.focus\\:ring-orange-300:focus { --tw-ring-color: var(--hp-primary-border) !important; }
.focus\\:ring-2.focus\\:ring-orange-300:focus { --tw-ring-color: var(--hp-primary-border) !important; }
.focus\\:border-orange-400:focus { border-color: var(--hp-primary-border) !important; }

/* Shadows */
.shadow-orange-200 { --tw-shadow-color: var(--hp-primary-shadow) !important; }

/* Accent (checkboxes, radios) */
.accent-orange-500 { accent-color: var(--hp-primary) !important; }

/* Ring color utilities */
.ring-orange-400 { --tw-ring-color: var(--hp-primary) !important; }

${p.sidebarDark ? `
/* ===== Dark Sidebar (Midnight) ===== */
body { background-color: #f1f5f9 !important; }
aside {
  background-color: ${p.sidebarBg ?? '#0f172a'} !important;
  border-color: ${p.sidebarBorder ?? '#1e293b'} !important;
}
aside .text-gray-800,
aside .text-gray-700 { color: ${p.sidebarText ?? '#e2e8f0'} !important; }
aside .text-gray-600 { color: ${p.sidebarTextMuted ?? '#94a3b8'} !important; }
aside .text-gray-500,
aside .text-gray-400 { color: ${p.sidebarTextMuted ?? '#94a3b8'} !important; }
aside .text-blue-500, aside .text-green-500, aside .text-purple-500,
aside .text-red-500, aside .text-pink-500, aside .text-cyan-500,
aside .text-yellow-500, aside .text-orange-500 { color: ${p.sidebarTextMuted ?? '#94a3b8'} !important; }
aside .border-gray-100,
aside .border-gray-200 { border-color: ${p.sidebarBorder ?? '#1e293b'} !important; }
aside .hover\\:bg-gray-50:hover,
aside .hover\\:bg-gray-100:hover { background-color: ${p.sidebarHoverBg ?? '#1e293b'} !important; }
aside .hover\\:text-gray-900:hover { color: #ffffff !important; }
aside .bg-white { background-color: ${p.sidebarBorder ?? '#1e293b'} !important; border-color: rgba(255,255,255,0.1) !important; }
aside button { color: ${p.sidebarTextMuted ?? '#94a3b8'} !important; }
aside button:hover { color: #ffffff !important; }
aside .bg-orange-50 { background-color: ${p.sidebarActiveBg ?? '#1e293b'} !important; }
aside .text-orange-600 { color: ${p.sidebarActiveText ?? '#818cf8'} !important; }
aside .text-orange-500 { color: ${p.sidebarActiveText ?? '#818cf8'} !important; }
aside .bg-orange-500 { background-color: #312e81 !important; }
` : `
/* ===== Colored Sidebar ===== */
/* Body: light theme tint */
body { background-color: var(--hp-primary-light) !important; }

/* Sidebar: use theme primary color */
aside {
  background-color: var(--hp-primary) !important;
  border-color: var(--hp-primary-dark) !important;
}
/* Text: white on colored background */
aside .text-gray-800, aside .text-gray-700, aside .text-gray-600 { color: rgba(255,255,255,0.92) !important; }
aside .text-gray-500, aside .text-gray-400 { color: rgba(255,255,255,0.60) !important; }
/* Nav icon colors → white */
aside .text-blue-500, aside .text-green-500, aside .text-purple-500,
aside .text-red-500, aside .text-pink-500, aside .text-cyan-500,
aside .text-yellow-500 { color: rgba(255,255,255,0.70) !important; }
/* Active icon (text-orange-500) and POS icon: more visible */
aside .text-orange-500 { color: rgba(255,255,255,0.90) !important; }
/* Hover state: subtle lightening */
aside .hover\\:bg-gray-50:hover,
aside .hover\\:bg-gray-100:hover { background-color: rgba(255,255,255,0.12) !important; }
aside .hover\\:text-gray-900:hover { color: #ffffff !important; }
/* Borders: translucent white */
aside .border-gray-100,
aside .border-gray-200 { border-color: rgba(255,255,255,0.18) !important; }
/* Active nav item: white translucent bg + full white text */
aside .bg-orange-50 { background-color: rgba(255,255,255,0.20) !important; }
aside .text-orange-600 { color: #ffffff !important; }
/* Logo badge: darker overlay so it stands out */
aside .bg-orange-500 { background-color: rgba(0,0,0,0.20) !important; }
/* Collapse toggle button */
aside .bg-white { background-color: rgba(0,0,0,0.18) !important; border-color: rgba(255,255,255,0.20) !important; }
aside button { color: rgba(255,255,255,0.70) !important; }
aside button:hover { color: #ffffff !important; }
`}
`
  return css.trim()
}
