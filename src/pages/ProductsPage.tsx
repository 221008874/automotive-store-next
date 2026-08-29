import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, IconButton, Stack, Chip, Tooltip, TextField, FormControl, InputLabel,
  Select, MenuItem, Grid2, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Typography, Box, Menu, ListItemIcon, ListItemText, Paper, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import { api } from '../lib/api';
import { PageLayout, DataTable, FilterBar, ConfirmDialog, useSnackbar, AppSnackbar } from '../design-system';
import { ProductFormDialog } from '../design-system/components/ProductFormDialog';
import { useQuickActions } from '../quick-actions/QuickActionsProvider';
import type { Column } from '../design-system';
import type { ProductDto, CategoryDto } from '../lib/types';
import ar from '../i18n/ar';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [barcodeFilter, setBarcodeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState(0);
  const [inStockFilter, setInStockFilter] = useState(false);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(true);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [deleting, setDeleting] = useState<ProductDto | null>(null);
  const [toggling, setToggling] = useState<ProductDto | null>(null);
  const [selling, setSelling] = useState<ProductDto | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellError, setSellError] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ id: string; field: 'unitPrice' | 'costPrice'; value: string } | null>(null);
  const [moreMenu, setMoreMenu] = useState<{ el: HTMLElement; product: ProductDto } | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const { snackbar, showSuccess, showError, close } = useSnackbar();
  const qc = useQueryClient();
  const qa = useQuickActions();

  const bulkIds = Array.from(bulkSelected);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDto[]>('/api/categories'),
  });

  const { data: products = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products', search, skuFilter, barcodeFilter, categoryFilter, brandFilter, sizeFilter, weightFilter, minPriceFilter, maxPriceFilter, inStockFilter, lowStockFilter, activeOnlyFilter, sortField, sortAsc],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('term', search);
      if (skuFilter) params.append('sku', skuFilter);
      if (barcodeFilter) params.append('barcode', barcodeFilter);
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
      return api.get<ProductDto[]>(`/api/products?${params.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); showSuccess('تم حذف المنتج'); },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل حذف المنتج'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/api/products/${id}/active`, { active }),
    onSuccess: (_data, vars) => { qc.invalidateQueries({ queryKey: ['products'] }); showSuccess(vars.active ? 'تم تفعيل المنتج' : 'تم إيقاف المنتج'); },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل تغيير حالة المنتج'),
  });

  const sellMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => api.post('/api/inventory/issue', { productId: id, quantity, reference: 'بيع سريع', notes: 'Quick sell from Products' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      showSuccess('تم البيع بنجاح');
      setSelling(null);
      setSellQty(1);
      setSellError('');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'فشل البيع';
      setSellError(msg);
      showError(msg);
    },
  });

  const inlinePriceMutation = useMutation({
    mutationFn: ({ product, field, value }: { product: ProductDto; field: 'unitPrice' | 'costPrice'; value: number }) =>
      api.put(`/api/products/${product.id}`, { ...product, [field]: value, description: product.description || '', brand: product.brand || '', size: product.size || '', weight: product.weight || '', fitment: product.fitment || '', material: product.material || '' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); showSuccess('تم تحديث السعر'); setEditingPrice(null); },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل تحديث السعر'),
  });

  const handleEdit = useCallback((p: ProductDto) => { setEditing(p); setFormOpen(true); }, []);
  const handleDelete = useCallback(() => { if (deleting) deleteMutation.mutate(deleting.id); setDeleting(null); }, [deleting, deleteMutation]);
  const handleToggleActive = useCallback(() => {
    if (toggling) {
      toggleActiveMutation.mutate({ id: toggling.id, active: !toggling.active });
      setToggling(null);
    }
  }, [toggling, toggleActiveMutation]);
  const handleSell = useCallback(() => {
    if (!selling) return;
    if (sellQty < 1) { setSellError('الكمية يجب أن تكون 1 على الأقل'); return; }
    if (sellQty > selling.quantityOnHand) { setSellError(`الكمية المتاحة فقط ${selling.quantityOnHand}`); return; }
    setSellError('');
    sellMutation.mutate({ id: selling.id, quantity: sellQty });
  }, [selling, sellQty, sellMutation]);
  const handleSaved = useCallback(() => { qc.invalidateQueries({ queryKey: ['products'] }); showSuccess(editing ? 'تم تعديل المنتج' : 'تم إضافة المنتج'); }, [qc, editing, showSuccess]);
  const handleFormClose = useCallback(() => { setFormOpen(false); setEditing(null); }, []);
  const handleAdd = useCallback(() => { setEditing(null); setFormOpen(true); }, []);

  // ---- Bulk actions ----
  const bulkToggleMutation = useMutation({
    mutationFn: ({ ids, active }: { ids: string[]; active: boolean }) =>
      Promise.allSettled(ids.map((id) => api.put(`/api/products/${id}/active`, { active }))).then((r) =>
        Promise.all(r.map((x, i) => x.status === 'rejected' ? Promise.reject((x.reason as Error)?.message || `فشل للمنتج ${ids[i]}`) : Promise.resolve()))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      showSuccess(`تم تحديث الحالة لـ ${bulkIds.length} منتج`);
      setBulkSelected(new Set());
    },
    onError: (e: unknown) => showError(e instanceof Error ? e.message : 'فشل العملية المجمعة'),
  });

  const bulkCategoryMutation = useMutation({
    mutationFn: ({ ids, categoryId }: { ids: string[]; categoryId: string }) =>
      Promise.all(ids.map(async (id) => {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        await api.put(`/api/products/${id}`, { ...p, categoryId, description: p.description || '', brand: p.brand || '', size: p.size || '', weight: p.weight || '', fitment: p.fitment || '', material: p.material || '' });
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      showSuccess(`تم تغيير الفئة لـ ${bulkIds.length} منتج`);
      setBulkSelected(new Set()); setBulkCategoryOpen(false); setBulkCategory('');
    },
    onError: (e: unknown) => { showError(e instanceof Error ? e.message : 'فشل تغيير الفئة'); setBulkCategoryOpen(false); },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: ({ ids, price }: { ids: string[]; price: number }) =>
      Promise.all(ids.map(async (id) => {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        await api.put(`/api/products/${id}`, { ...p, unitPrice: price, description: p.description || '', brand: p.brand || '', size: p.size || '', weight: p.weight || '', fitment: p.fitment || '', material: p.material || '' });
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      showSuccess(`تم تعديل سعر ${bulkIds.length} منتج`);
      setBulkSelected(new Set()); setBulkPriceOpen(false); setBulkPrice('');
    },
    onError: (e: unknown) => { showError(e instanceof Error ? e.message : 'فشل تعديل السعر'); setBulkPriceOpen(false); },
  });

  const exportSelected = () => {
    const selectedProducts = products.filter((p) => bulkSelected.has(p.id));
    const header = ['الاسم', 'SKU', 'الباركود', 'الفئة', 'الماركة', 'الكمية', 'سعر البيع', 'التكلفة'];
    const rows = selectedProducts.map((p) => [p.name, p.sku, p.barcode, p.categoryName, p.brand || '', String(p.quantityOnHand), String(p.unitPrice), String(p.costPrice)]);
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'selected-products.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
  };

  // Keyboard shortcuts: F2 quick-sell, Enter edit, Delete delete, barcode auto-sell
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput && e.key !== 'F2' && e.key !== 'Enter' && e.key !== 'Delete') return;
      if (e.key === 'F2' && products.length > 0) {
        e.preventDefault();
        const p = products[0];
        if (p.active && p.quantityOnHand > 0) { setSelling(p); setSellQty(1); setSellError(''); }
      } else if (e.key === 'Enter' && !formOpen && !selling && !toggling && !deleting && products.length > 0) {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        handleEdit(products[0]);
      } else if ((e.key === 'Delete' || e.key === 'Del') && !formOpen && !selling && products.length > 0) {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setDeleting(products[0]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [products, formOpen, selling, toggling, deleting, handleEdit]);

  // Barcode auto-sell: when barcode filter gets an exact match, auto-open sell
  useEffect(() => {
    if (barcodeFilter && products.length === 1 && products[0].barcode === barcodeFilter && products[0].active && products[0].quantityOnHand > 0) {
      const t = setTimeout(() => { setSelling(products[0]); setSellQty(1); setSellError(''); }, 150);
      return () => clearTimeout(t);
    }
  }, [barcodeFilter, products]);

  const resetFilters = () => {
    setSkuFilter(''); setBarcodeFilter(''); setCategoryFilter(''); setBrandFilter('');
    setSizeFilter(''); setWeightFilter(''); setMinPriceFilter(0); setMaxPriceFilter(0);
    setInStockFilter(false); setLowStockFilter(false); setActiveOnlyFilter(true);
    setSortField('name'); setSortAsc(true);
  };

  const activeCount = [
    skuFilter, barcodeFilter, categoryFilter, brandFilter, sizeFilter, weightFilter,
    minPriceFilter > 0, maxPriceFilter > 0, inStockFilter, lowStockFilter, !activeOnlyFilter,
  ].filter(Boolean).length;

  const activeChips = [
    skuFilter && { label: `SKU: ${skuFilter}`, onDelete: () => setSkuFilter('') },
    barcodeFilter && { label: `باركود: ${barcodeFilter}`, onDelete: () => setBarcodeFilter('') },
    categoryFilter && { label: `فئة: ${categories.find((c) => c.id === categoryFilter)?.name || categoryFilter}`, onDelete: () => setCategoryFilter('') },
    brandFilter && { label: `ماركة: ${brandFilter}`, onDelete: () => setBrandFilter('') },
    sizeFilter && { label: `مقاس: ${sizeFilter}`, onDelete: () => setSizeFilter('') },
    weightFilter && { label: `وزن: ${weightFilter}`, onDelete: () => setWeightFilter('') },
    minPriceFilter > 0 && { label: `سعر ≥${minPriceFilter}`, onDelete: () => setMinPriceFilter(0) },
    maxPriceFilter > 0 && { label: `سعر ≤${maxPriceFilter}`, onDelete: () => setMaxPriceFilter(0) },
    inStockFilter && { label: 'في المخزون', onDelete: () => setInStockFilter(false) },
    lowStockFilter && { label: 'منخفض', onDelete: () => setLowStockFilter(false) },
    !activeOnlyFilter && { label: 'الكل (غير نشط)', onDelete: () => setActiveOnlyFilter(true) },
  ].filter(Boolean) as { label: string; onDelete: () => void }[];

  const columns: Column<ProductDto>[] = [
    { key: 'name', header: ar.products.productName, render: (r) => r.name },
    { key: 'sku', header: ar.products.sku, render: (r) => r.sku },
    { key: 'categoryName', header: ar.products.category, render: (r) => r.categoryName },
    { key: 'brand', header: 'الماركة', render: (r) => r.brand || '—' },
    { key: 'size', header: 'المقاس', render: (r) => r.size || '—' },
    { key: 'weight', header: ar.weight, render: (r) => (r.weight ? `${r.weight} كجم` : '—'), sortValue: (r) => r.weight },
    { key: 'unitPrice', header: ar.products.price, render: (r) => editingPrice?.id === r.id && editingPrice.field === 'unitPrice' ? (
      <TextField size="small" type="number" value={editingPrice.value} onChange={(e) => setEditingPrice({ id: r.id, field: 'unitPrice', value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat(editingPrice.value) || 0; if (v >= 0) inlinePriceMutation.mutate({ product: r, field: 'unitPrice', value: v }); } if (e.key === 'Escape') setEditingPrice(null); }} onBlur={() => setEditingPrice(null)} autoFocus sx={{ width: 110 }} inputProps={{ min: 0, step: 0.5 }} />
    ) : (
      <Tooltip title="اضغط للتعديل"><Typography variant="body2" onClick={(e) => { e.stopPropagation(); setEditingPrice({ id: r.id, field: 'unitPrice', value: String(r.unitPrice) }); }} sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{r.unitPrice.toLocaleString()} ج.م</Typography></Tooltip>
    )},
    { key: 'costPrice', header: ar.products.cost, render: (r) => editingPrice?.id === r.id && editingPrice.field === 'costPrice' ? (
      <TextField size="small" type="number" value={editingPrice.value} onChange={(e) => setEditingPrice({ id: r.id, field: 'costPrice', value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat(editingPrice.value) || 0; if (v >= 0) inlinePriceMutation.mutate({ product: r, field: 'costPrice', value: v }); } if (e.key === 'Escape') setEditingPrice(null); }} onBlur={() => setEditingPrice(null)} autoFocus sx={{ width: 110 }} inputProps={{ min: 0, step: 0.5 }} />
    ) : (
      <Tooltip title="اضغط للتعديل"><Typography variant="body2" onClick={(e) => { e.stopPropagation(); setEditingPrice({ id: r.id, field: 'costPrice', value: String(r.costPrice) }); }} sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{r.costPrice.toLocaleString()} ج.م</Typography></Tooltip>
    )},
    { key: 'quantityOnHand', header: ar.products.stock, render: (r) => (
      <Chip label={r.quantityOnHand} size="small" color={r.lowStock ? 'error' : r.quantityOnHand === 0 ? 'default' : 'success'} variant="outlined" />
    )},
    { key: 'active', header: ar.products.active, render: (r) => (
      <Chip label={r.active ? ar.products.active : ar.products.inactive} size="small" color={r.active ? 'success' : 'default'} variant="outlined" />
    )},
    { key: 'actions', header: ar.actions, render: (r) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="استلام (إضافة للمخزون)"><span><IconButton size="small" color="success" onClick={() => qa.receive({ id: r.id, name: r.name, sku: r.sku, quantityOnHand: r.quantityOnHand })}><AddShoppingCartIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="صرف (إنزال من المخزون)"><span><IconButton size="small" color="warning" disabled={!r.active || r.quantityOnHand <= 0} onClick={() => qa.issue({ id: r.id, name: r.name, sku: r.sku, quantityOnHand: r.quantityOnHand })}><RemoveShoppingCartIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title={ar.edit}><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="المزيد"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setMoreMenu({ el: e.currentTarget, product: r }); }}><MoreVertIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    ), width: 150 },
  ];

  return (
    <PageLayout
      title={ar.products.title} subtitle={ar.products.subtitle}
      actions={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>{ar.products.addProduct}</Button>}
    >
      <FilterBar
        search={{ value: search, onSearch: setSearch }}
        activeCount={activeCount}
        onClear={() => { resetFilters(); setSearch(''); }}
      >
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth size="small" label="رمز المنتج (SKU)" value={skuFilter} onChange={(e) => setSkuFilter(e.target.value)} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth size="small" label={ar.products.barcode} value={barcodeFilter} onChange={(e) => setBarcodeFilter(e.target.value)} />
          </Grid2>
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
            <TextField fullWidth size="small" label="الماركة" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth size="small" label="المقاس" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} />
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
        </Grid2>
      </FilterBar>
      {activeChips.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {activeChips.map((chip) => (
            <Chip key={chip.label} label={chip.label} size="small" onDelete={chip.onDelete} variant="outlined" color="primary" />
          ))}
        </Stack>
      )}

      {bulkSelected.size > 0 && (
        <Paper variant="outlined" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', bgcolor: 'primary.dark' }}>
          <Typography variant="body2" sx={{ color: 'primary.contrastText', fontWeight: 600 }}>
            تم تحديد {bulkSelected.size} منتج
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" color="inherit" disabled={bulkToggleMutation.isPending} onClick={() => { if (bulkSelected.size > 0) bulkToggleMutation.mutate({ ids: bulkIds, active: false }); }}>
              {bulkToggleMutation.isPending && <LinearProgress sx={{ width: 14, mr: 0.5 }} />}تعطيل
            </Button>
            <Button size="small" variant="contained" color="inherit" onClick={() => { setBulkCategoryOpen(true); }}>تعديل الفئة</Button>
            <Button size="small" variant="contained" color="inherit" onClick={() => { setBulkPriceOpen(true); }}>تعديل السعر</Button>
            <Button size="small" variant="contained" color="inherit" onClick={exportSelected}>تصدير</Button>
            <Button size="small" color="inherit" variant="outlined" sx={{ color: 'primary.contrastText', borderColor: 'rgba(255,255,255,0.5)' }} onClick={() => setBulkSelected(new Set())}>إلغاء التحديد</Button>
          </Box>
        </Paper>
      )}

      <DataTable
        columns={columns} rows={products} getRowId={(r) => r.id} loading={isLoading}
        error={isError ? (error as Error)?.message || 'فشل تحميل المنتجات' : null} onRetry={() => refetch()}
        enableColumnToggle enableSorting
        selectable
        selected={bulkSelected}
        onSelectionChange={(s) => setBulkSelected(new Set(Array.from(s) as string[]))}
        onRowClick={(r) => qa.viewDetails({ id: r.id, name: r.name, sku: r.sku, quantityOnHand: r.quantityOnHand })}
      />
      <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', color: 'text.disabled', fontSize: '0.75rem' }}>
        <span>F2 بيع سريع</span><span>•</span><span>Enter تعديل</span><span>•</span><span>Del حذف</span><span>•</span><span>/ بحث</span><span>•</span><span>مسح باركود → بيع تلقائي</span>
      </Box>
      {isError && <Alert severity="error" sx={{ mt: 1 }}>فشل تحميل المنتجات: {(error as Error)?.message} – تأكد من تسجيل الدخول وتشغيل الخادم (8081)</Alert>}
      <ProductFormDialog open={formOpen} product={editing} onClose={handleFormClose} onSaved={handleSaved} />
      <ConfirmDialog open={!!toggling} title={toggling?.active ? 'إيقاف المنتج' : 'تفعيل المنتج'} message={toggling?.active ? `هل أنت متأكد من إيقاف المنتج "${toggling?.name}"؟ لن يظهر في البيع/الجرد.` : `هل أنت متأكد من تفعيل المنتج "${toggling?.name}"؟`} onConfirm={handleToggleActive} onCancel={() => setToggling(null)} severity={toggling?.active ? 'warning' : 'info'} confirmLabel={toggling?.active ? 'إيقاف' : 'تفعيل'} />
      <ConfirmDialog open={!!deleting} title="حذف المنتج" message={`هل أنت متأكد من حذف "${deleting?.name}"؟ سيتم حذف المخزون والبدائل المرتبطة ولا يمكن التراجع.`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} severity="error" />
      <Dialog open={!!selling} onClose={() => { setSelling(null); setSellQty(1); setSellError(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>بيع سريع</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {sellError && <Alert severity="error">{sellError}</Alert>}
            {selling && (
              <>
                <Typography variant="body2">{selling.name} — {selling.sku}</Typography>
                <Typography variant="body2" color="text.secondary">المتاح: {selling.quantityOnHand} — السعر: {selling.unitPrice.toLocaleString()} ج.م</Typography>
                <TextField label="الكمية" type="number" value={sellQty} onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; setSellQty(v); setSellError(''); }} fullWidth required inputProps={{ min: 1, max: selling.quantityOnHand }} error={sellQty < 1 || sellQty > selling.quantityOnHand} helperText={sellQty > selling.quantityOnHand ? `الحد الأقصى ${selling.quantityOnHand}` : ' '} autoFocus />
                <Typography variant="body2">الإجمالي: {(sellQty * (selling?.unitPrice || 0)).toLocaleString()} ج.م</Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelling(null); setSellQty(1); setSellError(''); }}>{ar.cancel}</Button>
          <Button onClick={handleSell} variant="contained" disabled={sellMutation.isPending || !selling || sellQty < 1 || sellQty > (selling?.quantityOnHand || 0)} startIcon={<ShoppingCartIcon />}>{sellMutation.isPending ? ar.loading : 'بيع'}</Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={moreMenu?.el}
        open={!!moreMenu}
        onClose={() => setMoreMenu(null)}
      >
        {moreMenu && (
          <span>
            <MenuItem onClick={() => { setMoreMenu(null); setDeleting(moreMenu.product); }}><ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon><ListItemText>حذف</ListItemText></MenuItem>
            <MenuItem onClick={() => { setMoreMenu(null); setToggling(moreMenu.product); }}><ListItemIcon>{moreMenu.product.active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}</ListItemIcon><ListItemText>{moreMenu.product.active ? 'إيقاف' : 'تفعيل'}</ListItemText></MenuItem>
            <MenuItem onClick={() => { setMoreMenu(null); setSelling(moreMenu.product); setSellQty(1); setSellError(''); }}><ListItemIcon><ShoppingCartIcon fontSize="small" /></ListItemIcon><ListItemText>بيع سريع</ListItemText></MenuItem>
            <MenuItem onClick={() => { setMoreMenu(null); qa.adjust({ id: moreMenu.product.id, name: moreMenu.product.name, sku: moreMenu.product.sku, quantityOnHand: moreMenu.product.quantityOnHand }); }}><ListItemIcon><InventoryIcon fontSize="small" /></ListItemIcon><ListItemText>تسوية مخزون</ListItemText></MenuItem>
          </span>
        )}
      </Menu>
      <Dialog open={bulkCategoryOpen} onClose={() => { setBulkCategoryOpen(false); setBulkCategory(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>تغيير فئة {bulkSelected.size} منتج</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>الفئة</InputLabel>
              <Select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} label="الفئة">
                {categories?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBulkCategoryOpen(false); setBulkCategory(''); }}>{ar.cancel}</Button>
          <Button variant="contained" disabled={!bulkCategory || bulkCategoryMutation.isPending} onClick={() => bulkCategoryMutation.mutate({ ids: bulkIds, categoryId: bulkCategory })}>حفظ</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={bulkPriceOpen} onClose={() => { setBulkPriceOpen(false); setBulkPrice(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>تعديل سعر {bulkSelected.size} منتج</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="سعر البيع (ج.م)" type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} fullWidth autoFocus />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBulkPriceOpen(false); setBulkPrice(''); }}>{ar.cancel}</Button>
          <Button variant="contained" disabled={!bulkPrice || Number(bulkPrice) <= 0 || bulkPriceMutation.isPending} onClick={() => bulkPriceMutation.mutate({ ids: bulkIds, price: Number(bulkPrice) })}>حفظ</Button>
        </DialogActions>
      </Dialog>
      <AppSnackbar state={snackbar} onClose={close} />
    </PageLayout>
  );
}
