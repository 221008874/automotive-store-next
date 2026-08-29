import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Paper, Stack, Typography, Switch, TextField, Alert, FormControlLabel, Chip } from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import SettingsIcon from '@mui/icons-material/Settings';
import { api } from '../lib/api';
import { PageLayout, DataTable, ConfirmDialog, AppSnackbar, useSnackbar } from '../design-system';
import type { Column } from '../design-system';
import type { BackupFileDto, BackupSettingsDto } from '../lib/types';
import ar from '../i18n/ar';

function formatSize(bytes: number): string {
  if (!bytes) return '0';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(epochMs: number): string {
  if (!epochMs) return '-';
  return new Date(epochMs).toLocaleString('ar-EG');
}

const typeLabel: Record<string, { label: string; color: 'info' | 'success' | 'warning' }> = {
  auto: { label: ar.backups.typeAuto, color: 'info' },
  manual: { label: ar.backups.typeManual, color: 'success' },
  'pre-restore': { label: ar.backups.typePreRestore, color: 'warning' },
};

export function BackupPage() {
  const { snackbar, showSuccess, showError, close } = useSnackbar();
  const qc = useQueryClient();
  const [restoring, setRestoring] = useState<BackupFileDto | null>(null);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.get<BackupFileDto[]>('/api/backups'),
  });

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['backups', 'settings'],
    queryFn: () => api.get<BackupSettingsDto>('/api/backups/settings'),
  });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [frequency, setFrequency] = useState<string>('');
  const [hasInitialized, setHasInitialized] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; filePath: string; size: number }>('/api/backups/manual', {}),
    onSuccess: () => {
      showSuccess(ar.backups.backupCreated);
      qc.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (e) => showError(e instanceof Error ? e.message : ar.backups.backupFailed),
  });

  const restoreMutation = useMutation({
    mutationFn: (b: BackupFileDto) => api.post<{ success: boolean; filePath: string; size: number }>('/api/backups/restore', { name: b.name, type: b.type }),
    onSuccess: () => {
      showSuccess(ar.backups.restoreSuccess);
      qc.invalidateQueries();
    },
    onError: (e) => showError(e instanceof Error ? e.message : ar.backups.restoreFailed),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () => api.put<BackupSettingsDto>('/api/backups/settings', {
      autoBackupEnabled: enabled ?? settings?.autoBackupEnabled ?? true,
      frequencyDays: parseInt(frequency, 10) || settings?.frequencyDays || 1,
    }),
    onSuccess: () => {
      showSuccess(ar.backups.settingsSaved);
      refetchSettings();
    },
    onError: (e) => showError(e instanceof Error ? e.message : ar.backups.settingsSaved),
  });

  useEffect(() => {
    if (settings && enabled === null) {
      setEnabled(settings.autoBackupEnabled);
      setFrequency(String(settings.frequencyDays));
      setTimeout(() => setHasInitialized(true), 300);
    }
  }, [settings, enabled]);

  // Autosave when settings change after initial load
  useEffect(() => {
    if (!hasInitialized || enabled === null || !frequency || !settings) return;
    const enabledChanged = enabled !== settings.autoBackupEnabled;
    const freqChanged = parseInt(frequency, 10) !== settings.frequencyDays;
    if (!enabledChanged && !freqChanged) return;
    const t = setTimeout(() => saveSettingsMutation.mutate(), 800);
    return () => clearTimeout(t);
  }, [enabled, frequency, hasInitialized, settings]);

  const columns: Column<BackupFileDto>[] = [
    { key: 'name', header: ar.backups.fileName, render: (r) => r.name },
    { key: 'type', header: ar.backups.typeAuto, render: (r) => {
      const t = typeLabel[r.type] ?? typeLabel.auto;
      return <Chip label={t.label} color={t.color} size="small" variant="outlined" />;
    }, width: 90 },
    { key: 'size', header: ar.backups.size, render: (r) => formatSize(r.size), width: 110 },
    { key: 'modified', header: ar.backups.date, render: (r) => formatDate(r.modified), width: 160 },
    { key: 'actions', header: ar.actions, render: (r) => (
      <Button size="small" startIcon={<RestoreIcon />} variant="outlined" onClick={() => setRestoring(r)} disabled={restoreMutation.isPending}>
        {ar.backups.restore}
      </Button>
    ), width: 110 },
  ];

  return (
    <PageLayout title={ar.backups.title} subtitle={ar.backups.subtitle} actions={
      <Button variant="contained" startIcon={<BackupIcon />} onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
        {createMutation.isPending ? ar.loading : ar.backups.createBackup}
      </Button>
    }>
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">{ar.backups.autoBackup}</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControlLabel
              control={<Switch checked={enabled ?? true} onChange={(e) => setEnabled(e.target.checked)} />}
              label={ar.backups.autoBackupEnabled}
            />
            <TextField
              label={ar.backups.frequencyDays}
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              sx={{ width: 180 }}
            />
            <Button variant="outlined" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
              {saveSettingsMutation.isPending ? ar.loading : ar.save}
            </Button>
            {settings && (
              <Chip
                label={`${ar.backups.lastBackup}: ${backups.length ? formatDate(Math.max(...backups.map((b) => b.modified))) : ar.backups.noBackups}`}
                color="info" variant="outlined"
              />
            )}
          </Stack>
        </Paper>
        <DataTable
          columns={columns}
          rows={backups}
          getRowId={(r) => `${r.type}:${r.name}`}
          loading={isLoading}
          emptyMessage={ar.backups.noBackups}
          enableSorting
          defaultSortKey="modified"
          defaultSortAsc={false}
        />
      </Stack>
      <ConfirmDialog
        open={!!restoring}
        title={ar.backups.restore}
        message={`${ar.backups.restoreConfirm}\n${ar.backups.restoreWarning}`}
        confirmLabel={restoreMutation.isPending ? ar.loading : ar.backups.restore}
        onConfirm={() => { if (restoring) { restoreMutation.mutate(restoring); setRestoring(null); } }}
        onCancel={() => setRestoring(null)}
        severity="warning"
      />
      {restoreMutation.isPending && (
        <Alert severity="info" sx={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          {ar.backups.restoring}
        </Alert>
      )}
      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}
