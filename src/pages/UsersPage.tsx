import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, Stack, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../lib/api';
import { PageLayout, DataTable, SearchBar, UserFormDialog, ConfirmDialog, useSnackbar, AppSnackbar } from '../design-system';
import type { Column } from '../design-system';
import type { UserDto, RoleDto } from '../lib/types';
import ar from '../i18n/ar';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [resetting, setResetting] = useState<UserDto | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [toggling, setToggling] = useState<UserDto | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const { snackbar, showSuccess, showError, close } = useSnackbar();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserDto[]>('/api/users'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<RoleDto[]>('/api/roles'),
  });

  useEffect(() => {
    if (rolesData) setRoles(rolesData);
  }, [rolesData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.roleName.toLowerCase().includes(q),
    );
  }, [users, search]);

  const resetMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => api.post(`/api/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      showSuccess('تم إعادة تعيين كلمة المرور - سيُطلب من المستخدم تغييرها عند الدخول');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل إعادة تعيين كلمة المرور'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/api/users/${id}/active`, { active }),
    onSuccess: (_d, vars) => {
      showSuccess(vars.active ? 'تم تفعيل المستخدم' : 'تم إيقاف المستخدم');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل تغيير حالة المستخدم'),
  });

  const handleAdd = useCallback(() => { setEditing(null); setFormOpen(true); }, []);
  const handleEdit = useCallback((u: UserDto) => { setEditing(u); setFormOpen(true); }, []);
  const handleSaved = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['users'] });
  }, [qc]);
  const handleFormClose = useCallback(() => { setFormOpen(false); setEditing(null); }, []);
  const handleReset = useCallback((u: UserDto) => { setResetting(u); setResetPassword(''); setResetConfirm(''); setResetError(''); }, []);
  const handleResetConfirm = useCallback(() => {
    if (!resetting) return;
    if (!resetPassword || resetPassword.length < 8) {
      setResetError('كلمة المرور 8 أحرف على الأقل');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError('كلمتا المرور غير متطابقتين');
      return;
    }
    resetMutation.mutate({ id: resetting.id, newPassword: resetPassword });
    setResetting(null);
    setResetPassword('');
    setResetConfirm('');
    setResetError('');
  }, [resetting, resetPassword, resetConfirm, resetMutation]);
  const handleResetCancel = useCallback(() => { setResetting(null); setResetPassword(''); setResetConfirm(''); setResetError(''); }, []);
  const handleToggleActive = useCallback(() => {
    if (toggling) {
      toggleActiveMutation.mutate({ id: toggling.id, active: !toggling.active });
      setToggling(null);
    }
  }, [toggling, toggleActiveMutation]);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const inlineRoleMutation = useMutation({
    mutationFn: ({ id, roleName, fullName }: { id: string; roleName: string; fullName: string }) => api.put(`/api/users/${id}`, { fullName, roleName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showSuccess('تم تحديث الدور'); setEditingRoleId(null); },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل تحديث الدور'),
  });

  const columns: Column<UserDto>[] = [
    { key: 'username', header: ar.users.username, render: (r) => r.username },
    { key: 'fullName', header: ar.users.fullName, render: (r) => r.fullName },
    { key: 'roleName', header: ar.users.role, render: (r) => editingRoleId === r.id ? (
      <TextField select size="small" value={r.roleName} onChange={(e) => inlineRoleMutation.mutate({ id: r.id, roleName: e.target.value, fullName: r.fullName })} onBlur={() => setEditingRoleId(null)} autoFocus sx={{ minWidth: 120 }}>
        {roles.map((role) => <MenuItem key={role.name} value={role.name}>{role.labelAr}</MenuItem>)}
      </TextField>
    ) : (
      <Tooltip title="اضغط للتعديل"><Chip label={roles.find((x) => x.name === r.roleName)?.labelAr || r.roleName} size="small" variant="outlined" onClick={() => setEditingRoleId(r.id)} sx={{ cursor: 'pointer' }} /></Tooltip>
    )},
    { key: 'active', header: ar.users.active, render: (r) => (
      <Chip label={r.active ? ar.products.active : ar.products.inactive} size="small" color={r.active ? 'success' : 'default'} variant="outlined" />
    )},
    { key: 'mustChangePassword', header: 'تغيير المرور', render: (r) => (
      <Chip label={r.mustChangePassword ? 'مطلوب' : 'لا'} size="small" color={r.mustChangePassword ? 'warning' : 'default'} variant="outlined" />
    ), width: 110 },
    { key: 'actions', header: ar.actions, render: (r) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={ar.edit}><IconButton size="small" onClick={() => handleEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        {r.active ? (
          <Tooltip title="إيقاف المستخدم"><IconButton size="small" color="warning" onClick={() => setToggling(r)}><BlockIcon fontSize="small" /></IconButton></Tooltip>
        ) : (
          <Tooltip title="تفعيل المستخدم"><IconButton size="small" color="success" onClick={() => setToggling(r)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
        )}
        <Tooltip title={ar.users.resetPassword}><IconButton size="small" onClick={() => handleReset(r)}><LockResetIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    ), width: 140 },
  ];

  return (
    <PageLayout title={ar.users.title} subtitle={ar.users.subtitle} actions={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>{ar.users.addUser}</Button>}>
      <SearchBar value={search} onSearch={setSearch} />
      <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} loading={isLoading} onRowDoubleClick={handleEdit} />
      <UserFormDialog open={formOpen} user={editing} roles={roles} onClose={handleFormClose} onSaved={handleSaved} />
      <Dialog open={!!resetting} onClose={handleResetCancel} maxWidth="xs" fullWidth>
        <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {resetError && <Alert severity="error">{resetError}</Alert>}
            <Alert severity="info">سيُطلب من المستخدم تغيير كلمة المرور عند تسجيل الدخول التالي. سيتم أيضاً إلغاء أي قفل للحساب.</Alert>
            <TextField label="كلمة المرور الجديدة" type="password" value={resetPassword} onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }} fullWidth required error={!!resetPassword && resetPassword.length < 8} helperText={resetPassword.length > 0 && resetPassword.length < 8 ? '8 أحرف على الأقل' : '8 أحرف على الأقل'} />
            <TextField label="تأكيد كلمة المرور" type="password" value={resetConfirm} onChange={(e) => { setResetConfirm(e.target.value); setResetError(''); }} fullWidth required error={!!resetConfirm && resetConfirm !== resetPassword} helperText={resetConfirm && resetConfirm !== resetPassword ? 'غير متطابقتين' : ' '} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetCancel}>إلغاء</Button>
          <Button onClick={handleResetConfirm} variant="contained" disabled={!resetPassword || resetPassword.length < 8 || resetPassword !== resetConfirm}>إعادة التعيين</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={!!toggling} title={toggling?.active ? 'إيقاف المستخدم' : 'تفعيل المستخدم'} message={toggling?.active ? `هل أنت متأكد من إيقاف المستخدم "${toggling?.username}"؟ لن يتمكن من تسجيل الدخول.` : `هل أنت متأكد من تفعيل المستخدم "${toggling?.username}"؟`} onConfirm={handleToggleActive} onCancel={() => setToggling(null)} severity={toggling?.active ? 'warning' : 'info'} confirmLabel={toggling?.active ? 'إيقاف' : 'تفعيل'} />
      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}