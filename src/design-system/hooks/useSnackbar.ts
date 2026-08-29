import { useState, useCallback } from 'react';
import type { SnackbarState } from '../components/AppSnackbar';

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });

  const showSuccess = useCallback((message: string) => setSnackbar({ open: true, message, severity: 'success' }), []);
  const showError = useCallback((message: string) => setSnackbar({ open: true, message, severity: 'error' }), []);
  const showWarning = useCallback((message: string) => setSnackbar({ open: true, message, severity: 'warning' }), []);
  const close = useCallback(() => setSnackbar((s) => ({ ...s, open: false })), []);

  return { snackbar, showSuccess, showError, showWarning, close };
}
