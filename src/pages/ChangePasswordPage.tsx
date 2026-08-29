import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Paper } from '@mui/material';
import KeyIcon from '@mui/icons-material/LockReset';
import { useAuth } from '../stores/auth';
import { api } from '../lib/api';
import { useSnackbar, AppSnackbar } from '../design-system';
import ar from '../i18n/ar';

export function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { snackbar, showSuccess, close } = useSnackbar();
  const navigate = useNavigate();
  const markPasswordChanged = useAuth((s) => s.markPasswordChanged);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(ar.login.passwordMismatch);
      return;
    }
    if (newPassword.length < 8) {
      setError('يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/change-password', { oldPassword, newPassword });
      markPasswordChanged();
      showSuccess('تم تغيير كلمة المرور بنجاح');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default' }}>
      <Paper sx={{ p: 4, width: 400, maxWidth: '90vw' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <KeyIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5">تغيير كلمة المرور</Typography>
          <Typography variant="body2" color="text.secondary">يجب تغيير كلمة المرور قبل المتابعة</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="كلمة المرور الحالية"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="كلمة المرور الجديدة"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="8 أحرف على الأقل"
          />
          <TextField
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? ar.loading : 'تغيير كلمة المرور'}
          </Button>
        </Box>
        <AppSnackbar state={snackbar} onClose={close} />
      </Paper>
    </Box>
  );
}