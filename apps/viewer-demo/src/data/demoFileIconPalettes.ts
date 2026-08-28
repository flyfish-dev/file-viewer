import type { DemoFileIconFamily } from '@/composables/useDemoFileTypes'

export interface DemoFileIconThemeTokens {
  readonly surface: `#${string}`
  readonly border: `#${string}`
  readonly accent: `#${string}`
  readonly label: `#${string}`
}

export interface DemoFileIconPalette {
  readonly light: DemoFileIconThemeTokens
  readonly dark: DemoFileIconThemeTokens
}

/**
 * Flat, low-chroma surfaces keep every format in one visual family. Accents are
 * deliberately tuned per theme instead of relying on filters or color inversion.
 */
export const DEMO_FILE_ICON_PALETTES = Object.freeze({
  word: {
    light: { surface: '#F2F7FD', border: '#C7DAF1', accent: '#245BB7', label: '#245BB7' },
    dark: { surface: '#172838', border: '#36516A', accent: '#91BCF6', label: '#B7D3F8' }
  },
  sheet: {
    light: { surface: '#EFF8F3', border: '#C1E1D0', accent: '#126B43', label: '#126B43' },
    dark: { surface: '#172D27', border: '#31564A', accent: '#79D6A5', label: '#A9E6C5' }
  },
  slide: {
    light: { surface: '#FCF4ED', border: '#EBCFBA', accent: '#A7480E', label: '#A7480E' },
    dark: { surface: '#30251E', border: '#624531', accent: '#F2AD7E', label: '#F5C6A7' }
  },
  pdf: {
    light: { surface: '#FCF1F2', border: '#EBC5C8', accent: '#B72832', label: '#B72832' },
    dark: { surface: '#302126', border: '#643B44', accent: '#F39A9F', label: '#F6BEC1' }
  },
  layout: {
    light: { surface: '#F6F2FC', border: '#D9CCEC', accent: '#6237B7', label: '#6237B7' },
    dark: { surface: '#28243A', border: '#50466C', accent: '#C0ADF1', label: '#D4C9F5' }
  },
  cad: {
    light: { surface: '#EEF8FA', border: '#C1DEE3', accent: '#0B687F', label: '#0B687F' },
    dark: { surface: '#173039', border: '#315861', accent: '#7ACCD7', label: '#A5DFE6' }
  },
  drawing: {
    light: { surface: '#F5F2FC', border: '#D8CDED', accent: '#6533B8', label: '#6533B8' },
    dark: { surface: '#27243A', border: '#4D466A', accent: '#BCA5EE', label: '#D2C5F4' }
  },
  model: {
    light: { surface: '#F2F8EF', border: '#CCDFC4', accent: '#3F7428', label: '#3F7428' },
    dark: { surface: '#203026', border: '#3D5945', accent: '#9FD087', label: '#C0E1AF' }
  },
  ebook: {
    light: { surface: '#F7F2FC', border: '#DDCDEA', accent: '#6C35B2', label: '#6C35B2' },
    dark: { surface: '#28233A', border: '#50436B', accent: '#C0A9EF', label: '#D5C8F4' }
  },
  archive: {
    light: { surface: '#FBF6EA', border: '#E5D4AA', accent: '#835006', label: '#835006' },
    dark: { surface: '#30291C', border: '#5D5032', accent: '#E6C17D', label: '#EED6A7' }
  },
  email: {
    light: { surface: '#F0F6FC', border: '#C5D9EE', accent: '#1E5AB6', label: '#1E5AB6' },
    dark: { surface: '#192A3B', border: '#36526D', accent: '#8DB7EC', label: '#B4D0F1' }
  },
  eda: {
    light: { surface: '#EEF8F9', border: '#BEDFE2', accent: '#0A6976', label: '#0A6976' },
    dark: { surface: '#173037', border: '#31575E', accent: '#78C9D1', label: '#A3DCE1' }
  },
  medical: {
    light: { surface: '#EEF8F8', border: '#BFDEDE', accent: '#0B6970', label: '#0B6970' },
    dark: { surface: '#173033', border: '#31575A', accent: '#79CDD0', label: '#A6E1E3' }
  },
  signature: {
    light: { surface: '#F5F3FC', border: '#D6CCEC', accent: '#5B35A8', label: '#5B35A8' },
    dark: { surface: '#27243A', border: '#4E476B', accent: '#BFAAF0', label: '#D6CAF5' }
  },
  text: {
    light: { surface: '#F6F7EE', border: '#D7DAB9', accent: '#5D681D', label: '#5D681D' },
    dark: { surface: '#292F21', border: '#4E5838', accent: '#BCCB89', label: '#D1DBAB' }
  },
  code: {
    light: { surface: '#F2F5F7', border: '#CED8DE', accent: '#3B4A59', label: '#3B4A59' },
    dark: { surface: '#222A33', border: '#414F5B', accent: '#B8C7D2', label: '#CED9E0' }
  },
  image: {
    light: { surface: '#FBF1F7', border: '#E7C9DA', accent: '#9E2867', label: '#9E2867' },
    dark: { surface: '#30232F', border: '#604359', accent: '#E7A4CA', label: '#F0C3DC' }
  },
  audio: {
    light: { surface: '#EFF8F6', border: '#C1DFDA', accent: '#0D6A63', label: '#0D6A63' },
    dark: { surface: '#16302E', border: '#2F5955', accent: '#76CCC1', label: '#A0DFD7' }
  },
  video: {
    light: { surface: '#F2F3FB', border: '#CFD1EA', accent: '#4137A8', label: '#4137A8' },
    dark: { surface: '#23273B', border: '#454B6D', accent: '#AAADEA', label: '#C9CAF2' }
  },
  data: {
    light: { surface: '#F5F2FA', border: '#D7CCE7', accent: '#572F9D', label: '#572F9D' },
    dark: { surface: '#29243A', border: '#51466A', accent: '#B9A8E8', label: '#D0C5F0' }
  },
  generic: {
    light: { surface: '#F3F6F8', border: '#CFD9DF', accent: '#4D5E6B', label: '#4D5E6B' },
    dark: { surface: '#212B32', border: '#414F58', accent: '#AFBEC8', label: '#C9D4DA' }
  }
} satisfies Readonly<Record<DemoFileIconFamily, DemoFileIconPalette>>)
