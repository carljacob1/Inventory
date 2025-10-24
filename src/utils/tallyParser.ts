// Tally file parser for various Indian business formats
export interface TallyProduct {
  itemName: string;
  stockItem: string;
  alias?: string;
  partNumber?: string;
  category?: string;
  unit: string;
  baseUnit?: string;
  openingStock: number;
  currentStock: number;
  reservedStock?: number;
  rate: number;
  mrp?: number;
  lastPurchaseRate?: number;
  lastSaleRate?: number;
  gstRate?: number;
  hsnCode?: string;
  cessRate?: number;
  minStock?: number;
  maxStock?: number;
  reorderLevel?: number;
  location?: string;
  batchNo?: string;
  expiryDate?: string;
  mfgDate?: string;
  costCenter?: string;
  godown?: string;
}

export interface TallyParseResult {
  success: boolean;
  data: TallyProduct[];
  errors: Array<{ row: number; error: string; data?: any }>;
  warnings: Array<{ row: number; warnings: string[] }>;
  summary: {
    totalRows: number;
    processed: number;
    skipped: number;
  };
}

// Common Tally field mappings for Indian businesses
const TALLY_FIELD_MAPPINGS = {
  // Item/Product identification
  itemName: ['Item Name', 'Stock Item', 'Product Name', 'Item', 'Name', 'Description'],
  stockItem: ['Stock Item', 'Item Name', 'Product Name', 'Item Code', 'Code'],
  alias: ['Alias', 'Alternate Name', 'Short Name'],
  partNumber: ['Part Number', 'Part No', 'SKU', 'Model No', 'Article'],
  
  // Categorization
  category: ['Category', 'Group', 'Item Group', 'Product Group', 'Class'],
  
  // Units
  unit: ['Unit', 'UOM', 'Base Unit', 'Primary Unit', 'Stock UOM'],
  baseUnit: ['Base Unit', 'Primary Unit', 'Stock Unit'],
  
  // Stock quantities
  openingStock: ['Opening Stock', 'Opening Qty', 'Opening Balance', 'Op Stock'],
  currentStock: ['Current Stock', 'Stock', 'Quantity', 'Qty', 'Balance', 'Closing Stock'],
  reservedStock: ['Reserved Stock', 'Reserved Qty', 'Allocated Stock'],
  
  // Pricing
  rate: ['Rate', 'Price', 'Sale Rate', 'Selling Price', 'SP'],
  mrp: ['MRP', 'Maximum Retail Price', 'Max Price', 'List Price'],
  lastPurchaseRate: ['Last Purchase Rate', 'Purchase Rate', 'Cost Price', 'CP', 'Buy Rate'],
  lastSaleRate: ['Last Sale Rate', 'Sale Rate', 'Selling Rate'],
  
  // Tax information (Indian specific)
  gstRate: ['GST Rate', 'GST%', 'GST', 'Tax Rate', 'VAT Rate', 'Tax%'],
  hsnCode: ['HSN Code', 'HSN', 'HSN/SAC', 'SAC Code', 'Commodity Code'],
  cessRate: ['Cess Rate', 'Cess%', 'Cess'],
  
  // Stock management
  minStock: ['Min Stock', 'Minimum Stock', 'Min Level', 'Reorder Level'],
  maxStock: ['Max Stock', 'Maximum Stock', 'Max Level'],
  reorderLevel: ['Reorder Level', 'ROL', 'Minimum Level'],
  
  // Location & batch info
  location: ['Location', 'Godown', 'Warehouse', 'Store'],
  godown: ['Godown', 'Warehouse', 'Location', 'Store'],
  batchNo: ['Batch No', 'Batch', 'Lot No', 'Serial No'],
  expiryDate: ['Expiry Date', 'Exp Date', 'Expiry'],
  mfgDate: ['Mfg Date', 'Manufacturing Date', 'Production Date'],
  
  // Accounting
  costCenter: ['Cost Center', 'Cost Centre', 'Department', 'Division']
};

