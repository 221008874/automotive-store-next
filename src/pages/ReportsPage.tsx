import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Tabs, Tab, Paper, Typography, Grid2, Card, CardContent, Chip, Tooltip, Stack, Button, IconButton, TextField, MenuItem,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { api } from '../lib/api';
import { PageLayout, DataTable } from '../design-system';
import type { Column } from '../design-system';
import type {
  SalesReportDto, InventoryMovementReportDto, CategoryMarginDto, ProductSalesDto, StockDto,
  SalesByCategoryDto, PurchaseDto,
} from '../lib/types';
import ar from '../i18n/ar';

const tabs = [
  { label: ar.reports.sales, key: 'sales' },
  { label: ar.reports.purchases, key: 'purchases' },
  { label: ar.reports.inventory, key: 'inventory' },
];

type ExportFormatValue = 'CSV' | 'PDF' | 'XLSX';

function ExportGroup({ onExport, disabled }: { onExport: (format: ExportFormatValue) => void; disabled?: boolean }) {
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={`${ar.export} CSV`}><IconButton size="small" disabled={disabled} onClick={() => onExport('CSV')}><TableChartIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title={`${ar.export} Excel`}><IconButton size="small" disabled={disabled} onClick={() => onExport('XLSX')}><FileDownloadIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title={`${ar.export} PDF`}><IconButton size="small" disabled={disabled} onClick={() => onExport('PDF')}><PictureAsPdfIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

function DateRange({ from, to, setFrom, setTo }: {
  from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void;
}) {
  const setPreset = (preset: 'today' | 'yesterday' | '7days' | 'month') => {
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const today = new Date();
    const toStr = fmt(today);
    if (preset === 'today') { setFrom(toStr); setTo(toStr); }
    else if (preset === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); const s = fmt(y); setFrom(s); setTo(s); }
    else if (preset === '7days') { const s = new Date(today); s.setDate(s.getDate() - 6); setFrom(fmt(s)); setTo(toStr); }
    else if (preset === 'month') { const s = new Date(today.getFullYear(), today.getMonth(), 1); setFrom(fmt(s)); setTo(toStr); }
  };
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <TextField label="من تاريخ" type="date" size="small" value={from}
        onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
      <TextField label="إلى تاريخ" type="date" size="small" value={to}
        onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      <Stack direction="row" spacing={0.5}>
        <Chip label="اليوم" size="small" clickable onClick={() => setPreset('today')} variant="outlined" />
        <Chip label="أمس" size="small" clickable onClick={() => setPreset('yesterday')} variant="outlined" />
        <Chip label="7 أيام" size="small" clickable onClick={() => setPreset('7days')} variant="outlined" />
        <Chip label="هذا الشهر" size="small" clickable onClick={() => setPreset('month')} variant="outlined" />
      </Stack>
    </Stack>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <PageLayout
      title={ar.reports.title} subtitle={ar.reports.subtitle}
      actions={
        <Tooltip title="تحديث"><IconButton onClick={refresh}><RefreshIcon /></IconButton></Tooltip>
      }
    >
      <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          {tabs.map((t) => <Tab key={t.key} label={t.label} />)}
        </Tabs>
        <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
          {tab === 0 && <SalesTab refreshKey={refreshKey} />}
          {tab === 1 && <PurchasesTab />}
          {tab === 2 && <InventoryTab refreshKey={refreshKey} />}
        </Box>
      </Paper>
    </PageLayout>
  );
}

