import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Alert,
} from '@mui/material';
import { api } from '../../lib/api';
import ar from '../../i18n/ar';
import type { CategoryAdminDto } from '../../lib/types';

interface Props {
  open: boolean;
  category?: CategoryAdminDto | null;
  categories: CategoryAdminDto[];
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormDialog({ open, category, categories, onClose, onSaved }: Props) {
  const isEdit = !!category;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [touched, setTouched] = useState(false);

  const parentOptions = categories.filter((c) => c.id !== category?.id);

  useEffect(() => {
    if (open) {
      setError('');
      setName(category?.name ?? '');
      setParentId(category?.parentId ?? '');
      setTouched(false);
    }
  }, [open, category]);

   const handleSave = async () => {
    setTouched(true);
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), parentId: parentId || null };
      if (isEdit) {
        await api.put(`/api/categories/${category!.id}`, body);
      } else {
        await api.post('/api/categories', body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ الفئة');
    }
    finally { setSaving(false); }
   };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? ar.categories.editCategory : ar.categories.addCategory}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={ar.categories.name}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onBlur={() => setTouched(true)}
            fullWidth
            required
            error={touched && !name.trim()}
            helperText={touched && !name.trim() ? 'الاسم مطلوب' : ' '}
            autoFocus
          />
          <TextField
            label={ar.categories.parent}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            select
            fullWidth
          >
            <MenuItem value="">{ar.categories.topLevel}</MenuItem>
            {parentOptions.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{ar.cancel}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>{ar.save}</Button>
      </DialogActions>
    </Dialog>
  );
}