export function findColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  // Normalize headers for comparison
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  Object.entries(TALLY_FIELD_MAPPINGS).forEach(([field, possibleNames]) => {
    for (const name of possibleNames) {
      const normalizedName = name.toLowerCase();
      const index = normalizedHeaders.findIndex(h => 
        h === normalizedName || 
        h.includes(normalizedName) || 
        normalizedName.includes(h)
      );
      
      if (index !== -1) {
        mapping[field] = index;
        break;
      }
    }
  });
  
  return mapping;
}

export function parseCSVRow(row: string[]): Partial<TallyProduct> {
  const product: Partial<TallyProduct> = {};
  
  // This will be called with mapped data
  return product;
}

export function parseTallyCSV(csvContent: string): TallyParseResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: Array<{ row: number; error: string; data?: any }> = [];
  const warnings: Array<{ row: number; warnings: string[] }> = [];
  const data: TallyProduct[] = [];
  
  if (lines.length < 2) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, error: 'File must contain headers and at least one data row' }],
      warnings: [],
      summary: { totalRows: 0, processed: 0, skipped: 0 }
    };
  }
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.replace(/['"]/g, '').trim());
  const columnMapping = findColumnMapping(headers);
  
  // Check if we found essential mappings
  const essentialFields = ['itemName', 'currentStock'];
  const missingFields = essentialFields.filter(field => !(field in columnMapping));
  
  if (missingFields.length > 0) {
    errors.push({
      row: 0,
      error: `Missing essential columns: ${missingFields.join(', ')}. Please ensure your CSV contains Item Name and Stock columns.`
    });
  }
  
  let processed = 0;
  let skipped = 0;
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVLine(lines[i]);
      const rowWarnings: string[] = [];
      
      if (row.length < Math.max(...Object.values(columnMapping)) + 1) {
        skipped++;
        errors.push({ row: i + 1, error: 'Insufficient columns in row' });
        continue;
      }
      
      const product: Partial<TallyProduct> = {};
      
      // Map all available fields
      Object.entries(columnMapping).forEach(([field, colIndex]) => {
        const value = row[colIndex]?.trim();
        if (!value) return;
        
        try {
          switch (field) {
            case 'itemName':
            case 'stockItem':
            case 'alias':
            case 'partNumber':
            case 'category':
            case 'unit':
            case 'baseUnit':
            case 'hsnCode':
            case 'location':
            case 'godown':
            case 'batchNo':
            case 'costCenter':
              (product as any)[field] = value;
              break;
              
            case 'openingStock':
            case 'currentStock':
            case 'reservedStock':
            case 'minStock':
            case 'maxStock':
            case 'reorderLevel':
              const qty = parseFloat(value.replace(/[^0-9.-]/g, ''));
              if (!isNaN(qty)) {
                (product as any)[field] = qty;
              } else {
                rowWarnings.push(`Invalid quantity for ${field}: ${value}`);
              }
              break;
              
            case 'rate':
            case 'mrp':
            case 'lastPurchaseRate':
            case 'lastSaleRate':
              const price = parseFloat(value.replace(/[^0-9.-]/g, ''));
              if (!isNaN(price)) {
                (product as any)[field] = price;
              } else {
                rowWarnings.push(`Invalid price for ${field}: ${value}`);
              }
              break;
              
            case 'gstRate':
            case 'cessRate':
              const rate = parseFloat(value.replace(/[^0-9.-]/g, ''));
              if (!isNaN(rate) && rate >= 0 && rate <= 100) {
                (product as any)[field] = rate;
              } else {
                rowWarnings.push(`Invalid tax rate for ${field}: ${value}`);
              }
              break;
              
            case 'expiryDate':
            case 'mfgDate':
              // Handle Indian date formats
              const date = parseIndianDate(value);
              if (date) {
                (product as any)[field] = date;
              } else {
                rowWarnings.push(`Invalid date format for ${field}: ${value}`);
              }
              break;
          }
        } catch (error) {
          rowWarnings.push(`Error parsing ${field}: ${value}`);
        }
      });
      
      // Validation
      if (!product.itemName && !product.stockItem) {
        skipped++;
        errors.push({ row: i + 1, error: 'Missing item name or stock item' });
        continue;
      }
      
      // Set defaults
      if (!product.itemName && product.stockItem) {
        product.itemName = product.stockItem;
      }
      if (!product.stockItem && product.itemName) {
        product.stockItem = product.itemName;
      }
      
      product.unit = product.unit || 'Nos';
      product.currentStock = product.currentStock || 0;
      product.rate = product.rate || 0;
      
      // Auto-detect GST rate if HSN code is present
      if (product.hsnCode && !product.gstRate) {
        product.gstRate = getGSTRateFromHSN(product.hsnCode);
        if (product.gstRate) {
          rowWarnings.push(`Auto-detected GST rate ${product.gstRate}% from HSN code`);
        }
      }
      
      data.push(product as TallyProduct);
      processed++;
      
      if (rowWarnings.length > 0) {
        warnings.push({ row: i + 1, warnings: rowWarnings });
      }
      
    } catch (error) {
      skipped++;
      errors.push({ 
        row: i + 1, 
        error: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }
  
  return {
    success: data.length > 0,
    data,
    errors,
    warnings,
    summary: {
      totalRows: lines.length - 1,
      processed,
      skipped
    }
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(field => field.replace(/^"|"$/g, '').trim());
}

function parseIndianDate(dateStr: string): string | null {
  // Common Indian date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const formats = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, part1, part2, part3] = match;
      // Assume DD/MM/YYYY format first
      const day = parseInt(part1);
      const month = parseInt(part2);
      const year = parseInt(part3);
      
      if (day <= 31 && month <= 12) {
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

// HSN code to GST rate mapping (common rates)
function getGSTRateFromHSN(hsnCode: string): number | null {
  const hsn = hsnCode.replace(/[^0-9]/g, '');
  
  // Common HSN code patterns and their GST rates
  const gstMapping: Record<string, number> = {
    // Food items (5%)
    '1001': 5, '1002': 5, '1003': 5, '1004': 5, // Cereals
    '0401': 5, '0402': 5, '0403': 5, '0404': 5, // Dairy
    
    // Essential items (5%)
    '1701': 5, // Sugar
    '1507': 5, '1508': 5, '1509': 5, // Cooking oils
    
    // Medicines (5% or 12%)
    '3003': 5, '3004': 5,
    
    // Textiles (5% or 12%)
    '5201': 5, '5202': 5, // Cotton
    '6001': 12, '6002': 12, // Knitted fabrics
    
    // Electronics (18%)
    '8517': 18, // Mobile phones
    '8528': 18, // TV, monitors
    '8471': 18, // Computers
    
    // Automobiles (28%)
    '8703': 28, // Cars
    '8711': 28, // Motorcycles
  };
  
  // Try exact match first
  if (gstMapping[hsn]) {
    return gstMapping[hsn];
  }
  
  // Try partial matches (first 4 digits)
  const shortHsn = hsn.substring(0, 4);
  if (gstMapping[shortHsn]) {
    return gstMapping[shortHsn];
  }
  
  return null;
}

export function generateTallyCompatibleCSV(products: TallyProduct[]): string {
  const headers = [
    'Stock Item',
    'Alias',
    'Part Number',
    'Group',
    'Unit',
    'Opening Stock',
    'Current Stock',
    'Rate',
    'MRP',
    'GST Rate',
    'HSN Code',
    'Minimum Stock',
    'Godown'
  ];
  
  const rows = products.map(product => [
    product.stockItem || product.itemName,
    product.alias || '',
    product.partNumber || '',
    product.category || '',
    product.unit,
    product.openingStock?.toString() || '0',
    product.currentStock.toString(),
    product.rate.toString(),
    product.mrp?.toString() || '',
    product.gstRate?.toString() || '',
    product.hsnCode || '',
    product.minStock?.toString() || '',
    product.godown || ''
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}