export interface ProductDto {
  id: string; sku: string; barcode: string; name: string; description: string;
  categoryId: string; categoryName: string; brand: string; size: string; weight: string;
  fitment: string; material: string; unitPrice: number; costPrice: number;
  reorderLevel: number; quantityOnHand: number; lowStock: boolean; active: boolean;
}
export interface CreateProductCommand {
  sku: string; barcode: string; name: string; description: string; categoryId: string;
  brand: string; size: string; weight: string; fitment: string; material: string;
  unitPrice: number; costPrice: number; reorderLevel: number;
}
export interface UpdateProductCommand extends CreateProductCommand { active: boolean; }
export interface CategoryDto { id: string; name: string; }
export interface CategoryAdminDto {
  id: string; name: string; parentId: string | null; parentName: string | null;
  active: boolean; productCount: number;
}
export interface StockDto {
  productId: string; sku: string; barcode: string; name: string; categoryName: string;
  brand: string; size: string; weight: string; material: string; fitment: string;
  quantityOnHand: number; reorderLevel: number; lowStock: boolean;
  costPrice: number; unitPrice: number; active: boolean;
}
export interface InventoryTransactionDto {
  id: string; productId: string; productSku: string; productName: string; productWeight: string;
  type: 'RECEIVE' | 'SALE' | 'RETURN' | 'ADJUST_IN' | 'ADJUST_OUT' | 'STOCKTAKE' | 'ISSUE';
  quantity: number; referenceType: string; referenceId: string; reason: string;
  performedBy: string; transactionAt: string; balanceAfter: number;
}
export interface SalesReportDto {
  from: string; to: string; saleCount: number; itemCount: number;
  gross: number; discount: number; returns: number; tax: number; net: number;
}
export interface InventoryMovementReportDto {
  from: string; to: string; movementCount: number; totalReceived: number;
  totalSold: number; totalReturned: number; totalAdjustedIn: number;
  totalAdjustedOut: number; stocktakeNet: number; netMovement: number;
  rows: InventoryTransactionDto[];
}
export interface CategoryMarginDto {
  categoryId: string; categoryName: string; revenue: number; cost: number; margin: number;
}
export interface ProductSalesDto {
  productId: string; sku: string; name: string; quantity: number; revenue: number;
}
export interface SalesByCategoryDto {
  categoryId: string; categoryName: string; quantity: number; revenue: number;
}
export interface DailyRevenueDto {
  date: string; saleCount: number; revenue: number;
}
export interface TopDebtorDto {
  customerId: string; name: string; creditBalance: number;
}
export interface PurchaseItemDto {
  productId: string; productName: string; quantity: number; receivedQty: number;
  unitCost: number; lineTotal: number;
}
export interface PurchaseDto {
  purchaseId: string; invoiceNo: string; supplierId: string; supplierName: string;
  purchaseDate: string; expectedDate: string | null; overdue: boolean; status: string;
  items: PurchaseItemDto[]; totalAmount: number;
}
export interface DashboardStatsDto {
  todaySales: number; salesCount: number; lowStockCount: number;
  customersCount: number; productsCount: number; suppliersCount: number;
  purchaseOrdersCount: number; openPurchaseOrdersCount: number; todayPurchases: number;
  totalReceivables: number; totalPayables: number; profitToday: number;
}

export interface AttributeValidationDto {
  ruleType: string; value: string; messageAr: string;
}
export interface AttributeDefinitionDto {
  code: string; nameAr: string; dataType: string; unit: string;
  description: string; active: boolean; validations: AttributeValidationDto[];
}
export interface AttributeGroupDto {
  code: string; nameAr: string; description: string; definitions: AttributeDefinitionDto[];
}
export interface AttributeSchemaDto {
  groups: AttributeGroupDto[];
}

export interface ProductEquivalenceDto {
  id: string; productId: string; equivalentProductId: string; type: string;
  typeArabic: string; bidirectional: boolean; note: string; equivSku: string;
  equivName: string; equivStock: number; equivUnitPrice: number; equivFitment: string;
}

export interface ImportFormatDto {
  name: string; extension: string;
}
export interface ImportRowDto {
  rowIndex: number; values: Record<string, string>; error?: string; hasError: boolean;
}
export interface ImportResultDto {
  totalRows: number; succeeded: number; failed: number;
  rows: ImportRowDto[]; errors: string[]; hasErrors: boolean;
}
export interface UserDto {
  id: string;
  username: string;
  fullName: string;
  roleName: string;
  active: boolean;
  mustChangePassword: boolean;
}
export interface CreateUserCommand {
  username: string;
  password: string;
  fullName: string;
  roleName: string;
}
export interface UpdateUserCommand {
  fullName: string;
  roleName: string;
}
export interface RoleDto {
  name: string;
  labelAr: string;
  permissions: string[];
}

export interface StoreSettingsDto {
  name: string;
  address: string;
  phone: string;
  taxRegistration: string;
  currency: string;
}

export interface TaxSettingsDto {
  rate: number;
}
export interface ApiErrorDto {
  error: string;
}

export type BackupType = 'auto' | 'manual' | 'pre-restore';
export interface BackupFileDto {
  name: string;
  type: BackupType;
  size: number;
  modified: number;
}
export interface BackupSettingsDto {
  autoBackupEnabled: boolean;
  frequencyDays: number;
}
export interface BackupResultDto {
  success: boolean;
  filePath?: string;
  size?: number;
}
