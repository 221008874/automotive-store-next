import { Chip } from '@mui/material';

interface StatusChipProps {
  label: string;
  color?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary' | 'secondary';
}

export function StatusChip({ label, color = 'default' }: StatusChipProps) {
  return <Chip label={label} color={color} size="small" />;
}
