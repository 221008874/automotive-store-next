import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, Stack, Chip, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../lib/api';
import { PageLayout, DataTable, SearchBar, ConfirmDialog, CategoryFormDialog, useSnackbar, AppSnackbar } from '../design-system';
import type { Column } from '../design-system';
import type { CategoryAdminDto } from '../lib/types';
import ar from '../i18n/ar';

export function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAdminDto | null>(null);
  const [toggling, setToggling] = useState<CategoryAdminDto | null>(null);
  const { snackbar, showSuccess, showError, close } = useSnackbar();
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => api.get<CategoryAdminDto[]>('/api/categories/admin'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/api/categories/${id}/active`, { active }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      showSuccess(vars.active ? 'تم تفعيل الفئة' : 'تم إيقاف الفئة');
    },
    onError: () => showError('فشل تحديث حالة الفئة'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const handleEdit = useCallback((c: CategoryAdminDto) => { setEditing(c); setFormOpen(true); }, []);
  const handleAdd = useCallback(() => { setEditing(null); setFormOpen(true); }, []);
  const handleSaved = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    showSuccess(editing ? 'تم تعديل الفئة' : 'تم إضافة الفئة');
  }, [qc, editing, showSuccess]);
  const handleFormClose = useCallback(() => { setFormOpen(false); setEditing(null); }, []);
  const handleToggle = useCallback(() => {
    if (toggling) toggleMutation.mutate({ id: toggling.id, active: !toggling.active });
    setToggling(null);
  }, [toggling, toggleMutation]);

  const columns: Column<CategoryAdminDto>[] = [
    { key: 'name', header: ar.categories.name, render: (r) => r.name },
    { key: 'parentName', header: ar.categories.parent, render: (r) => r.parentName || '—' },
    { key: 'productCount', header: ar.categories.productCount, render: (r) => r.productCount },
    { key: 'active', header: ar.categories.active, render: (r) => (
      <Chip label={r.active ? ar.products.active : ar.products.inactive} size="small" color={r.active ? 'success' : 'default'} variant="outlined" />
    )},
    { key: 'actions', header: ar.actions, render: (r) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={ar.edit}><IconButton size="small" onClick={() => handleEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title={r.active ? ar.categories.deactivate : ar.categories.activate}>
          <IconButton size="small" onClick={() => setToggling(r)}>
            {r.active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
    ), width: 100 },
  ];

  return (
    <PageLayout
      title={ar.categories.title} subtitle={ar.categories.subtitle}
      actions={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>{ar.categories.addCategory}</Button>}
    >
      <SearchBar value={search} onSearch={setSearch} />
      <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} loading={isLoading} onRowDoubleClick={handleEdit} />
      <CategoryFormDialog open={formOpen} category={editing} categories={categories} onClose={handleFormClose} onSaved={handleSaved} />
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.active ? ar.categories.deactivate : ar.categories.activate}
        message={`${toggling?.active ? 'هل أنت متأكد من إيقاف فئة' : 'هل أنت متأكد من تفعيل فئة'} "${toggling?.name}"؟${toggling && !toggling.active && toggling.productCount > 0 ? ` ${ar.categories.productCountWarning}` : ''}`}
        confirmLabel={toggling?.active ? ar.categories.deactivate : ar.categories.activate}
        onConfirm={handleToggle}
        onCancel={() => setToggling(null)}
        severity={toggling?.active ? 'warning' : 'info'}
      />
      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}
