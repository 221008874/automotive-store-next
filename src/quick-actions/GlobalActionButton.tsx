import { useCallback, useState } from 'react';
import { SpeedDial, SpeedDialAction, useMediaQuery, useTheme } from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TuneIcon from '@mui/icons-material/Tune';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useQuickActions } from './QuickActionsProvider';
import { ProductFormDialog } from '../design-system/components/ProductFormDialog';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductDto } from '../lib/types';

export function GlobalActionButton() {
  const qa = useQuickActions();
  const qc = useQueryClient();
  const [fabOpen, setFabOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('md'));

  const handleSaved = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['products'] });
    setFormOpen(false); setEditing(null);
  }, [qc]);

  const actions = [
    { icon: <AddBoxIcon />, name: 'إضافة منتج', onClick: () => { setEditing(null); setFormOpen(true); } },
    { icon: <TrendingUpIcon />, name: 'استلام مخزون', onClick: () => qa.receive() },
    { icon: <TrendingDownIcon />, name: 'صرف مخزون', onClick: () => qa.issue() },
    { icon: <TuneIcon />, name: 'تسوية مخزون', onClick: () => qa.adjust() },
    { icon: <FactCheckIcon />, name: 'جرد', onClick: () => qa.stocktake() },
  ];

  return (
    <>
      <SpeedDial
        ariaLabel="إجراء سريع"
        open={fabOpen}
        onOpen={() => setFabOpen(true)}
        onClose={() => setFabOpen(false)}
        FabProps={{ color: 'primary' }}
        sx={{ position: 'fixed', bottom: 20, ...(theme.direction === 'rtl' ? { left: 20 } : { right: 20 }) }}
      >
        {actions.map((a) => (
          <SpeedDialAction key={a.name} icon={a.icon} tooltipTitle={a.name} onClick={() => { setFabOpen(false); a.onClick(); }} />
        ))}
      </SpeedDial>
      <ProductFormDialog open={formOpen} product={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={handleSaved} />
    </>
  );
}
