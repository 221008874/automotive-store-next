import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Stack, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab, Typography, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, Grid2, Paper, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { api } from '../lib/api';
import { PageLayout, DataTable, FilterBar, useSnackbar, AppSnackbar } from '../design-system';
import type { Column } from '../design-system';
import type { StockDto, InventoryTransactionDto, CategoryDto } from '../lib/types';
import ar from '../i18n/ar';

const movementTypes = ['RECEIVE', 'ISSUE', 'ADJUST_IN', 'ADJUST_OUT', 'STOCKTAKE'] as const;

export function InventoryPage() {
  const [tab, setTab] = useState(0);
  const [dialog, setDialog] = useState<{ type: typeof movementTypes[number]; product?: StockDto } | null>(null);
  const [movementView, setMovementView] = useState<{ productId: string; productName: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [weightFilter, setWeightFilter] = useState<string>('');
  const [minPriceFilter, setMinPriceFilter] = useState<number>(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(0);
  const [inStockFilter, setInStockFilter] = useState<boolean>(false);
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<boolean>(true);
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [barcodeSearch, setBarcodeSearch] = useState<string>('');
  const { snackbar, showSuccess, showError, close } = useSnackbar();
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDto[]>('/api/categories'),
  });

  const resetFilters = () => {
    setCategoryFilter('');
    setBrandFilter('');
    setSizeFilter('');
    setWeightFilter('');
    setMinPriceFilter(0);
    setMaxPriceFilter(0);
    setInStockFilter(false);
    setLowStockFilter(false);
    setActiveOnlyFilter(true);
    setSortField('name');
    setSortAsc(true);
    setFromDate('');
    setToDate('');
    setTypeFilter('');
  };

  const activeCount = [
    categoryFilter, brandFilter, sizeFilter, weightFilter,
    minPriceFilter > 0, maxPriceFilter > 0, inStockFilter, lowStockFilter, !activeOnlyFilter,
    fromDate, toDate, typeFilter,
  ].filter(Boolean).length;

  const handleAction = (t: typeof movementTypes[number], p?: StockDto) => { setDialog({ type: t, product: p }); };

  const handleMovementSaved = () => {
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['movements'] });
    showSuccess('تم حفظ الحركة');
    setDialog(null);
  };

  // Hotkeys: F2 صرف سريع، F3 استلام، / بحث
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const isInput = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (isInput) return;
      if (e.key === 'F2') { e.preventDefault(); setDialog({ type: 'ISSUE' }); }
      if (e.key === 'F3') { e.preventDefault(); setDialog({ type: 'RECEIVE' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleMovementError = (msg: string) => { showError(msg); };

  return (
    <PageLayout title={ar.inventory.title} subtitle={ar.inventory.subtitle}>
      <Box sx={{ mb: 2 }}>
        <FilterBar
          search={{ value: searchTerm, onSearch: setSearchTerm, placeholder: 'بحث في المخزون...' }}
          search2={{ value: barcodeSearch, onSearch: setBarcodeSearch, placeholder: 'بحث بالباركود...' }}
          activeCount={activeCount}
          onClear={resetFilters}
        >
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{ar.products.category}</InputLabel>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label={ar.products.category}>
                  <MenuItem value="">الكل</MenuItem>
                  {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="العلامة التجارية" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="الحجم" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="الوزن (كجم)" type="number" value={weightFilter} onChange={(e) => setWeightFilter(e.target.value)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="سعر البيع الأدنى" type="number" value={minPriceFilter} onChange={(e) => setMinPriceFilter(Number(e.target.value) || 0)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="سعر البيع الأقصى" type="number" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(Number(e.target.value) || 0)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>حالة المخزون</InputLabel>
                <Select value={inStockFilter ? 'inStock' : 'all'} onChange={(e) => setInStockFilter(e.target.value === 'inStock')} label="حالة المخزون">
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="inStock">في المخزون</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>منخفض</InputLabel>
                <Select value={lowStockFilter ? 'low' : 'all'} onChange={(e) => setLowStockFilter(e.target.value === 'low')} label="منخفض">
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="low">منخفض فقط</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select value={activeOnlyFilter ? 'active' : 'all'} onChange={(e) => setActiveOnlyFilter(e.target.value === 'active')} label="الحالة">
                  <MenuItem value="active">نشط فقط</MenuItem>
                  <MenuItem value="all">الكل</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الترتيب حسب</InputLabel>
                <Select value={sortField} onChange={(e) => setSortField(e.target.value)} label="الترتيب حسب">
                  <MenuItem value="name">الاسم</MenuItem>
                  <MenuItem value="sku">الرمز</MenuItem>
                  <MenuItem value="price">السعر</MenuItem>
                  <MenuItem value="quantityOnHand">الكمية</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>الاتجاه</InputLabel>
                <Select value={sortAsc ? 'asc' : 'desc'} onChange={(e) => setSortAsc(e.target.value === 'asc')} label="الاتجاه">
                  <MenuItem value="asc">تصاعدي</MenuItem>
                  <MenuItem value="desc">تنازلي</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            {tab === 1 && (
              <>
                <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="من تاريخ" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="إلى تاريخ" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>النوع</InputLabel>
                    <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="النوع">
                      <MenuItem value="">الكل</MenuItem>
                      <MenuItem value="RECEIVE">وارد</MenuItem>
                      <MenuItem value="ISSUE">صرف</MenuItem>
                      <MenuItem value="ADJUST_IN">تسوية (+)</MenuItem>
                      <MenuItem value="ADJUST_OUT">تسوية (-)</MenuItem>
                      <MenuItem value="STOCKTAKE">جرد</MenuItem>
                      <MenuItem value="SALE">مبيعات</MenuItem>
                      <MenuItem value="RETURN">مرتجع</MenuItem>
                    </Select>
                  </FormControl>
                </Grid2>
              </>
            )}
          </Grid2>
        </FilterBar>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="المخزون" />
        <Tab label="حركات المخزون" />
      </Tabs>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2, mt: 2 }}>
        {tab === 0 ? (
          <StockTab
            onAction={handleAction}
            onViewMovements={(id, name) => setMovementView({ productId: id, productName: name })}
            searchTerm={searchTerm}
            barcodeSearch={barcodeSearch}
            categoryFilter={categoryFilter}
            brandFilter={brandFilter}
            sizeFilter={sizeFilter}
            weightFilter={weightFilter}
            minPriceFilter={minPriceFilter}
            maxPriceFilter={maxPriceFilter}
            inStockFilter={inStockFilter}
            lowStockFilter={lowStockFilter}
            activeOnlyFilter={activeOnlyFilter}
            sortField={sortField}
            sortAsc={sortAsc}
          />
        ) : (
          <MovementsTab
            productId={movementView?.productId}
            productName={movementView?.productName}
            onBack={() => setMovementView(null)}
            fromDate={fromDate}
            toDate={toDate}
            typeFilter={typeFilter}
          />
        )}
      </Box>
      <MovementDialog dialog={dialog} onClose={() => setDialog(null)} onSaved={handleMovementSaved} onError={handleMovementError} />
      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}

function StockTab({ 
  onAction, 
  onViewMovements, 
  searchTerm,
  barcodeSearch,
  categoryFilter,
  brandFilter,
  sizeFilter,
  weightFilter,
  minPriceFilter,
  maxPriceFilter,
  inStockFilter,
  lowStockFilter,
  activeOnlyFilter,
  sortField,
  sortAsc
}: {
  onAction: (type: typeof movementTypes[number], product?: StockDto) => void;
  onViewMovements: (id: string, name: string) => void;
  searchTerm: string;
  barcodeSearch: string;
  categoryFilter: string;
  brandFilter: string;
  sizeFilter: string;
  weightFilter: string;
  minPriceFilter: number;
  maxPriceFilter: number;
  inStockFilter: boolean;
  lowStockFilter: boolean;
  activeOnlyFilter: boolean;
  sortField: string;
  sortAsc: boolean;
}) {
  const qc = useQueryClient();
  const { snackbar: stockSnackbar, showSuccess: showStockSuccess, showError: showStockError, close: closeStockSnackbar } = useSnackbar();
  const quickAdjust = async (product: StockDto, delta: number) => {
    try {
      await api.post('/api/inventory/adjust', { productId: product.productId, quantity: delta, reason: delta > 0 ? 'تعديل سريع +1' : 'تعديل سريع -1' });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      showStockSuccess(delta > 0 ? 'تمت الإضافة' : 'تم الخصم');
    } catch (e) {
      showStockError(e instanceof Error ? e.message : 'فشل التعديل السريع');
    }
  };
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAdjustDelta, setBulkAdjustDelta] = useState(0);
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);
  const bulkIds = Array.from(bulkSelected);

  const bulkStocktakeMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(async (productId) => {
      const row = items.find((x) => x.productId === productId);
      if (!row) return;
      await api.post('/api/inventory/stocktake', { productId, countedQuantity: row.quantityOnHand, reason: 'جرد مجمع (تطابق)' });
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      showStockSuccess(`تم جرد ${bulkIds.length} منتج (تطابق)`);
      setBulkSelected(new Set());
    },
    onError: (e: unknown) => showStockError(e instanceof Error ? e.message : 'فشل الجرد المجمع'),
  });

  const bulkAdjustMutation = useMutation({
    mutationFn: ({ ids, delta }: { ids: string[]; delta: number }) => Promise.all(ids.map(async (productId) => {
      await api.post('/api/inventory/adjust', { productId, quantity: delta, reason: `تسوية مجمعة ${delta > 0 ? '+' : ''}${delta}` });
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      showStockSuccess(`تمت تسوية ${bulkIds.length} منتج بـ ${bulkAdjustDelta > 0 ? '+' : ''}${bulkAdjustDelta}`);
      setBulkSelected(new Set()); setBulkAdjustOpen(false); setBulkAdjustDelta(0);
    },
    onError: (e: unknown) => { showStockError(e instanceof Error ? e.message : 'فشل التسوية المجمعة'); setBulkAdjustOpen(false); },
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', searchTerm, barcodeSearch, categoryFilter, brandFilter, sizeFilter, weightFilter, minPriceFilter, maxPriceFilter, inStockFilter, lowStockFilter, activeOnlyFilter, sortField, sortAsc],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('term', searchTerm);
      if (barcodeSearch) params.append('barcode', barcodeSearch);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (brandFilter) params.append('brand', brandFilter);
      if (sizeFilter) params.append('size', sizeFilter);
      if (weightFilter) params.append('weight', weightFilter);
      if (minPriceFilter > 0) params.append('minPrice', minPriceFilter.toString());
      if (maxPriceFilter > 0) params.append('maxPrice', maxPriceFilter.toString());
      if (inStockFilter) params.append('inStockOnly', 'true');
      if (lowStockFilter) params.append('lowStockOnly', 'true');
      if (!activeOnlyFilter) params.append('activeOnly', 'false');
      params.append('sortField', sortField);
      params.append('sortAsc', sortAsc.toString());
      const queryString = params.toString();
      return api.get<StockDto[]>(`/api/inventory/stock?${queryString}`);
    },
  });

  const columns: Column<StockDto>[] = [
    { key: 'name', header: 'المنتج', render: (r) => r.name },
    { key: 'sku', header: 'رمز المنتج', render: (r) => r.sku },
    { key: 'categoryName', header: 'الفئة', render: (r) => r.categoryName || '—' },
    { key: 'weight', header: ar.weight, render: (r) => (r.weight ? `${r.weight} كجم` : '—'), sortValue: (r) => r.weight },
    { key: 'quantityOnHand', header: 'الكمية', render: (r) => (
      <Chip 
        label={r.quantityOnHand} 
        size="small" 
        color={r.lowStock ? 'error' : r.quantityOnHand === 0 ? 'default' : 'success'} 
        variant="outlined" 
      />
    )},
    { key: 'unitPrice', header: 'سعر البيع', render: (r) => `${r.unitPrice.toLocaleString()} ج.م` },
    { key: 'costPrice', header: 'التكلفة', render: (r) => `${r.costPrice.toLocaleString()} ج.م` },
    { key: 'totalValue', header: 'إجمالي القيمة', render: (r) => {
      const totalValue = r.quantityOnHand * r.costPrice;
      return <Typography variant="body2" color="success.main">{(totalValue || 0).toLocaleString()} ج.م</Typography>;
    }},
    { key: 'actions', header: 'إجراءات', render: (r) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="-1"><span><IconButton size="small" onClick={() => quickAdjust(r, -1)}><RemoveIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="+1"><IconButton size="small" color="success" onClick={() => quickAdjust(r, 1)}><AddIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="صرف"><IconButton size="small" color="warning" onClick={() => onAction('ISSUE', r)}><ClearIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="تسوية"><IconButton size="small" onClick={() => onAction('ADJUST_IN', r)}><TuneIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="جرد"><IconButton size="small" color="secondary" onClick={() => onAction('STOCKTAKE', r)}><FactCheckIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="السجل"><IconButton size="small" onClick={() => onViewMovements(r.productId, r.name)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    ), width: 200 },
  ];

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => onAction('RECEIVE')}>إضافة للمخزون</Button>
        <Button size="small" variant="outlined" color="warning" onClick={() => onAction('ISSUE')}>صرف</Button>
        <Button size="small" variant="outlined" color="info" onClick={() => onAction('ADJUST_IN')}>تسوية (+)</Button>
        <Button size="small" variant="outlined" color="warning" onClick={() => onAction('ADJUST_OUT')}>تسوية (-)</Button>
        <Button size="small" variant="outlined" color="secondary" onClick={() => onAction('STOCKTAKE')}>جرد</Button>
      </Stack>
      {bulkSelected.size > 0 && (
        <Paper variant="outlined" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', bgcolor: 'primary.dark' }}>
          <Typography variant="body2" sx={{ color: 'primary.contrastText', fontWeight: 600 }}>تم تحديد {bulkSelected.size} منتج</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" color="inherit" disabled={bulkStocktakeMutation.isPending} onClick={() => bulkStocktakeMutation.mutate(bulkIds)}>
              {bulkStocktakeMutation.isPending && <LinearProgress sx={{ width: 14, mr: 1 }} />}جرد (تطابق)
            </Button>
            <Button size="small" variant="contained" color="inherit" onClick={() => setBulkAdjustOpen(true)}>تسوية</Button>
            <Button size="small" variant="outlined" color="inherit" sx={{ color: 'primary.contrastText', borderColor: 'rgba(255,255,255,0.5)' }} onClick={() => setBulkSelected(new Set())}>إلغاء التحديد</Button>
          </Box>
        </Paper>
      )}
      <DataTable
        columns={columns} rows={items} getRowId={(r) => r.productId} loading={isLoading} enableSorting
        onRowDoubleClick={(r) => onViewMovements(r.productId, r.name)}
        selectable selected={bulkSelected} onSelectionChange={(s) => setBulkSelected(new Set(Array.from(s) as string[]))}
      />
      <Dialog open={bulkAdjustOpen} onClose={() => { setBulkAdjustOpen(false); setBulkAdjustDelta(0); }} maxWidth="xs" fullWidth>
        <DialogTitle>تسوية {bulkSelected.size} منتج</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">أدخل كمية التسوية (موجبة للإضافة، سالبة للخصم)</Typography>
            <TextField label="الكمية" type="number" value={bulkAdjustDelta} onChange={(e) => setBulkAdjustDelta(parseInt(e.target.value, 10) || 0)} autoFocus />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBulkAdjustOpen(false); setBulkAdjustDelta(0); }}>إلغاء</Button>
          <Button variant="contained" disabled={bulkAdjustDelta === 0 || bulkAdjustMutation.isPending} onClick={() => bulkAdjustMutation.mutate({ ids: bulkIds, delta: bulkAdjustDelta })}>حفظ</Button>
        </DialogActions>
      </Dialog>
      <AppSnackbar state={stockSnackbar} onClose={closeStockSnackbar} />
    </>
  );
}