function SalesTab({ refreshKey }: { refreshKey: number }) {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rangeParams = (() => {
    const p = new URLSearchParams();
    if (from) p.append('from', from + 'T00:00:00.000Z');
    if (to) p.append('to', to + 'T23:59:59.999Z');
    return p.toString();
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', period, refreshKey, from, to],
    queryFn: () => api.get<SalesReportDto>(`/api/reports/${period === 'daily' ? 'daily' : 'weekly'}-sales${rangeParams ? `?${rangeParams}` : ''}`),
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['report-top-products', refreshKey, from, to],
    queryFn: () => api.get<ProductSalesDto[]>(`/api/reports/sales-by-product${rangeParams ? `?${rangeParams}` : ''}`),
  });

  const { data: byCategory = [] } = useQuery({
    queryKey: ['report-sales-by-category', refreshKey, from, to],
    queryFn: () => api.get<SalesByCategoryDto[]>(`/api/reports/sales-by-category${rangeParams ? `?${rangeParams}` : ''}`),
  });

  const exportSales = (format: ExportFormatValue) => {
    const p = new URLSearchParams({ format });
    if (from) p.append('from', from + 'T00:00:00.000Z');
    if (to) p.append('to', to + 'T23:59:59.999Z');
    api.download(`/api/reports/sales/export?${p.toString()}`).catch(() => {});
  };

  const productColumns: Column<ProductSalesDto>[] = [
    { key: 'name', header: 'المنتج', render: (r) => r.name },
    { key: 'sku', header: 'رمز المنتج', render: (r) => r.sku },
    { key: 'quantity', header: 'الكمية', render: (r) => r.quantity.toString() },
    { key: 'revenue', header: 'الإيراد', render: (r) => `${r.revenue.toLocaleString()} ج.م` },
  ];

  const categoryColumns: Column<SalesByCategoryDto>[] = [
    { key: 'categoryName', header: 'الفئة', render: (r) => r.categoryName },
    { key: 'quantity', header: 'الكمية', render: (r) => r.quantity.toString() },
    { key: 'revenue', header: 'الإيراد', render: (r) => `${r.revenue.toLocaleString()} ج.م` },
    { key: 'share', header: 'النسبة', render: (r) => {
      const total = byCategory.reduce((s, c) => s + c.revenue, 0);
      return total > 0 ? `${((r.revenue / total) * 100).toFixed(1)}%` : '—';
    }},
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1}>
          <Button size="small" variant={period === 'daily' ? 'contained' : 'outlined'} onClick={() => setPeriod('daily')}>{ar.reports.daily}</Button>
          <Button size="small" variant={period === 'weekly' ? 'contained' : 'outlined'} onClick={() => setPeriod('weekly')}>{ar.reports.weekly}</Button>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
          <ExportGroup onExport={exportSales} />
        </Stack>
      </Stack>

      {data && (
        <Grid2 container spacing={2}>
          {[
            { label: 'عدد الفواتير', value: data.saleCount.toString() },
            { label: 'عدد الأصناف', value: data.itemCount.toString() },
            { label: 'الإجمالي', value: `${data.gross.toLocaleString()} ج.م` },
            { label: 'الخصم', value: `${data.discount.toLocaleString()} ج.م` },
            { label: 'المرتجعات', value: `${data.returns.toLocaleString()} ج.م` },
            { label: 'الضريبة', value: `${data.tax.toLocaleString()} ج.م` },
            { label: 'الصافي', value: `${data.net.toLocaleString()} ج.م` },
          ].map(({ label, value }) => (
            <Grid2 key={label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5">{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent></Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      <Typography variant="h6">{ar.topSelling}</Typography>
      <DataTable columns={productColumns} rows={topProducts} getRowId={(r) => r.productId} loading={isLoading} />

      {byCategory.length > 0 && (
        <Box>
          <Typography variant="h6">{ar.salesByCategory}</Typography>
          <DataTable columns={categoryColumns} rows={byCategory} getRowId={(r) => r.categoryId} />
        </Box>
      )}
    </Box>
  );
}

function PurchasesTab() {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['report-purchases'],
    queryFn: () => api.get<PurchaseDto[]>('/api/purchases?limit=200'),
  });

  const totalSpent = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const received = purchases.filter((p) => p.status === 'RECEIVED');
  const pending = purchases.filter((p) => p.status === 'DRAFT' || p.status === 'PARTIAL');
  const overdue = purchases.filter((p) => p.overdue);
  const receivedAmount = received.reduce((s, p) => s + p.totalAmount, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.totalAmount, 0);

  const statusLabels: Record<string, string> = {
    DRAFT: 'مسودة', PARTIAL: 'جزئي', RECEIVED: 'مستلمة', CANCELLED: 'ملغاة',
  };
  const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
    DRAFT: 'default', PARTIAL: 'warning', RECEIVED: 'success', CANCELLED: 'error',
  };

  const columns: Column<PurchaseDto>[] = [
    { key: 'invoiceNo', header: 'رقم الفاتورة', render: (r) => r.invoiceNo || '—' },
    { key: 'supplierName', header: 'المورد', render: (r) => r.supplierName || '—' },
    { key: 'purchaseDate', header: 'التاريخ', render: (r) => new Date(r.purchaseDate).toLocaleDateString('ar-EG') },
    { key: 'status', header: 'الحالة', render: (r) => (
      <Chip label={statusLabels[r.status] || r.status} size="small" color={statusColors[r.status] || 'default'} variant="outlined" />
    )},
    { key: 'overdue', header: 'متأخرة', render: (r) => r.overdue ? <Chip label="متأخرة" size="small" color="error" variant="outlined" /> : '—' },
    { key: 'totalAmount', header: 'الإجمالي', render: (r) => `${r.totalAmount.toLocaleString()} ج.م` },
  ];

  const exportCsv = () => {
    const rows = [
      ['رقم الفاتورة', 'المورد', 'التاريخ', 'الحالة', 'الإجمالي'],
      ...purchases.map((p) => [p.invoiceNo || '', p.supplierName || '', new Date(p.purchaseDate).toLocaleDateString('ar-EG'), statusLabels[p.status] || p.status, String(p.totalAmount)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchases_report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="h6" gutterBottom>{ar.purchasesSummary}</Typography>
        <Button size="small" variant="outlined" startIcon={<TableChartIcon />} onClick={exportCsv} disabled={purchases.length === 0}>
          {ar.export} CSV
        </Button>
      </Stack>

      <Grid2 container spacing={2}>
        {[
          { label: ar.totalSpent, value: `${totalSpent.toLocaleString()} ج.م` },
          { label: 'عدد الأوامر', value: purchases.length.toString() },
          { label: ar.receivedOrders, value: `${receivedAmount.toLocaleString()} ج.م (${received.length})` },
          { label: ar.pendingOrders, value: `${pendingAmount.toLocaleString()} ج.م (${pending.length})` },
          { label: ar.overdue, value: overdue.length.toString() },
        ].map(({ label, value }) => (
          <Grid2 key={label} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6">{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent></Card>
          </Grid2>
        ))}
      </Grid2>

      <DataTable columns={columns} rows={purchases} getRowId={(r) => r.purchaseId} loading={isLoading} enableSorting />
    </Box>
  );
}

function InventoryTab({ refreshKey }: { refreshKey: number }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');

  const rangeParams = (() => {
    const p = new URLSearchParams();
    if (from) p.append('from', from + 'T00:00:00.000Z');
    if (to) p.append('to', to + 'T23:59:59.999Z');
    if (type) p.append('type', type);
    return p.toString();
  })();

  const { data: lowStock = [] } = useQuery({
    queryKey: ['report-low-stock', refreshKey],
    queryFn: () => api.get<StockDto[]>('/api/reports/low-stock'),
  });

  const { data: movements } = useQuery({
    queryKey: ['report-movements', refreshKey, from, to, type],
    queryFn: () => api.get<InventoryMovementReportDto>(`/api/reports/inventory-movement${rangeParams ? `?${rangeParams}` : ''}`),
  });

  const { data: valuation = [] } = useQuery({
    queryKey: ['report-valuation', refreshKey],
    queryFn: () => api.get<StockDto[]>('/api/reports/inventory-valuation'),
  });

  const { data: marginData = [] } = useQuery({
    queryKey: ['report-margin', refreshKey],
    queryFn: () => api.get<CategoryMarginDto[]>('/api/reports/margin-by-category'),
  });

  const exportMovements = (format: ExportFormatValue) => {
    const p = new URLSearchParams({ format });
    if (from) p.append('from', from + 'T00:00:00.000Z');
    if (to) p.append('to', to + 'T23:59:59.999Z');
    if (type) p.append('type', type);
    api.download(`/api/reports/inventory-movement/export?${p.toString()}`).catch(() => {});
  };

  const exportValuation = (format: ExportFormatValue) => {
    api.download(`/api/reports/inventory-valuation/export?format=${format}`).catch(() => {});
  };

  const exportLowStock = (format: ExportFormatValue) => {
    api.download(`/api/reports/low-stock/export?format=${format}`).catch(() => {});
  };

  const totalValue = valuation.reduce((s, r) => s + r.quantityOnHand * r.costPrice, 0);

  const lowStockColumns: Column<StockDto>[] = [
    { key: 'name', header: 'المنتج', render: (r) => r.name },
    { key: 'sku', header: 'رمز المنتج', render: (r) => r.sku },
    { key: 'weight', header: ar.weight, render: (r) => (r.weight ? `${r.weight} كجم` : '—'), sortValue: (r) => r.weight },
    { key: 'quantityOnHand', header: 'الكمية', render: (r) => <Chip label={r.quantityOnHand} color="error" size="small" /> },
    { key: 'reorderLevel', header: 'حد إعادة الطلب', render: (r) => r.reorderLevel.toString() },
  ];

  const valuationColumns: Column<StockDto>[] = [
    { key: 'name', header: 'المنتج', render: (r) => r.name },
    { key: 'sku', header: 'رمز المنتج', render: (r) => r.sku },
    { key: 'weight', header: ar.weight, render: (r) => (r.weight ? `${r.weight} كجم` : '—'), sortValue: (r) => r.weight },
    { key: 'quantityOnHand', header: 'الكمية', render: (r) => r.quantityOnHand.toString() },
    { key: 'costPrice', header: 'التكلفة', render: (r) => `${r.costPrice.toLocaleString()} ج.م` },
    { key: 'lineValue', header: 'القيمة', render: (r) => `${(r.quantityOnHand * r.costPrice).toLocaleString()} ج.م` },
  ];

  const marginColumns: Column<CategoryMarginDto>[] = [
    { key: 'categoryName', header: 'الفئة', render: (r) => r.categoryName },
    { key: 'revenue', header: 'الإيراد', render: (r) => `${r.revenue.toLocaleString()} ج.م` },
    { key: 'cost', header: 'التكلفة', render: (r) => `${r.cost.toLocaleString()} ج.م` },
    { key: 'margin', header: 'الهامش', render: (r) => `${r.margin.toFixed(2)}%` },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <TextField select size="small" label="النوع" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">الكل</MenuItem>
          <MenuItem value="RECEIVE">وارد</MenuItem>
          <MenuItem value="SALE">مبيعات</MenuItem>
          <MenuItem value="RETURN">مرتجع</MenuItem>
          <MenuItem value="ADJUST_IN">تسوية (+)</MenuItem>
          <MenuItem value="ADJUST_OUT">تسوية (-)</MenuItem>
          <MenuItem value="STOCKTAKE">جرد</MenuItem>
          <MenuItem value="ISSUE">صرف</MenuItem>
        </TextField>
        <ExportGroup onExport={exportMovements} />
      </Stack>

      {movements && (
        <Grid2 container spacing={2}>
          {[
            { label: 'إجمالي الوارد', value: movements.totalReceived },
            { label: 'إجمالي المصروف', value: movements.totalSold + movements.totalAdjustedOut },
            { label: 'صافي الحركة', value: movements.netMovement },
          ].map(({ label, value }) => (
            <Grid2 key={label} size={{ xs: 6, sm: 4 }}>
              <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5">{value.toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent></Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" gutterBottom>{ar.reports.lowStock}</Typography>
          <ExportGroup onExport={exportLowStock} />
        </Stack>
        <DataTable columns={lowStockColumns} rows={lowStock} getRowId={(r) => r.productId} />
      </Box>

      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" gutterBottom>{ar.reports.inventoryValuation}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">القيمة الإجمالية: <b>{totalValue.toLocaleString()} ج.م</b></Typography>
            <ExportGroup onExport={exportValuation} />
          </Stack>
        </Stack>
        <DataTable columns={valuationColumns} rows={valuation} getRowId={(r) => r.productId} />
      </Box>

      {marginData.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>الهامش حسب الفئة</Typography>
          <DataTable columns={marginColumns} rows={marginData} getRowId={(r) => r.categoryId} />
        </Box>
      )}
    </Box>
  );
}
