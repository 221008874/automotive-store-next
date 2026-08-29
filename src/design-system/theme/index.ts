import { createTheme, type Theme } from '@mui/material/styles';
import type { ThemeMode, Direction } from '../types';
import { spacingUnit, radiusTokens } from './tokens';
import { lightPalette, darkPalette } from './palette';
import { typography } from './typography';

export function buildTheme(mode: ThemeMode, direction: Direction): Theme {
  return createTheme({
    direction,
    spacing: spacingUnit,
    palette: mode === 'light' ? lightPalette : darkPalette,
    typography,
    shape: { borderRadius: radiusTokens.md },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: radiusTokens.sm, textTransform: 'none' } },
      },
      MuiPaper: {
        styleOverrides: { root: { borderRadius: radiusTokens.md } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: radiusTokens.pill } },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 700, backgroundColor: 'primary.light', color: 'primary.dark' },
          root: { padding: '10px 14px', fontSize: '0.875rem' },
        },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&:hover': { backgroundColor: 'action.hover' } } },
      },
      MuiTextField: {
        defaultProps: { size: 'small', variant: 'outlined' },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: radiusTokens.lg } },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: radiusTokens.lg, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } },
      },
    },
  });
}
