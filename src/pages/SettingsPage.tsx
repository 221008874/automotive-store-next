import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, TextField, Button, Typography, Paper, Stack, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { api } from '../lib/api';
import { PageLayout, useSnackbar, AppSnackbar } from '../design-system';
import type { StoreSettingsDto, TaxSettingsDto } from '../lib/types';
import ar from '../i18n/ar';

export function SettingsPage() {
  const { snackbar, showSuccess, close } = useSnackbar();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ['settings', 'store'],
    queryFn: () => api.get<StoreSettingsDto>('/api/settings/store'),
  });
  const { data: tax } = useQuery({
    queryKey: ['settings', 'tax'],
    queryFn: () => api.get<TaxSettingsDto>('/api/settings/tax'),
  });

  const [storeForm, setStoreForm] = useState<StoreSettingsDto>({ name: '', address: '', phone: '', taxRegistration: '', currency: 'ر.س' });
  const [taxForm, setTaxForm] = useState<TaxSettingsDto>({ rate: 0 });
  const [storeSaving, setStoreSaving] = useState(false);
  const [taxSaving, setTaxSaving] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [taxError, setTaxError] = useState('');

  useEffect(() => {
    if (store) setStoreForm(store);
  }, [store]);
  useEffect(() => {
    if (tax) setTaxForm(tax);
  }, [tax]);

  const saveStore = useMutation({
    mutationFn: (data: StoreSettingsDto) => api.put('/api/settings/store', data),
    onSuccess: () => { showSuccess(ar.settings.saved); qc.invalidateQueries({ queryKey: ['settings', 'store'] }); },
    onError: () => setStoreError(ar.settings.saveError),
    onSettled: () => setStoreSaving(false),
  });

  const saveTax = useMutation({
    mutationFn: (data: TaxSettingsDto) => api.put('/api/settings/tax', data),
    onSuccess: () => { showSuccess(ar.settings.saved); qc.invalidateQueries({ queryKey: ['settings', 'tax'] }); },
    onError: () => setTaxError(ar.settings.saveError),
    onSettled: () => setTaxSaving(false),
  });

  const handleStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStoreError('');
    setStoreSaving(true);
    saveStore.mutate(storeForm);
  };

  const handleTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTaxError('');
    setTaxSaving(true);
    saveTax.mutate(taxForm);
  };

  return (
    <PageLayout title={ar.settings.title} subtitle={ar.settings.subtitle}>
      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{ar.settings.storeInfo}</Typography>
          {storeError && <Alert severity="error" sx={{ mb: 2 }}>{storeError}</Alert>}
          <Box component="form" onSubmit={handleStoreSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label={ar.settings.storeName} value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} fullWidth />
            <TextField label={ar.settings.address} value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} fullWidth />
            <TextField label={ar.settings.phone} value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} fullWidth />
            <TextField label={ar.settings.taxRegistration} value={storeForm.taxRegistration} onChange={(e) => setStoreForm({ ...storeForm, taxRegistration: e.target.value })} fullWidth />
            <TextField label={ar.settings.currency} value={storeForm.currency} onChange={(e) => setStoreForm({ ...storeForm, currency: e.target.value })} fullWidth />
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={storeSaving}>
              {storeSaving ? ar.loading : ar.save}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{ar.settings.taxSettings}</Typography>
          {taxError && <Alert severity="error" sx={{ mb: 2 }}>{taxError}</Alert>}
          <Box component="form" onSubmit={handleTaxSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={ar.settings.taxRate}
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={taxForm.rate}
              onChange={(e) => setTaxForm({ rate: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={taxSaving}>
              {taxSaving ? ar.loading : ar.save}
            </Button>
          </Box>
        </Paper>
      </Stack>
      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}