function MovementsTab({ productId, productName, onBack, fromDate, toDate, typeFilter }: { 
  productId?: string; 
  productName?: string; 
  onBack?: () => void;
  fromDate: string;
  toDate: string;
  typeFilter: string;
}) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements', productId, fromDate, toDate, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId);
      if (fromDate) params.append('from', fromDate + 'T00:00:00.000Z');
      if (toDate) params.append('to', toDate + 'T23:59:59.999Z');
      if (typeFilter) params.append('type', typeFilter);
      const queryString = params.toString();
      return api.get<InventoryTransactionDto[]>(`/api/inventory/movements?${queryString}`);
    },
  });

  const columns: Column<InventoryTransactionDto>[] = [
    { key: 'productName', header: 'المنتج', render: (r) => r.productName },
    { key: 'productWeight', header: ar.weight, render: (r) => (r.productWeight ? `${r.productWeight} كجم` : '—') },
    { key: 'type', header: 'النوع', render: (r) => {
      const labels: Record<string, string> = { RECEIVE: 'وارد', SALE: 'مبيعات', RETURN: 'مرتجع', ADJUST_IN: 'تسوية (+)', ADJUST_OUT: 'تسوية (-)', STOCKTAKE: 'جرد', ISSUE: 'صرف' };
      const color = r.type === 'RECEIVE' ? 'success' : r.type === 'ISSUE' || r.type === 'SALE' ? 'error' : r.type === 'ADJUST_IN' ? 'info' : r.type === 'ADJUST_OUT' ? 'warning' : 'default';
      return <Chip label={labels[r.type] || r.type} size="small" variant="outlined" color={color} />;
    }},
    { key: 'quantity', header: 'الكمية', render: (r) => (
      <Typography variant="body2" color={r.quantity > 0 ? 'success.main' : 'error.main'}>
        {r.quantity > 0 ? '+' : ''}{r.quantity}
      </Typography>
    )},
    { key: 'balanceAfter', header: 'الرصيد بعد', render: (r) => r.balanceAfter.toString() },
    { key: 'reason', header: 'السبب', render: (r) => r.reason || '—' },
    { key: 'performedBy', header: 'المستخدم', render: (r) => r.performedBy || '—' },
    { key: 'transactionAt', header: 'التاريخ', render: (r) => new Date(r.transactionAt).toLocaleDateString('ar-EG') },
  ];

  return (
    <>
      {productName && <Typography variant="subtitle1">حركات: {productName}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" size="small" startIcon={<ClearIcon />} onClick={onBack}>
          العودة
        </Button>
      </Stack>
      <DataTable columns={columns} rows={movements} getRowId={(r) => r.id} loading={isLoading} />
    </>
  );
}

