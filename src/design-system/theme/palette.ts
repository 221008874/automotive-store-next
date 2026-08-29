import type { PaletteOptions } from '@mui/material';
import { colorTokens } from './tokens';

export const lightPalette: PaletteOptions = {
  primary: { main: colorTokens.primary, light: '#E3F2FD', dark: '#1565C0' },
  success: { main: colorTokens.success, light: '#E8F5E9', dark: '#1B5E20' },
  warning: { main: colorTokens.warning, light: '#FFF3E0', dark: '#E65100' },
  error: { main: colorTokens.error, light: '#FFEBEE', dark: '#C62828' },
  info: { main: colorTokens.info, light: '#E1F5FE' },
  background: { default: colorTokens.neutral50, paper: colorTokens.neutral0 },
  text: { primary: colorTokens.neutral900, secondary: colorTokens.neutral500 },
  divider: colorTokens.neutral200,
};

export const darkPalette: PaletteOptions = {
  primary: { main: '#90CAF9', light: '#1A237E', dark: '#42A5F5' },
  success: { main: '#81C784', light: '#1B5E20', dark: '#66BB6A' },
  warning: { main: '#FFB74D', light: '#E65100', dark: '#FFA726' },
  error: { main: '#EF5350', light: '#C62828', dark: '#E53935' },
  info: { main: '#4FC3F7', light: '#01579B' },
  background: { default: '#121212', paper: '#1E1E1E' },
  text: { primary: '#E0E0E0', secondary: '#9E9E9E' },
  divider: '#333333',
};
