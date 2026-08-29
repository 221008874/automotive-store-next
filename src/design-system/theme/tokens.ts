export const colorTokens = {
  primary: '#1976D2',
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#D32F2F',
  info: '#0288D1',
  neutral0: '#FFFFFF',
  neutral50: '#F7F9FC',
  neutral100: '#EEF1F6',
  neutral200: '#E0E4EA',
  neutral500: '#6B7280',
  neutral800: '#1F2933',
  neutral900: '#0B1220',
} as const;

export const spacingUnit = 8;
export const radiusTokens = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const fontTokens = {
  family: '"Cairo", "Segoe UI", Roboto, Arial, sans-serif',
  weightRegular: 400,
  weightMedium: 600,
  weightBold: 700,
} as const;
