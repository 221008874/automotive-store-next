import type { ReactNode } from 'react';
import { Badge, Box, Button, IconButton, Popover, Stack, Tooltip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { SearchBar } from './SearchBar';
import ar from '../../i18n/ar';
import { useState } from 'react';

interface FilterBarProps {
  search?: { value: string; onSearch: (v: string) => void; placeholder?: string };
  search2?: { value: string; onSearch: (v: string) => void; placeholder?: string };
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
}

/**
 * Compact filter UI: one or two quick search fields (optional) plus a filter
 * button that shows the number of active filters. Clicking the button opens a
 * popover with the filter fields instead of pushing content down the page.
 */
export function FilterBar({ search, search2, activeCount, onClear, children }: FilterBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        {search && (
          <Box sx={{ flex: 1 }}>
            <SearchBar value={search.value} onSearch={search.onSearch} placeholder={search.placeholder} />
          </Box>
        )}
        {search2 && (
          <Box sx={{ flex: 1 }}>
            <SearchBar value={search2.value} onSearch={search2.onSearch} placeholder={search2.placeholder} />
          </Box>
        )}
        <Tooltip title={ar.filters}>
          <IconButton
            size="small"
            color={activeCount > 0 || open ? 'primary' : 'default'}
            onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
            aria-label={ar.filters}
          >
            <Badge badgeContent={activeCount} color="error" overlap="circular">
              <FilterListIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        {activeCount > 0 && (
          <Tooltip title={ar.clear}>
            <Button size="small" startIcon={<ClearAllIcon />} onClick={onClear}>
              {ar.clear}
            </Button>
          </Tooltip>
        )}
      </Stack>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, width: 720, maxWidth: 'calc(100vw - 24px)', maxHeight: '70vh', overflow: 'auto' } } }}
      >
        {children}
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
          <Button size="small" onClick={onClear}>{ar.clear}</Button>
        </Stack>
      </Popover>
    </>
  );
}
