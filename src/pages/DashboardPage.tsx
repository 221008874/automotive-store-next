import { useQuery } from '@tanstack/react-query';
import { Paper, Typography, Grid2, Skeleton, Box, List, ListItem, ListItemText, IconButton, Button, Chip, Stack } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { PageLayout } from '../design-system';
import { useQuickActions } from '../quick-actions/QuickActionsProvider';
import type { StockDto } from '../lib/types';
import ar from '../i18n/ar';

interface DashboardStats {
  todaySaleCount: number;
  todayRevenue: number;
  lowStockCount: number;
  averageOrderValue: number;
  openPurchaseDrafts: number;
}

interface KpiCard {
  label: string;
  value: string;
  color: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const qa = useQuickActions();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
  });
  const { data: lowStock = [] } = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: () => api.get<StockDto[]>('/api/inventory/stock?lowStockOnly=true&sortField=name&sortAsc=true'),
  });

  if (isLoading) {
    return (
      <PageLayout title={ar.dashboard.title}>
        <Grid2 container spacing={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Grid2 key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper sx={{ p: 3 }}>
                <Skeleton variant="text" width="55%" />
                <Skeleton variant="text" width="40%" height={48} />
              </Paper>
            </Grid2>
          ))}
        </Grid2>
      </PageLayout>
    );
  }

  const cards: (KpiCard & { onClick?: () => void })[] = data ? [
    { label: ar.dashboard.todaySaleCount, value: String(data.todaySaleCount), color: '#1976D2', onClick: () => navigate('/reports') },
    { label: ar.dashboard.todayRevenue, value: `${data.todayRevenue.toLocaleString()} ج.م`, color: '#2E7D32', onClick: () => navigate('/reports') },
    { label: ar.dashboard.lowStock, value: String(data.lowStockCount), color: '#ED6C02', onClick: () => navigate('/inventory') },
    { label: ar.dashboard.averageOrderValue, value: `${data.averageOrderValue.toLocaleString()} ج.م`, color: '#0288D1', onClick: () => navigate('/reports') },
    { label: ar.dashboard.openPurchaseDrafts, value: String(data.openPurchaseDrafts), color: '#D32F2F', onClick: () => navigate('/reports') },
  ] : [];

  return (
    <PageLayout title={ar.dashboard.title}>
      <Grid2 container spacing={2}>
        {cards.map((card) => (
          <Grid2 key={card.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper
              onClick={card.onClick}
              sx={{
                p: 3,
                borderInlineStart: `4px solid ${card.color}`,
                cursor: card.onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': card.onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {},
              }}
            >
              <Typography variant="body2" color="text.secondary">{card.label}</Typography>
              <Typography variant="h4" sx={{ mt: 0.5 }}>{card.value}</Typography>
              {card.onClick && <Box sx={{ mt: 1, fontSize: '0.75rem', color: 'text.disabled' }}>اضغط للعرض</Box>}
            </Paper>
          </Grid2>
        ))}

        <Grid2 size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InventoryIcon color="warning" />
                <Typography variant="h6">منتجات منخفضة المخزون</Typography>
                <Chip label={lowStock.length} size="small" color="warning" variant="outlined" />
              </Stack>
              <Button size="small" variant="text" onClick={() => navigate('/inventory')}>عرض الكل</Button>
            </Stack>
            {lowStock.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد منتجات منخفضة المخزون — كل شيء متوفر.</Typography>
            ) : (
              <List dense disablePadding>
                {lowStock.slice(0, 10).map((p) => (
                  <ListItem
                    key={p.productId}
                    divider
                    secondaryAction={
                      <IconButton
                        color="success"
                        size="small"
                        title="استلام"
                        onClick={() => qa.receive({ id: p.productId, name: p.name, sku: p.sku, quantityOnHand: p.quantityOnHand })}
                      >
                        <AddShoppingCartIcon />
                      </IconButton>
                    }
                    sx={{ cursor: 'pointer' }}
                    onClick={() => qa.viewDetails({ id: p.productId, name: p.name, sku: p.sku, quantityOnHand: p.quantityOnHand })}
                  >
                    <ListItemText
                      primary={p.name}
                      secondary={`${p.sku} ${p.categoryName ? ` • ${p.categoryName}` : ''}`}
                      slotProps={{ secondary: { color: 'text.secondary' } }}
                    />
                    <Box sx={{ mr: 6, textAlign: 'end' }}>
                      <Typography variant="body2" color="error" fontWeight={600} component="span">المتاح: {p.quantityOnHand}</Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid2>
      </Grid2>
    </PageLayout>
  );
}
