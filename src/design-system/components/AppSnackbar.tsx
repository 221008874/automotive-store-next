import { Snackbar, Alert } from '@mui/material';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

interface AppSnackbarProps {
  state: SnackbarState;
  onClose: () => void;
}

export function AppSnackbar({ state, onClose }: AppSnackbarProps) {
  return (
    <Snackbar open={state.open} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert onClose={onClose} severity={state.severity} variant="filled">
        {state.message}
      </Alert>
    </Snackbar>
  );
}
