import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Box, Divider,
} from '@mui/material';
import { useAuth } from '../stores/auth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BackupIcon from '@mui/icons-material/Backup';
import ar from '../i18n/ar';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  section: string;
}

const DRAWER_WIDTH = 260;

const navItems: NavItem[] = [
  { path: '/dashboard', label: ar.sidebar.dashboard, icon: <DashboardIcon />, section: ar.sidebar.dashboardSection },
  { path: '/products', label: ar.sidebar.products, icon: <InventoryIcon />, section: ar.sidebar.inventorySection },
  { path: '/categories', label: ar.sidebar.categories, icon: <FolderOpenIcon />, section: ar.sidebar.inventorySection },
  { path: '/attributes', label: ar.sidebar.attributes, icon: <TuneIcon />, section: ar.sidebar.inventorySection },
  { path: '/inventory', label: ar.sidebar.inventory, icon: <AddShoppingCartIcon />, section: ar.sidebar.inventorySection },
  { path: '/reports', label: ar.sidebar.reports, icon: <AssessmentIcon />, section: ar.sidebar.inventorySection },
  { path: '/users', label: ar.sidebar.users, icon: <PeopleOutlineIcon />, section: ar.sidebar.adminSection },
  { path: '/import', label: ar.sidebar.import, icon: <UploadFileIcon />, section: ar.sidebar.adminSection },
  { path: '/backups', label: ar.sidebar.backups, icon: <BackupIcon />, section: ar.sidebar.adminSection },
  { path: '/settings', label: ar.sidebar.settings, icon: <SettingsIcon />, section: ar.sidebar.adminSection },
];

const sections = [ar.sidebar.dashboardSection, ar.sidebar.inventorySection, ar.sidebar.adminSection];

export function Sidebar({ open = true, onClose, variant = 'permanent' }: { open?: boolean; onClose?: () => void; variant?: 'permanent' | 'temporary' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuth((s) => s.session?.role);
  const isAdmin = role === 'ADMIN';
  const handleNav = (path: string) => { navigate(path); onClose?.(); };

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderInlineStart: '1px solid #E0E4EA' },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {ar.sidebar.brand}
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {sections.map((section) => {
          let items = navItems.filter((i) => i.section === section);
          // Hide admin section for non-ADMIN
          if (section === ar.sidebar.adminSection && !isAdmin) items = [];
          if (items.length === 0) return null;
          return (
            <Box key={section} sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ px: 2.5, py: 1, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                {section}
              </Typography>
              <List dense disablePadding>
                {items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    selected={location.pathname === item.path}
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                    onClick={() => handleNav(item.path)}
                    sx={{ mx: 1, borderRadius: 1, '&.Mui-selected': { backgroundColor: '#EFF6FF', color: 'primary.main' } }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: location.pathname === item.path ? 'primary.main' : undefined }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
}
