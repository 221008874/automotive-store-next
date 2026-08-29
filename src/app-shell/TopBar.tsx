import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../stores/auth';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import ar from '../i18n/ar';
import { ConfirmDialog } from '../design-system';

const pageTitles: Record<string, string> = {
  '/dashboard': ar.dashboard.title,
  '/products': ar.products.title,
  '/categories': ar.categories.title,
  '/attributes': ar.attributes.title,
  '/import': ar.import.title,
  '/inventory': ar.inventory.title,
  '/reports': ar.reports.title,
  '/users': ar.users.title,
  '/settings': ar.settings.title,
};

export function TopBar({ onMenuClick, showMenu }: { onMenuClick?: () => void; showMenu?: boolean }) {
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? Object.entries(pageTitles).find(([k]) => location.pathname.startsWith(k))?.[1] ?? '';
  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleLogout = () => { setLogoutOpen(false); logout(); };

  return (
    <>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showMenu && <IconButton edge="start" onClick={onMenuClick} aria-label="القائمة"><MenuIcon /></IconButton>}
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">{session?.username}</Typography>
            <Button size="small" startIcon={<LogoutIcon />} onClick={() => setLogoutOpen(true)} color="inherit">
              خروج
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <ConfirmDialog
        open={logoutOpen}
        title="تأكيد الخروج"
        message="هل أنت متأكد من تسجيل الخروج؟"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
        severity="info"
      />
    </>
  );
}
