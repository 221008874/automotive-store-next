import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { QuickActionsProvider } from '../quick-actions/QuickActionsProvider';
import { GlobalActionButton } from '../quick-actions/GlobalActionButton';

export function AppShell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar open={isMobile ? mobileOpen : true} onClose={() => setMobileOpen(false)} variant={isMobile ? 'temporary' : 'permanent'} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar onMenuClick={() => setMobileOpen(true)} showMenu={isMobile} />
        <Box
          component="main"
          sx={{
            flex: 1, overflow: 'auto', p: 3,
            backgroundColor: 'background.default',
          }}
        >
          <QuickActionsProvider>
            <Outlet />
            <GlobalActionButton />
          </QuickActionsProvider>
        </Box>
      </Box>
    </Box>
  );
}
