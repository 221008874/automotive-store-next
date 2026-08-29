import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Autocomplete, Typography, Box, Alert, Stack, Drawer, Divider, CircularProgress, IconButton, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../lib/api';

export interface QuickProduct {
  id: string;
  name: string;
  sku: string;
  quantityOnHand: number;
}

export type InventoryDialogType = 'RECEIVE' | 'ISSUE' | 'ADJUST' | 'STOCKTAKE';

interface QuickActionsValue {
  receive: (product?: QuickProduct) => void;
  issue: (product?: QuickProduct) => void;
  adjust: (product?: QuickProduct) => void;
  stocktake: (product?: QuickProduct) => void;
  viewDetails: (product: QuickProduct) => void;
}

const QuickActionsContext = createContext<QuickActionsValue | null>(null);

const TYPE_LABELS: Record<InventoryDialogType, string> = {
  RECEIVE: 'استلام مخزون',
  ISSUE: 'صرف مخزون',
  ADJUST: 'تسوية مخزون',
  STOCKTAKE: 'جرد مخزون',
};

export function useQuickActions(): QuickActionsValue {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error('useQuickActions must be used within QuickActionsProvider');
  return ctx;
}

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ type: InventoryDialogType; product?: QuickProduct } | null>(null);
  const [details, setDetails] = useState<QuickProduct | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<QuickProduct | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['quick-products', productSearch],
    queryFn: () => api.get<QuickProduct[]>(`/api/products?term=${encodeURIComponent(productSearch)}&limit=20`),
    enabled: !!dialog && !dialog.product,
    placeholderData: (prev) => prev,
  });

  const closeDialog = useCallback(() => {
    setDialog(null); setSelectedProduct(null); setQuantity(0); setNotes(''); setError('');
  }, []);

  const openDialog = useCallback((type: InventoryDialogType, product?: QuickProduct) => {
    setError('');
    setSelectedProduct(product ?? null);
    setQuantity(0); setNotes('');
    setProductSearch('');
    setDialog({ type, product });
  }, []);

  const receive = useCallback((p?: QuickProduct) => openDialog('RECEIVE', p), [openDialog]);
  const issue = useCallback((p?: QuickProduct) => openDialog('ISSUE', p), [openDialog]);
  const adjust = useCallback((p?: QuickProduct) => openDialog('ADJUST', p), [openDialog]);
  const stocktake = useCallback((p?: QuickProduct) => openDialog('STOCKTAKE', p), [openDialog]);
  const viewDetails = useCallback((p: QuickProduct) => { setDetails(p); }, []);

  const invalidateAll = useCallback(() => {
    ['products', 'inventory', 'stock', 'movements', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);

  const currentQtyRaw = selectedProduct
    ? products.find((p) => p.id === selectedProduct.id)?.quantityOnHand
    : undefined;
  const currentQty = currentQtyRaw ?? selectedProduct?.quantityOnHand;

  const handleSave = async () => {
    if (!selectedProduct || quantity <= 0) return;
    setSaving(true); setError('');
    try {
      const type = dialog!.type;
      if (type === 'STOCKTAKE') {
        await api.post('/api/inventory/stocktake', { productId: selectedProduct.id, countedQuantity: quantity, reason: notes || 'جرد' });
      } else if (type === 'ADJUST') {
        await api.post('/api/inventory/adjust', { productId: selectedProduct.id, quantity, reason: notes || 'تسوية يدوية' });
      } else {
        await api.post(type === 'RECEIVE' ? '/api/inventory/receive' : '/api/inventory/issue', { productId: selectedProduct.id, quantity, reference: '', notes: notes || (type === 'RECEIVE' ? 'استلام سريع' : 'صرف سريع') });
      }
      invalidateAll();
      closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل حفظ العملية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuickActionsContext.Provider value={{ receive, issue, adjust, stocktake, viewDetails }}>
      {children}

      {/* Inventory action dialogs (RECEIVE / ISSUE / ADJUST / STOCKTAKE) */}
      <Dialog open={!!dialog} onClose={closeDialog} maxWidth="xs" fullWidth>
        {dialog && (
          <>
            <DialogTitle>📦 {TYPE_LABELS[dialog.type]}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {!dialog.product ? (
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
                    renderInput={(params) => <TextField {...params} label="البحث عن المنتج..." variant="outlined" size="small" autoFocus />}
                  />
                ) : (
                  <Typography>{dialog.product.name} ({dialog.product.sku})</Typography>
                )}
                {selectedProduct && dialog.type !== 'STOCKTAKE' && (
                  <Typography variant="body2" color={currentQty != null && currentQty <= 0 ? 'error' : 'text.secondary'}>
                    المتاح: {currentQty ?? '—'}
                  </Typography>
                )}
                {dialog.type === 'STOCKTAKE' && selectedProduct && (
                  <Typography variant="body2" color="text.secondary">الكمية الحالية: {currentQty ?? '—'}</Typography>
                )}
                <TextField
                  label={dialog.type === 'STOCKTAKE' ? 'الكمية المعدودة' : 'الكمية'}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  fullWidth
                  autoFocus={!!dialog.product}
                  inputProps={{ min: 0 }}
                />
                <TextField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDialog}>إلغاء</Button>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={saving || !selectedProduct || quantity <= 0}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {dialog.type === 'RECEIVE' ? 'استلام' : dialog.type === 'ISSUE' ? 'صرف' : 'حفظ'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Product details drawer (opens from right) */}
      <ProductDetailsDrawer
        product={details}
        onClose={() => setDetails(null)}
        onReceive={() => { if (details) { const d = details; setDetails(null); receive(d); } }}
        onIssue={() => { if (details) { const d = details; setDetails(null); issue(d); } }}
      />
    </QuickActionsContext.Provider>
  );
}

interface ProductDetails {
  id: string; sku: string; barcode: string; name: string; description: string;
  categoryName: string; brand: string; size: string; weight: string; material: string; fitment: string;
  unitPrice: number; costPrice: number; reorderLevel: number; quantityOnHand: number; lowStock: boolean; active: boolean;
}
interface DetailMovement {
  id: string; type: string; quantity: number; reason: string; transactionAt: string;
}

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIVE: 'استلام', SALE: 'مبيعات', RETURN: 'مرتجع', ADJUST_IN: 'تسوية (+)', ADJUST_OUT: 'تسوية (-)', STOCKTAKE: 'جرد', ISSUE: 'صرف',
};

function ProductDetailsDrawer({ product, onClose, onReceive, onIssue }: { product: QuickProduct | null; onClose: () => void; onReceive: () => void; onIssue: () => void }) {
  const { data: full } = useQuery({
    queryKey: ['product-detail', product?.id ?? ''],
    queryFn: () => api.get<ProductDetails>(`/api/products/${product!.id}`),
    enabled: !!product,
  });
  const { data: movements = [] } = useQuery({
    queryKey: ['detail-movements', product?.id ?? ''],
    queryFn: () => api.get<DetailMovement[]>(`/api/inventory/movements?productId=${product!.id}&limit=8`),
    enabled: !!product,
  });
  const qty = full?.quantityOnHand ?? product?.quantityOnHand ?? 0;

  return (
    <Drawer anchor="right" open={!!product} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, p: 0 } }}>
      {product && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">تفاصيل المنتج</Typography>
            <IconButton onClick={onClose} aria-label="إغلاق"><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Typography variant="h6">{product.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>رمز: {product.sku}{full?.categoryName ? ` • ${full.categoryName}` : ''}</Typography>
            {full?.brand || full?.size || full?.material ? (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                {full.brand && <Chip size="small" label={`الماركة: ${full.brand}`} variant="outlined" />}
                {full.size && <Chip size="small" label={`مقاس: ${full.size}`} variant="outlined" />}
                {full.material && <Chip size="small" label={`مادة: ${full.material}`} variant="outlined" />}
                {full.weight && <Chip size="small" label={`وزن: ${full.weight} كجم`} variant="outlined" />}
              </Stack>
            ) : null}
            <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">المخزون</Typography>
                <Typography variant="h5" color={qty <= 0 ? 'error.main' : qty <= (full?.reorderLevel ?? 0) ? 'warning.main' : 'success.main'}>{qty}</Typography>
                {full?.lowStock && <Typography variant="caption" color="error">منخفض المخزون</Typography>}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">سعر البيع</Typography>
                <Typography variant="h5">{full?.unitPrice?.toLocaleString() ?? '—'} ج.م</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">التكلفة</Typography>
                <Typography variant="h6">{full?.costPrice?.toLocaleString() ?? '—'} ج.م</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button variant="contained" color="success" onClick={onReceive}>استلام</Button>
              <Button variant="outlined" color="warning" onClick={onIssue} disabled={qty <= 0}>صرف</Button>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>آخر الحركات</Typography>
            {movements.length === 0 && <Typography variant="body2" color="text.secondary">لا توجد حركات</Typography>}
            <Stack spacing={1}>
              {movements.map((m) => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1 }}>
                  <Box>
                    <Typography variant="body2">{MOVEMENT_LABELS[m.type] ?? m.type}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.reason || new Date(m.transactionAt).toLocaleDateString('ar-EG')}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'end' }}>
                    <Typography variant="body2" color={m.quantity > 0 ? 'success.main' : 'error.main'} fontWeight={600}>{m.quantity > 0 ? '+' : ''}{m.quantity}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
