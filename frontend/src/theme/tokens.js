export const colors = {
  brand: {
    blue: '#0066FF',
    cyan: '#00D4AA',
    gradient: 'linear-gradient(135deg, #0066FF, #00D4AA)',
  },
  semantic: {
    success: '#00D4AA',
    warning: '#F5A623',
    error: '#EF4444',
    info: '#0066FF',
  },
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  light: {
    surface: {
      base: '#FAFAFA',
      card: '#FFFFFF',
      overlay: '#FFFFFF',
      popover: '#FFFFFF',
      input: '#FFFFFF',
      hover: '#F5F5F5',
    },
    border: {
      default: '#E5E5E5',
      hover: '#D4D4D4',
      focus: '#0066FF',
    },
    text: {
      primary: '#0A0A0A',
      secondary: '#525252',
      tertiary: '#737373',
      disabled: '#A3A3A3',
    },
  },
  dark: {
    surface: {
      base: '#0A0A0A',
      card: '#141414',
      overlay: '#1C1C1C',
      popover: '#242424',
      input: '#141414',
      hover: '#1C1C1C',
    },
    border: {
      default: 'rgba(255, 255, 255, 0.08)',
      hover: 'rgba(255, 255, 255, 0.15)',
      focus: '#0066FF',
    },
    text: {
      primary: '#EDEDED',
      secondary: '#A3A3A3',
      tertiary: '#737373',
      disabled: '#525252',
    },
  },
}

export const typography = {
  fontFamily: {
    display: "'Sora', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    hero: '56px',
    h1: '40px',
    h2: '32px',
    h3: '24px',
    h4: '20px',
    body: '16px',
    bodySmall: '14px',
    caption: '12px',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
}

export const spacing = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
}

export const shadows = {
  light: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
    strong: '0 8px 24px rgba(0, 0, 0, 0.12)',
    glow: '0 0 20px rgba(0, 102, 255, 0.3)',
  },
  dark: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.4)',
    strong: '0 8px 24px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(0, 102, 255, 0.3)',
  },
}
