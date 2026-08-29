import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { useLicense } from '../stores/license';
import { AppShell } from '../app-shell/AppShell';
import { LoginPage } from '../pages/LoginPage';
import { ActivationPage } from '../pages/ActivationPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { AttributesPage } from '../pages/AttributesPage';
import { ImportPage } from '../pages/ImportPage';
import { InventoryPage } from '../pages/InventoryPage';
import { ReportsPage } from '../pages/ReportsPage';
import { UsersPage } from '../pages/UsersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { BackupPage } from '../pages/BackupPage';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Box, CircularProgress, Button, Alert, Typography } from '@mui/material';
import ar from '../i18n/ar';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (session.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session);
  if (session?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function ChangePasswordRoute({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (!session.mustChangePassword) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function LicenseGate({ children }: { children: ReactNode }) {
  const status = useLicense((s) => s.status);
  const checking = useLicense((s) => s.checking);
  const error = useLicense((s) => s.error);
  const check = useLicense((s) => s.check);

  // License is machine-level and gates the whole app (including login):
  // check once on mount, regardless of authentication state.
  useEffect(() => {
    if (!status && !error) check();
  }, [status, error, check]);

  // Poll every 5 minutes and on window focus to detect revocation/expiry
  useEffect(() => {
    const interval = setInterval(() => check(), 5 * 60 * 1000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [check]);

  if (checking) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error && !status) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error || ar.license.serverError}</Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            {ar.license.serverErrorHint}
          </Typography>
          <Button variant="contained" fullWidth onClick={() => check()}>{ar.license.retryServer}</Button>
        </Box>
      </Box>
    );
  }
  if (status && !status.activated) return <ActivationPage />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <LicenseGate>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={
          <ChangePasswordRoute><ChangePasswordPage /></ChangePasswordRoute>
        } />
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="attributes" element={<AttributesPage />} />
          <Route path="import" element={<RequireAdmin><ImportPage /></RequireAdmin>} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          <Route path="backups" element={<RequireAdmin><BackupPage /></RequireAdmin>} />
          <Route path="settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </LicenseGate>
  );
}
