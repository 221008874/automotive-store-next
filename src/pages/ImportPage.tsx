import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button, Stack, Typography, Chip, Box, TextField, MenuItem, Alert, List, ListItem, ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { api } from '../lib/api';
import { PageLayout, DataTable, useSnackbar, AppSnackbar } from '../design-system';
import type { Column } from '../design-system';
import type { ApiErrorDto, ImportFormatDto, ImportResultDto, ImportRowDto } from '../lib/types';
import ar from '../i18n/ar';

export function ImportPage() {
  const [format, setFormat] = useState(() => localStorage.getItem('import_format') || 'csv');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { snackbar, showSuccess, showError, close } = useSnackbar();

  const { data: formats = [] } = useQuery({
    queryKey: ['import', 'formats'],
    queryFn: () => api.get<ImportFormatDto[]>('/api/import/formats'),
  });

  const handleFormatChange = (v: string) => { setFormat(v); localStorage.setItem('import_format', v); };

  const downloadTemplate = () => {
    const headers = ['sku', 'barcode', 'name', 'category', 'brand', 'size', 'weight', 'fitment', 'material', 'unitPrice', 'costPrice', 'reorderLevel', 'quantityOnHand'];
    const csv = headers.join(',') + '\r\n' + 'PRD-000001,BC001,فلتر زيت,فرامل,ACDelco,M,0.5kg,عام,معدن,120,80,5,10\r\n';
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${format}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const mutation = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('format', format);
      return api.upload<ImportResultDto>('/api/import/upload', fd);
    },
    onSuccess: (result) => {
      if (result.hasErrors) showError(ar.import.importError);
      else showSuccess(ar.import.noErrors);
    },
    onError: (e: unknown) => {
      try {
        const parsed = JSON.parse((e as Error).message) as ApiErrorDto;
        showError(parsed.error || ar.import.importError);
      } catch {
        showError(ar.import.importError);
      }
    },
  });

  const result = mutation.data;

  const previewColumns: Column<ImportRowDto>[] = [
    { key: 'rowIndex', header: ar.import.row, render: (r) => r.rowIndex, width: 80 },
    {
      key: 'values', header: ar.import.preview, render: (r) => (
        <Typography variant="body2">
          {Object.entries(r.values).map(([k, v]) => `${k}: ${v}`).join(' · ')}
        </Typography>
      ),
    },
    { key: 'error', header: ar.import.errors, render: (r) => (
      r.hasError ? <Typography variant="body2" color="error">{r.error}</Typography> : '—'
    ), width: 260 },
  ];

  return (
    <PageLayout title={ar.import.title} subtitle={ar.import.subtitle}>
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          mb: 2,
          textAlign: 'center',
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
      >
        <InsertDriveFileIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">اسحب الملف هنا أو اضغط للاختيار</Typography>
        <Typography variant="caption" color="text.disabled">CSV أو Excel</Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <TextField
          select
          label={ar.import.format}
          value={format}
          onChange={(e) => handleFormatChange(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          {formats.map((f) => (
            <MenuItem key={f.extension} value={f.extension}>{f.name}</MenuItem>
          ))}
        </TextField>

        <Box>
          <input
            ref={inputRef}
            type="file"
            accept={format === 'csv' ? '.csv,text/csv' : '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="outlined"
            startIcon={<InsertDriveFileIcon />}
            onClick={() => inputRef.current?.click()}
          >
            {ar.import.browse}
          </Button>
        </Box>

        {file && (
          <Chip
            icon={<InsertDriveFileIcon />}
            label={file.name}
            onDelete={() => setFile(null)}
            variant="outlined"
          />
        )}

        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          disabled={!file || mutation.isPending}
          onClick={() => file && mutation.mutate(file)}
        >
          {ar.import.importButton}
        </Button>
        <Button variant="outlined" size="small" onClick={downloadTemplate}>تحميل القالب</Button>
      </Stack>

      {result && (
        <Stack spacing={2} sx={{ mt: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${ar.import.totalRows}: ${result.totalRows}`} color="default" variant="outlined" />
            <Chip label={`${ar.import.succeeded}: ${result.succeeded}`} color="success" variant="outlined" />
            <Chip label={`${ar.import.failed}: ${result.failed}`} color="error" variant="outlined" />
          </Stack>

          {result.errors.length > 0 && (
            <Alert severity="error">
              <List dense disablePadding>
                {result.errors.map((e, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                    <ListItemText primary={<Typography variant="body2">{e}</Typography>} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {result.rows.length > 0 && (
            <DataTable
              columns={previewColumns}
              rows={result.rows}
              getRowId={(r) => r.rowIndex}
              defaultRowsPerPage={10}
            />
          )}
        </Stack>
      )}

      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}
