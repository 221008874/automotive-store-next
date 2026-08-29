import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Paper, CircularProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLicense } from '../stores/license';
import ar from '../i18n/ar';

export function ActivationPage() {
  const [code, setCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const { status, activating, error, check, activate, deactivate } = useLicense();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    await activate(code.trim());
  };

  const handleDeleteOldLicense = async () => {
    setDeleting(true);
    setDeleteSuccess('');
    try {
      await deactivate();
      setDeleteSuccess('تم حذف الترخيص – يمكنك الآن إدخال رمز جديد');
      setCode('');
    } catch {
      setDeleteSuccess('');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default' }}>
      <Paper sx={{ p: 4, width: 420, maxWidth: '90vw' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <KeyIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5">{ar.license.title}</Typography>
          <Typography variant="body2" color="text.secondary">{ar.license.subtitle}</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {deleteSuccess && <Alert severity="success" sx={{ mb: 2 }}>{deleteSuccess}</Alert>}

        {status?.activated ? (
          <Alert severity="success" sx={{ mb: 2 }}>{ar.license.activated}</Alert>
        ) : (
          <>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={ar.license.codeLabel}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                dir="ltr"
              />
              <Button type="submit" variant="contained" size="large" disabled={activating}>
                {activating ? <CircularProgress size={22} color="inherit" /> : ar.license.activateButton}
              </Button>
            </Box>
            {(status?.hasLocalCache ?? true) && (
              <>
                <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center' }}>
                  <Button size="small" color="warning" startIcon={<DeleteIcon />} onClick={() => setDeleteConfirm(true)} disabled={deleting}>
                    حذف الترخيص القديم
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                  إذا كان لديك ترخيص قديم مربوط بجهاز آخر، احذفه أولاً ثم أدخل الرمز الجديد
                </Typography>
              </>
            )}
          </>
        )}

        <Button size="small" sx={{ mt: 2, display: 'block', mx: 'auto' }} onClick={() => check()} disabled={activating}>
          {ar.license.retry}
        </Button>
        <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} maxWidth="xs" fullWidth>
          <DialogTitle>حذف الترخيص القديم؟</DialogTitle>
          <DialogContent><Typography variant="body2">سيتم حذف ملف الترخيص المحلي من هذا الجهاز. ستحتاج لإدخال رمز جديد للتفعيل.</Typography></DialogContent>
          <DialogActions><Button onClick={() => setDeleteConfirm(false)}>إلغاء</Button><Button onClick={handleDeleteOldLicense} variant="contained" color="warning" disabled={deleting}>حذف</Button></DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
