import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ message, icon, action }: EmptyStateProps) {
  return (
    <Stack direction="column" alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6 }}>
      <Box sx={{ color: 'text.disabled' }}>
        {icon ?? <InboxIcon sx={{ fontSize: 56 }} />}
      </Box>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
      {action}
    </Stack>
  );
}
