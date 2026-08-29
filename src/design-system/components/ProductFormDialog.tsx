import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Alert, Typography,
} from '@mui/material';
import { api } from '../../lib/api';
import ar from '../../i18n/ar';
import type { ProductDto, CreateProductCommand, CategoryDto } from '../../lib/types';

interface Props {
  open: boolean;
  product?: ProductDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormDialog({ open, product, onClose, onSaved }: Props) {
  const isEdit = !!product;
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState('');
   const [touched, setTouched] = useState({ name: false, sku: false, categoryId: false });
   const [form, setForm] = useState<CreateProductCommand>({
    sku: '', barcode: '', name: '', description: '', categoryId: '',
    brand: '', size: '', weight: '', fitment: '', material: '',
    unitPrice: 0, costPrice: 0, reorderLevel: 0,
  });

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isDirty = form.name !== (product?.name || '') || form.sku !== (product?.sku || '') || form.categoryId !== (product?.categoryId || '') || form.brand !== (product?.brand || '') || form.unitPrice !== (product?.unitPrice || 0);
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDto[]>('/api/categories'),
  });

  useEffect(() => {
    setError('');
    setTouched({ name: false, sku: false, categoryId: false });
    if (product) {
      setForm({
        sku: product.sku, barcode: product.barcode || '', name: product.name,
        description: product.description || '', categoryId: product.categoryId,
        brand: product.brand || '', size: product.size || '', weight: product.weight || '',
        fitment: product.fitment || '', material: product.material || '',
        unitPrice: product.unitPrice, costPrice: product.costPrice, reorderLevel: product.reorderLevel,
      });
    } else {
      api.get<{ sku: string }>('/api/products/next-sku').then((r) => setForm((f) => ({ ...f, sku: r.sku }))).catch(() => {});
    }
  }, [product, open]);

  const set = (k: keyof CreateProductCommand) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
  };

   const handleSave = async () => {
    setTouched({ name: true, sku: true, categoryId: true });
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId) return;
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/api/products/${product!.id}`, { ...form, active: product!.active });
      } else {
        await api.post('/api/products', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ المنتج');
    }
    finally { setSaving(false); }
   };

  const handleClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };
  return (
    <Dialog open={open} onClose={(_, reason) => { if (reason === 'backdropClick' && isDirty) setConfirmDiscard(true); else handleClose(); }} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? ar.products.editProduct : ar.products.addProduct}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={2}>
            <TextField label={ar.products.productName} value={form.name} onChange={set('name')} onBlur={() => setTouched((t) => ({ ...t, name: true }))} fullWidth required error={touched.name && !form.name.trim()} helperText={touched.name && !form.name.trim() ? 'الاسم مطلوب' : ' '} />
            <TextField label={ar.products.sku} value={form.sku} onChange={set('sku')} onBlur={() => setTouched((t) => ({ ...t, sku: true }))} fullWidth required sx={{ maxWidth: 200 }} error={touched.sku && !form.sku.trim()} helperText={touched.sku && !form.sku.trim() ? 'الرمز مطلوب' : ' '} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label={ar.products.barcode} value={form.barcode} onChange={set('barcode')} fullWidth />
            <TextField label={ar.products.category} value={form.categoryId} onChange={(e) => { setForm((f) => ({ ...f, categoryId: e.target.value })); setError(''); }} onBlur={() => setTouched((t) => ({ ...t, categoryId: true }))} select fullWidth required error={touched.categoryId && !form.categoryId} helperText={touched.categoryId && !form.categoryId ? 'التصنيف مطلوب' : ' '}>
              <MenuItem value="">--</MenuItem>
              {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField label={ar.products.description} value={form.description} onChange={set('description')} fullWidth multiline rows={2} />
          <Stack direction="row" spacing={2}>
            <TextField label={ar.products.brand} value={form.brand} onChange={set('brand')} fullWidth />
            <TextField label={ar.products.size} value={form.size} onChange={set('size')} fullWidth />
            <TextField label={ar.products.weight} value={form.weight} onChange={set('weight')} fullWidth />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label={ar.products.fitment} value={form.fitment} onChange={set('fitment')} fullWidth />
            <TextField label={ar.products.material} value={form.material} onChange={set('material')} fullWidth />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label={ar.products.price} type="number" value={form.unitPrice} onChange={set('unitPrice')} fullWidth />
            <TextField label={ar.products.cost} type="number" value={form.costPrice} onChange={set('costPrice')} fullWidth />
            <TextField label="حد إعادة الطلب" type="number" value={form.reorderLevel} onChange={set('reorderLevel')} fullWidth />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{ar.cancel}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.name.trim() || !form.sku.trim() || !form.categoryId}>{ar.save}</Button>
      </DialogActions>
      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تجاهل التغييرات؟</DialogTitle>
        <DialogContent><Typography variant="body2">لديك تغييرات غير محفوظة. هل تريد تجاهلها؟</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDiscard(false)}>متابعة التعديل</Button><Button onClick={() => { setConfirmDiscard(false); onClose(); }} variant="contained" color="warning">تجاهل</Button></DialogActions>
      </Dialog>
    </Dialog>
  );
}