function MovementDialog({ dialog, onClose, onSaved, onError }: { dialog: { type: typeof movementTypes[number]; product?: StockDto } | null; onClose: () => void; onSaved: () => void; onError: (msg: string) => void }) {
  const [productSearch, setProductSearch] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; sku: string; quantityOnHand: number } | null>(
    dialog?.product ? { id: dialog.product.productId, name: dialog.product.name, sku: dialog.product.sku, quantityOnHand: dialog.product.quantityOnHand } : null,
  );
  const [saving, setSaving] = useState(false);

  const labels: Record<string, string> = { RECEIVE: 'إضافة للمخزون', ISSUE: 'صرف', ADJUST_IN: 'تسوية (+)', ADJUST_OUT: 'تسوية (-)', STOCKTAKE: 'جرد' };
  const { data: products = [] } = useQuery({
    queryKey: ['products-select', productSearch],
    queryFn: () => api.get<{ id: string; name: string; sku: string; quantityOnHand: number }[]>(`/api/products?term=${encodeURIComponent(productSearch)}&limit=20`),
    enabled: !!dialog,
  });

  const selectedId = selectedProduct?.id || '';
  const currentQty = selectedProduct
    ? (products.find((p) => p.id === selectedProduct.id)?.quantityOnHand ?? selectedProduct.quantityOnHand)
    : undefined;

  const handleSave = async () => {
    if (!selectedProduct || quantity <= 0) return;
    setSaving(true);
    try {
      const body = dialog!.type === 'RECEIVE' ? { productId: selectedProduct.id, quantity, reference, notes: reason }
        : dialog!.type === 'ISSUE' ? { productId: selectedProduct.id, quantity, reference, notes: reason }
        : dialog!.type === 'STOCKTAKE' ? { productId: selectedProduct.id, countedQuantity: quantity, reason }
        : { productId: selectedProduct.id, quantity: dialog!.type === 'ADJUST_IN' ? quantity : -quantity, reason };
      await api.post(`/api/inventory/${dialog!.type === 'STOCKTAKE' ? 'stocktake' : dialog!.type === 'ADJUST_IN' || dialog!.type === 'ADJUST_OUT' ? 'adjust' : dialog!.type.toLowerCase()}`, body);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'فشل حفظ الحركة');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (dialog) {
      setSelectedProduct(dialog.product ? { id: dialog.product.productId, name: dialog.product.name, sku: dialog.product.sku, quantityOnHand: dialog.product.quantityOnHand } : null);
      setQuantity(0); setReason(''); setReference('');
    }
  }, [dialog]);

  return (
    <Dialog open={!!dialog} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialog ? labels[dialog.type] : ''}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {!dialog?.product ? (
            <Autocomplete
              options={products}
              getOptionLabel={(o) => `${o.name} (${o.sku})`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={(x) => x}
              value={selectedProduct}
              onChange={(_, v) => setSelectedProduct(v)}
              onInputChange={(_, v) => {
                if (selectedProduct && v === `${selectedProduct.name} (${selectedProduct.sku})`) return;
                setProductSearch(v);
              }}
              loading={!!dialog}
              renderInput={(params) => (
                <TextField {...params} label="البحث عن منتج" variant="outlined" size="small" />
              )}
            />
          ) : (
            <Typography>{dialog.product.name} ({dialog.product.sku})</Typography>
          )}
          {dialog?.type === 'STOCKTAKE' && currentQty != null && (
            <Typography variant="body2" color="text.secondary">الكمية الحالية: {currentQty}</Typography>
          )}
          {dialog?.type === 'STOCKTAKE' ? (
            <TextField label="الكمية المعدودة" type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} fullWidth />
          ) : (
            <TextField label="الكمية" type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} fullWidth />
          )}
          {(dialog?.type === 'RECEIVE' || dialog?.type === 'ISSUE') && (
            <TextField label="المرجع" value={reference} onChange={(e) => setReference(e.target.value)} fullWidth />
          )}
          <TextField label="ملاحظات" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{ar.cancel}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !selectedId || quantity <= 0}>{ar.save}</Button>
      </DialogActions>
    </Dialog>
  );
}
