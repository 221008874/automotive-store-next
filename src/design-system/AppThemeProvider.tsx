import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import { buildTheme } from './theme';
import { createRtlCache, createLtrCache } from './theme/rtl';
import type { ThemeMode, Direction } from './types';
import { useEffect, useMemo } from 'react';

interface AppThemeProviderProps {
  children: ReactNode;
  mode?: ThemeMode;
  direction?: Direction;
}

export function AppThemeProvider({ children, mode = 'light', direction = 'rtl' }: AppThemeProviderProps) {
  const theme = buildTheme(mode, direction);
  const cache = useMemo(() => (direction === 'rtl' ? createRtlCache() : createLtrCache()), [direction]);
  useEffect(() => { document.documentElement.dir = direction; }, [direction]);
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
