import type { ReactNode } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Typography, Box, Stack, Skeleton, IconButton,
  Menu, MenuItem, Checkbox, ListItemText, Tooltip, TableSortLabel, Alert, Button,
} from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { EmptyState } from './EmptyState';
import ar from '../../i18n/ar';

export interface Column<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  sortValue?: (row: Row) => string | number;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: Row) => void;
  onRowDoubleClick?: (row: Row) => void;
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  enableColumnToggle?: boolean;
  enableSorting?: boolean;
  defaultSortKey?: string;
  defaultSortAsc?: boolean;
  /** Enable row checkboxes (bulk selection). Parent owns the Set of selected ids. */
  selectable?: boolean;
  selected?: Set<string | number>;
  onSelectionChange?: (selected: Set<string | number>) => void;
}

export function DataTable<Row>({
  columns, rows, getRowId, loading, emptyMessage = ar.noRecords, error, onRetry,
  onRowClick, onRowDoubleClick, defaultRowsPerPage = 25, rowsPerPageOptions = [10, 25, 50, 100],
  enableColumnToggle = false, enableSorting = false,
  defaultSortKey, defaultSortAsc = true,
  selectable = false, selected, onSelectionChange,
}: DataTableProps<Row>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colMenu, setColMenu] = useState<HTMLElement | null>(null);
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortAsc, setSortAsc] = useState(defaultSortAsc);

  // Reset page when rows shrink (filter) to avoid ghost empty page
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [rows.length, rowsPerPage, page]);

  // Clamp page when rowsPerPage changes
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1)));
  }, [rowsPerPage, rows.length]);

  const visibleColumns = enableColumnToggle
    ? columns.filter((col) => !hidden.has(col.key))
    : columns;

  const toggleColumn = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (columns.length - next.size <= 1) {
        return prev;
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSort = (col: Column<Row>) => {
    if (!enableSorting) return;
    setPage(0);
    if (sortKey === col.key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(col.key);
      setSortAsc(true);
    }
  };

  const sortedRows = useMemo(() => {
    if (!enableSorting || !sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const valueOf = col.sortValue ?? ((r: Row) => {
      const v = (r as Record<string, unknown>)[col.key];
      return typeof v === 'string' || typeof v === 'number' ? v : '';
    });
    return [...rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (typeof va === 'string' && typeof vb === 'string') {
        const cmp = va.localeCompare(vb, 'ar');
        return sortAsc ? cmp : -cmp;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, enableSorting, sortKey, sortAsc, columns]);

  const visibleRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const skeletonRows = Math.min(rowsPerPage, 8);

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selected?.has(getRowId(r)));
  const someVisibleSelected = visibleRows.some((r) => selected?.has(getRowId(r)));

  const toggleOne = (id: string | number) => {
    if (!onSelectionChange || !selected) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const toggleVisibleAll = () => {
    if (!onSelectionChange || !selected) return;
    const next = new Set(selected);
    visibleRows.forEach((r) => {
      const id = getRowId(r);
      if (allVisibleSelected) next.delete(id); else next.add(id);
    });
    onSelectionChange(next);
  };

  return (
    <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {enableColumnToggle && (
        <Stack direction="row" justifyContent="flex-end" alignItems="center" px={1} pt={0.5}>
          <Tooltip title={ar.columns}>
            <IconButton size="small" onClick={(e) => setColMenu(e.currentTarget)}>
              <ViewColumnIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={colMenu} open={!!colMenu} onClose={() => setColMenu(null)}>
            {columns.map((col) => (
              <MenuItem key={col.key} onClick={() => toggleColumn(col.key)}>
                <Checkbox checked={!hidden.has(col.key)} size="small" />
                <ListItemText>{col.header}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      )}
      <TableContainer sx={{ flex: 1 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell align="center" sx={{ width: 48, p: 0 }}>
                  <Checkbox
                    size="small"
                    checked={allVisibleSelected}
                    indeterminate={!allVisibleSelected && someVisibleSelected}
                    onClick={toggleVisibleAll}
                    inputProps={{ 'aria-label': 'تحديد الكل' }}
                  />
                </TableCell>
              )}
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'right'}
                  sortDirection={enableSorting && sortKey === col.key ? (sortAsc ? 'asc' : 'desc') : false}
                  sx={{ width: col.width }}
                >
                  {enableSorting ? (
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? (sortAsc ? 'asc' : 'desc') : 'asc'}
                      onClick={() => toggleSort(col)}
                      sx={{ flexDirection: col.align === 'left' ? 'row' : 'row-reverse' }}
                    >
                      {col.header}
                    </TableSortLabel>
                  ) : (
                    <Box>{col.header}</Box>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'right'}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0)} align="center">
                  <Alert severity="error" action={onRetry ? <Button size="small" onClick={onRetry}>إعادة المحاولة</Button> : undefined} sx={{ justifyContent: 'center' }}>{error}</Alert>
                </TableCell>
              </TableRow>
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0)} align="center">
                  <EmptyState message={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  hover={!!(onRowClick || onRowDoubleClick)}
                  onClick={() => onRowClick?.(row)}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  sx={{ cursor: (onRowClick || onRowDoubleClick) ? 'pointer' : 'default' }}
                >
                  {selectable && (
                    <TableCell align="center" sx={{ p: 0 }}>
                      <Checkbox
                        size="small"
                        checked={!!selected?.has(getRowId(row))}
                        onClick={(e) => { e.stopPropagation(); toggleOne(getRowId(row)); }}
                        inputProps={{ 'aria-label': 'تحديد' }}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'right'}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {!loading && rows.length > 0 && (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2, borderTop: 1, borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {`${ar.total} ${rows.length} ${ar.records}`}
          </Typography>
          {rows.length > rowsPerPage && (
            <TablePagination
              component="div"
              count={rows.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={rowsPerPageOptions}
              labelRowsPerPage="صفوف"
              labelDisplayedRows={({ from, to, count }) =>
                `${ar.showing} ${from}–${to} ${ar.of} ${count}`
              }
            />
          )}
        </Box>
      )}
    </Paper>
  );
}
