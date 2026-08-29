import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Alert,
} from '@mui/material';
import { api } from '../../lib/api';
import ar from '../../i18n/ar';
import type { UserDto, CreateUserCommand, UpdateUserCommand, RoleDto } from '../../lib/types';

interface Props {
  open: boolean;
  user?: UserDto | null;
  roles: RoleDto[];
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormDialog({ open, user, roles, onClose, onSaved }: Props) {
  const isEdit = !!user;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [touched, setTouched] = useState({ username: false, fullName: false, roleName: false });

  useEffect(() => {
    if (open) {
      setError('');
      setUsername(user?.username ?? '');
      setFullName(user?.fullName ?? '');
      setRoleName(user?.roleName ?? '');
      setPassword('');
      setTouched({ username: false, fullName: false, roleName: false });
    }
  }, [open, user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/api/users/${user!.id}`, { fullName, roleName } as UpdateUserCommand);
      } else {
        await api.post('/api/users', { username, password, fullName, roleName } as CreateUserCommand);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ المستخدم');
    }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? ar.users.editUser : ar.users.addUser}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {!isEdit && (
            <TextField
              label={ar.users.username}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              fullWidth
              required
              error={touched.username && !username.trim()}
              helperText={touched.username && !username.trim() ? 'اسم المستخدم مطلوب' : ' '}
              autoFocus
            />
          )}
          {!isEdit && (
            <TextField
              label={ar.login.password}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              fullWidth
              required
              error={!!password && password.length > 0 && password.length < 8}
              helperText={password.length > 0 && password.length < 8 ? '8 أحرف على الأقل' : '8 أحرف على الأقل'}
            />
          )}
          <TextField
            label={ar.users.fullName}
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setError(''); }}
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            fullWidth
            required
            error={touched.fullName && !fullName.trim()}
            helperText={touched.fullName && !fullName.trim() ? 'الاسم مطلوب' : ' '}
          />
          <TextField
            label={ar.users.role}
            value={roleName}
            onChange={(e) => { setRoleName(e.target.value); setError(''); }}
            onBlur={() => setTouched((t) => ({ ...t, roleName: true }))}
            select
            fullWidth
            required
            error={touched.roleName && !roleName}
            helperText={touched.roleName && !roleName ? 'اختر الدور' : ' '}
          >
            {roles.map((r) => (
              <MenuItem key={r.name} value={r.name}>{r.labelAr}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{ar.cancel}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !fullName.trim() || !roleName || (!isEdit && (!username.trim() || password.length < 8))}>
          {saving ? ar.loading : ar.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}