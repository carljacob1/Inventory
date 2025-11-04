import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp,
  Package,
  ShoppingCart,
  Receipt,
  BookOpen,
  Calendar,
  Clock
} from 'lucide-react';
import { formatIndianCurrency } from '@/utils/indianBusiness';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReportRow {
  subcategory: string;
  amount: number;
  category?: string;
  // Additional fields for detailed reports
  invoice_number?: string;
  invoice_date?: string;
  customer?: string;
  supplier?: string;
  subtotal?: number;
  tax_amount?: number;
  payment_status?: string;
  po_number?: string;
  status?: string;
  age_category?: string;
  due_date?: string;
  transaction_type?: string;
  gst_type?: string;
  gst_rate?: number;
  payment_method?: string;
}

interface ReportSummary {
  totalSales: number;
  totalPurchases: number;
  grossProfit: number;
  netProfit: number;
}

const REPORT_TYPES = [
  { id: 'profit-loss', name: 'Profit & Loss Statement', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'trial-balance', name: 'Trial Balance', icon: <FileText className="h-4 w-4" /> },
  { id: 'sales-report', name: 'Sales Report', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'purchase-report', name: 'Purchase Report', icon: <FileText className="h-4 w-4" /> },
  { id: 'gst-report', name: 'GST Report', icon: <FileText className="h-4 w-4" /> },
  { id: 'payment-report', name: 'Payment Report', icon: <FileText className="h-4 w-4" /> },
  { id: 'ledger-summary', name: 'Ledger Summary', icon: <FileText className="h-4 w-4" /> },
  { id: 'invoice-aging', name: 'Invoice Aging Report', icon: <BarChart3 className="h-4 w-4" /> }
];

export const ReportsManager: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [selectedReport, setSelectedReport] = useState<string>('profit-loss');
  
  // Initialize date range to current month
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: firstDay.toISOString().split('T')[0],
      to: lastDay.toISOString().split('T')[0]
    };
  };
  
  const [dateFrom, setDateFrom] = useState(() => getCurrentMonthRange().from);
  const [dateTo, setDateTo] = useState(() => getCurrentMonthRange().to);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalSales: 0,
    totalPurchases: 0,
    grossProfit: 0,
    netProfit: 0
  });
  const [generatedTime, setGeneratedTime] = useState<string>('');
  const { toast } = useToast();


  // Refresh reports when selectedCompany changes to ensure latest data
  useEffect(() => {
    if (selectedCompany && selectedReport && dateFrom && dateTo) {
      // Small delay to ensure state is updated
      const timeoutId = setTimeout(() => {
        generateReport();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedReport && selectedCompany) {
      generateReport();
    } else if (!selectedCompany) {
      // Clear report data if no company is selected
      setReportData([]);
      setSummary({
        totalSales: 0,
        totalPurchases: 0,
        grossProfit: 0,
        netProfit: 0
      });
      setGeneratedTime('');
    }
  }, [selectedReport, dateFrom, dateTo, selectedCompany]);

  const generateReport = async () => {
    if (!dateFrom || !dateTo || !selectedCompany) {
      if (!selectedCompany) {
        toast({
          title: "No Company Selected",
          description: "Please select a company to generate reports",
          variant: "destructive"
        });
      }
      return;
    }

    setLoading(true);
    try {
      console.log('=== Generating Report ===');
      console.log('Company:', selectedCompany.company_name);
      console.log('Report Type:', selectedReport);
      console.log('Date Range:', dateFrom, 'to', dateTo);
      
      let sampleData: ReportRow[] = [];
      let newSummary: ReportSummary = {
        totalSales: 0,
        totalPurchases: 0,
        grossProfit: 0,
        netProfit: 0
      };

      switch (selectedReport) {
        case 'profit-loss': {
          // Fetch all sales invoices (for sales account)
          const { data: allSalesInvoices, error: salesError } = await supabase
            .from('invoices')
            .select('id, subtotal, tax_amount, total_amount, invoice_date')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sales')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          if (salesError) {
            console.error('Error fetching sales invoices:', salesError);
          }

          // Fetch purchase invoices
          const { data: purchaseInvoices, error: purchaseError } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount, invoice_date')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'purchase')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          if (purchaseError) {
            console.error('Error fetching purchase invoices:', purchaseError);
          }

          // Fetch labour invoices (as expenses)
          const { data: labourInvoices } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount, invoice_date, entity_type')
            .eq('company_id', selectedCompany.company_name)
            .eq('entity_type', 'labour')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          // Fetch transport invoices (as expenses)
          const { data: transportInvoices } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount, invoice_date, entity_type')
            .eq('company_id', selectedCompany.company_name)
            .eq('entity_type', 'transport')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          // Fetch returns to subtract from totals
          const { data: saleReturns } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sale_return')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          const { data: purchaseReturns } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'purchase_return')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          // Fetch sales invoice IDs first
          const salesInvoiceIds = (allSalesInvoices || []).map(inv => inv.id);
          
          // Fetch sales invoice items to calculate quantity sold for closing stock
          let salesInvoiceItems: any[] = [];
          if (salesInvoiceIds.length > 0) {
            const { data: itemsData } = await supabase
              .from('invoice_items')
              .select('quantity, unit_price, product_id, invoice_id')
              .in('invoice_id', salesInvoiceIds);
            salesInvoiceItems = itemsData || [];
          }

          // Calculate Opening Stock (current inventory cost = sum of current_stock * purchase_price)
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, current_stock, purchase_price, selling_price, gst_rate')
            .eq('company_id', selectedCompany.company_name);

          if (productsError) {
            console.error('Error fetching products for opening stock:', productsError);
          }

          // Calculate opening stock (inventory cost without tax)
          const openingStockCost = (products || []).reduce((sum, product) => {
            const stock = product.current_stock || 0;
            const purchasePrice = product.purchase_price || 0;
            return sum + (stock * purchasePrice);
          }, 0);

          // Calculate total inventory cost including tax (opening stock + purchase tax)
          const totalPurchases = (purchaseInvoices?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0) -
                                 (purchaseReturns?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0);
          const purchaseTax = (purchaseInvoices?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0) -
                              (purchaseReturns?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0);
          
          // Total inventory cost including tax = Opening Stock + Purchase Tax
          const totalInventoryCostWithTax = openingStockCost + purchaseTax;

          // Calculate total sales (all sales invoices)
          const totalSales = (allSalesInvoices?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0) -
                            (saleReturns?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0);
          const salesTax = (allSalesInvoices?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0) -
                          (saleReturns?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0);
          
          // Calculate total inventory selling price with tax
          const totalInventorySellingWithTax = (products || []).reduce((sum, product) => {
            const stock = product.current_stock || 0;
            const sellingPrice = product.selling_price || 0;
            const gstRate = product.gst_rate || 18; // Get GST rate from product
            const taxAmount = (stock * sellingPrice) * (gstRate / 100);
            return sum + (stock * sellingPrice) + taxAmount;
          }, 0);

          // Calculate closing stock: Opening Stock - Cost of Goods Sold
          // COGS = Sum of (quantity sold * purchase price) for each product
          const productCostMap = new Map<string, number>();
          (products || []).forEach(product => {
            if (product.id && product.purchase_price) {
              productCostMap.set(product.id, product.purchase_price);
            }
          });

          // Calculate cost of goods sold from actual invoice items
          let costOfGoodsSold = 0;
          (salesInvoiceItems || []).forEach(item => {
            if (item.product_id && productCostMap.has(item.product_id)) {
              const purchasePrice = productCostMap.get(item.product_id)!;
              costOfGoodsSold += (item.quantity || 0) * purchasePrice;
            }
          });

          // Calculate closing stock: Opening Stock - Cost of Goods Sold
          const closingStock = Math.max(0, openingStockCost - costOfGoodsSold);

          // Calculate indirect expenses (labour + transport invoices with tax)
          const labourExpenses = (labourInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
          const transportExpenses = (transportInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
          const indirectExpenses = labourExpenses + transportExpenses;

          // Fetch ledger entries for indirect income (income and expense ledgers)
          const { data: { user } } = await supabase.auth.getUser();
          
          // First get ledger IDs for the company
          const { data: companyLedgers } = await supabase
            .from('ledgers')
            .select('id, ledger_type')
            .eq('company_id', selectedCompany.company_name);
          
          const ledgerIds = (companyLedgers || []).map(l => l.id);
          const ledgerTypeMap = new Map((companyLedgers || []).map(l => [l.id, l.ledger_type]));
          
          // Then get ledger entries for those ledgers
          let ledgerEntries: any[] = [];
          if (ledgerIds.length > 0 && user?.id) {
            const { data: entriesData } = await supabase
              .from('ledger_entries')
              .select('debit_amount, credit_amount, ledger_id, entry_date')
              .in('ledger_id', ledgerIds)
              .eq('user_id', user.id)
              .gte('entry_date', dateFrom)
              .lte('entry_date', dateTo);
            
            // Add ledger type to each entry
            ledgerEntries = (entriesData || []).map(entry => ({
              ...entry,
              ledger_type: ledgerTypeMap.get(entry.ledger_id)
            }));
          }

          // Calculate indirect income from ledgers (income ledgers - expense ledgers)
          const ledgerIncome = (ledgerEntries || []).reduce((sum, entry) => {
            if (entry.ledger_type === 'income') {
              return sum + (entry.credit_amount || 0) - (entry.debit_amount || 0);
            } else if (entry.ledger_type === 'expense') {
              return sum - ((entry.debit_amount || 0) - (entry.credit_amount || 0));
            }
            return sum;
          }, 0);

          // Calculate cost of goods sold properly
          const effectiveCOGS = openingStockCost + totalPurchases - closingStock;
          
          // Calculate gross profit
          const grossProfit = totalSales - effectiveCOGS;
          
          // Calculate net profit (with indirect income and expenses)
          const netProfit = grossProfit - indirectExpenses + ledgerIncome - (purchaseTax - salesTax);

          console.log('Report totals - Sales:', totalSales, 'Purchases:', totalPurchases, 'Opening Stock:', openingStockCost, 'Closing Stock:', closingStock, 'COGS:', effectiveCOGS, 'Indirect Expenses:', indirectExpenses, 'Indirect Income:', ledgerIncome, 'Net Profit:', netProfit);

          sampleData = [
            { subcategory: 'Sales Account (All Sales Invoices)', amount: totalSales, category: 'Revenue' },
            { subcategory: 'Opening Stock', amount: openingStockCost, category: 'Cost of Goods Sold' },
            { subcategory: 'Purchase Account', amount: totalPurchases, category: 'Cost of Goods Sold' },
            { subcategory: 'Total Inventory Cost (with Tax)', amount: totalInventoryCostWithTax, category: 'Cost of Goods Sold' },
            { subcategory: 'Less: Closing Stock', amount: -closingStock, category: 'Cost of Goods Sold' },
            { subcategory: 'Cost of Goods Sold', amount: effectiveCOGS, category: 'Cost of Goods Sold' },
            { subcategory: '', amount: grossProfit, category: 'Gross Profit' },
            { subcategory: 'Labour Invoices (with Tax)', amount: labourExpenses, category: 'Indirect Expenses' },
            { subcategory: 'Transport Invoices (with Tax)', amount: transportExpenses, category: 'Indirect Expenses' },
            { subcategory: 'Total Indirect Expenses', amount: indirectExpenses, category: 'Indirect Expenses' },
            { subcategory: 'Indirect Income (Ledger)', amount: ledgerIncome, category: 'Indirect Income' },
            { subcategory: 'Sales Tax Collected', amount: salesTax, category: 'Taxes' },
            { subcategory: 'Purchase Tax Paid', amount: purchaseTax, category: 'Taxes' },
            { subcategory: 'Total Inventory Selling Price (with Tax)', amount: totalInventorySellingWithTax, category: 'Net Profit' },
            { subcategory: '', amount: netProfit, category: 'Net Profit' }
          ];
          newSummary = {
            totalSales,
            totalPurchases,
            grossProfit,
            netProfit
          };
          break;
        }
        
        case 'sales-report': {
          // Fetch all sales invoices
          const { data: salesData, error: salesDataError } = await supabase
            .from('invoices')
            .select(`
              invoice_number,
              invoice_date,
              subtotal,
              tax_amount,
              total_amount,
              payment_status,
              invoice_type,
              business_entities(name),
              suppliers(company_name)
            `)
            .eq('company_id', selectedCompany.company_name)
            .in('invoice_type', ['sales', 'sale_return'])
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo)
            .order('invoice_date', { ascending: false });

          if (salesDataError) {
            console.error('Error fetching sales report data:', salesDataError);
            toast({
              title: "Error",
              description: "Failed to fetch sales data: " + salesDataError.message,
              variant: "destructive"
            });
          }

          console.log('Sales report invoices found:', salesData?.length || 0);

          // Separate regular sales and returns
          const regularSales = (salesData || []).filter(inv => inv.invoice_type === 'sales');
          const saleReturns = (salesData || []).filter(inv => inv.invoice_type === 'sale_return');

          // Map regular sales
          const salesRows = regularSales.map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: inv.total_amount || 0,
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            customer: inv.business_entities?.name || inv.suppliers?.company_name || 'N/A',
            subtotal: inv.subtotal || 0,
            tax_amount: inv.tax_amount || 0,
            payment_status: inv.payment_status || 'due',
            invoice_type: 'sales'
          }));

          // Map return sales (negative amounts)
          const returnRows = saleReturns.map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: -(inv.total_amount || 0),
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            customer: inv.business_entities?.name || inv.suppliers?.company_name || 'N/A',
            subtotal: -(inv.subtotal || 0),
            tax_amount: -(inv.tax_amount || 0),
            payment_status: inv.payment_status || 'due',
            invoice_type: 'sale_return'
          }));

          sampleData = [...salesRows, ...returnRows];

          // Calculate totals (sales - returns)
          const totalSales = regularSales.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) -
                           saleReturns.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
          const totalTax = regularSales.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) -
                          saleReturns.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
          const totalAmount = regularSales.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) -
                             saleReturns.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

          newSummary = {
            totalSales,
            totalPurchases: 0,
            grossProfit: totalTax,
            netProfit: totalAmount
          };
          break;
        }

        case 'purchase-report': {
          // Fetch purchase orders
          const { data: purchaseOrders, error: poError } = await supabase
            .from('purchase_orders')
            .select(`
              po_number,
              order_date,
              subtotal,
              tax_amount,
              total_amount,
              status,
              suppliers(company_name),
              purchase_order_items(
                description,
                quantity,
                unit_price,
                line_total,
                received_quantity
              )
            `)
            .eq('company_id', selectedCompany.company_name)
            .gte('order_date', dateFrom)
            .lte('order_date', dateTo)
            .order('order_date', { ascending: false });

          if (poError) {
            console.error('Error fetching purchase orders:', poError);
          }

          // Fetch purchase invoices
          const { data: purchaseInvoices, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
              invoice_number,
              invoice_date,
              subtotal,
              tax_amount,
              total_amount,
              invoice_type,
              payment_status,
              suppliers(company_name),
              business_entities(name)
            `)
            .eq('company_id', selectedCompany.company_name)
            .in('invoice_type', ['purchase', 'purchase_return'])
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo)
            .order('invoice_date', { ascending: false });

          if (invoiceError) {
            console.error('Error fetching purchase invoices:', invoiceError);
            toast({
              title: "Error",
              description: "Failed to fetch purchase invoices: " + invoiceError.message,
              variant: "destructive"
            });
          }

          // Map purchase orders
          const poRows = (purchaseOrders || []).map(po => {
            const items = po.purchase_order_items || [];
            const totalItems = items.length;
            const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
            const receivedQuantity = items.reduce((sum: number, item: any) => sum + (item.received_quantity || 0), 0);
            
            return {
              subcategory: po.po_number || '',
              amount: po.total_amount || 0,
              category: new Date(po.order_date).toLocaleDateString('en-IN'),
              po_number: po.po_number,
              invoice_number: po.po_number,
              invoice_date: po.order_date,
              supplier: po.suppliers?.company_name || 'N/A',
              subtotal: po.subtotal || 0,
              tax_amount: po.tax_amount || 0,
              status: po.status || 'draft',
              payment_status: po.status || 'draft',
              total_items: totalItems,
              total_quantity: totalQuantity,
              received_quantity: receivedQuantity,
              record_type: 'PO'
            };
          });

          // Map purchase invoices
          const regularPurchases = (purchaseInvoices || []).filter(inv => inv.invoice_type === 'purchase');
          const purchaseReturns = (purchaseInvoices || []).filter(inv => inv.invoice_type === 'purchase_return');

          const purchaseInvoiceRows = regularPurchases.map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: inv.total_amount || 0,
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            supplier: inv.suppliers?.company_name || inv.business_entities?.name || 'N/A',
            subtotal: inv.subtotal || 0,
            tax_amount: inv.tax_amount || 0,
            payment_status: inv.payment_status || 'due',
            record_type: 'Purchase Invoice'
          }));

          // Map purchase returns (negative amounts)
          const returnInvoiceRows = purchaseReturns.map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: -(inv.total_amount || 0),
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            supplier: inv.suppliers?.company_name || inv.business_entities?.name || 'N/A',
            subtotal: -(inv.subtotal || 0),
            tax_amount: -(inv.tax_amount || 0),
            payment_status: inv.payment_status || 'due',
            record_type: 'Purchase Return'
          }));

          sampleData = [...poRows, ...purchaseInvoiceRows, ...returnInvoiceRows];

          // Calculate totals
          const totalPO = (purchaseOrders || []).reduce((sum, po) => sum + (po.subtotal || 0), 0);
          const totalPurchases = regularPurchases.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) -
                                purchaseReturns.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
          const totalTax = (purchaseOrders || []).reduce((sum, po) => sum + (po.tax_amount || 0), 0) +
                          regularPurchases.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) -
                          purchaseReturns.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
          const totalAmount = (purchaseOrders || []).reduce((sum, po) => sum + (po.total_amount || 0), 0) +
                             regularPurchases.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) -
                             purchaseReturns.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

          newSummary = {
            totalSales: 0,
            totalPurchases: totalPO + totalPurchases,
            grossProfit: totalTax,
            netProfit: totalAmount
          };
          break;
        }

        case 'invoice-aging': {
          // Fetch invoices with due or partial payment status
          const { data: agingInvoices, error: agingError } = await supabase
            .from('invoices')
            .select(`
              id,
              invoice_number,
              invoice_date,
              due_date,
              total_amount,
              payment_status,
              business_entities(name),
              suppliers(company_name)
            `)
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sales')
            .in('payment_status', ['due', 'partial'])
            .order('invoice_date', { ascending: false });

          if (agingError) {
            console.error('Error fetching aging invoices:', agingError);
            toast({
              title: "Error",
              description: "Failed to fetch aging invoices: " + agingError.message,
              variant: "destructive"
            });
          }

          // Fetch all payments for these invoices
          const invoiceIds = (agingInvoices || []).map(inv => inv.id);
          let paymentsMap = new Map<string, number>();
          
          if (invoiceIds.length > 0) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
              const { data: paymentsData } = await supabase
                .from('invoice_payments')
                .select('invoice_id, amount')
                .in('invoice_id', invoiceIds)
                .eq('user_id', user.id);

              (paymentsData || []).forEach(payment => {
                const current = paymentsMap.get(payment.invoice_id) || 0;
                paymentsMap.set(payment.invoice_id, current + (payment.amount || 0));
              });
            }
          }

          const now = new Date();
          const agingData = (agingInvoices || []).map(inv => {
            const dueDate = inv.due_date ? new Date(inv.due_date) : null;
            const totalPaid = paymentsMap.get(inv.id) || 0;
            const totalAmount = inv.total_amount || 0;
            const amountDue = totalAmount - totalPaid;
            
            // Calculate days overdue (negative if not yet due)
            let daysDiff = 0;
            if (dueDate) {
              daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            } else {
              // If no due date, calculate from invoice date (assume 30 days credit)
              const invoiceDate = new Date(inv.invoice_date);
              const assumedDueDate = new Date(invoiceDate);
              assumedDueDate.setDate(assumedDueDate.getDate() + 30);
              daysDiff = Math.floor((now.getTime() - assumedDueDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            
            let category = '0-30 days';
            let isOverdue = false;
            if (daysDiff > 90) {
              category = '90+ days';
              isOverdue = true;
            } else if (daysDiff > 60) {
              category = '61-90 days';
              isOverdue = true;
            } else if (daysDiff > 30) {
              category = '31-60 days';
              isOverdue = true;
            } else if (daysDiff > 0) {
              category = '0-30 days';
              isOverdue = true;
            } else {
              category = 'Not Due Yet';
            }

            return {
              subcategory: inv.invoice_number || '',
              amount: amountDue, // Show pending amount, not total amount
              category,
              invoice_number: inv.invoice_number,
              invoice_date: inv.invoice_date,
              due_date: inv.due_date || '',
              expiration_date: inv.due_date || '', // Use due_date as expiration date
              customer: inv.business_entities?.name || inv.suppliers?.company_name || 'N/A',
              total_amount: totalAmount,
              total_paid: totalPaid,
              amount_due: amountDue,
              payment_status: inv.payment_status || 'due',
              age_category: category,
              days_overdue: isOverdue ? daysDiff : 0,
              days_until_due: !isOverdue ? Math.abs(daysDiff) : 0
            };
          });

          // Filter to only show invoices with pending amounts
          const pendingInvoices = agingData.filter(inv => inv.amount_due > 0);

          sampleData = pendingInvoices;
          
          // Calculate totals
          const totalPending = pendingInvoices.reduce((sum, item) => sum + (item.amount_due || 0), 0);
          const totalOverdue = pendingInvoices
            .filter(item => item.days_overdue > 0)
            .reduce((sum, item) => sum + (item.amount_due || 0), 0);
          const totalPaidAmount = pendingInvoices.reduce((sum, item) => sum + (item.total_paid || 0), 0);
          const totalInvoiceAmount = pendingInvoices.reduce((sum, item) => sum + (item.total_amount || 0), 0);

          newSummary = {
            totalSales: totalPending,
            totalPurchases: totalOverdue,
            grossProfit: pendingInvoices.length,
            netProfit: totalPaidAmount
          };
          break;
        }

        case 'trial-balance': {
          // Fetch ledgers for the selected company with ledger entries for period transactions
          const { data: { user } } = await supabase.auth.getUser();
          const { data: ledgersData } = await supabase
            .from('ledgers')
            .select('id, name, ledger_type, current_balance, opening_balance')
            .eq('company_id', selectedCompany.company_name);

          // Fetch ledger entries for the period to calculate debits and credits
          const ledgerIds = (ledgersData || []).map(l => l.id);
          let ledgerEntriesMap = new Map<string, { debits: number; credits: number }>();
          
          if (ledgerIds.length > 0 && user?.id) {
            const { data: entriesData } = await supabase
              .from('ledger_entries')
              .select('ledger_id, debit_amount, credit_amount')
              .in('ledger_id', ledgerIds)
              .eq('user_id', user.id)
              .gte('entry_date', dateFrom)
              .lte('entry_date', dateTo);

            (entriesData || []).forEach(entry => {
              const ledgerId = entry.ledger_id;
              const current = ledgerEntriesMap.get(ledgerId) || { debits: 0, credits: 0 };
              ledgerEntriesMap.set(ledgerId, {
                debits: current.debits + (entry.debit_amount || 0),
                credits: current.credits + (entry.credit_amount || 0)
              });
            });
          }

          // Calculate all ledgers with opening, debits, credits, and closing balance
          sampleData = (ledgersData || []).map((l: any) => {
            const entries = ledgerEntriesMap.get(l.id) || { debits: 0, credits: 0 };
            const openingBalance = l.opening_balance || 0;
            const debits = entries.debits;
            const credits = entries.credits;
            // Closing balance = Opening + Credits - Debits (for liability/equity)
            // Or Opening + Debits - Credits (for asset/expense)
            const isCreditBalance = ['capital', 'equity', 'loan', 'payables', 'liability', 'income'].includes(l.ledger_type);
            const closingBalance = isCreditBalance 
              ? openingBalance + credits - debits
              : openingBalance + debits - credits;
            
            return {
              subcategory: l.name,
              amount: closingBalance,
              category: l.ledger_type || 'other',
              opening_balance: openingBalance,
              debits: debits,
              credits: credits,
              closing_balance: closingBalance,
              difference: closingBalance - openingBalance
            };
          });

          // Calculate totals
          const totalDebits = Array.from(ledgerEntriesMap.values()).reduce((sum, e) => sum + e.debits, 0);
          const totalCredits = Array.from(ledgerEntriesMap.values()).reduce((sum, e) => sum + e.credits, 0);
          const totalOpening = (ledgersData || []).reduce((sum, l: any) => sum + (l.opening_balance || 0), 0);
          const totalClosing = sampleData.reduce((sum, item: any) => sum + (item.closing_balance || 0), 0);

          newSummary = {
            totalSales: totalCredits,
            totalPurchases: totalDebits,
            grossProfit: totalClosing - totalOpening,
            netProfit: totalClosing
          };
          break;
        }
        
        case 'gst-report': {
          const { data: { user } } = await supabase.auth.getUser();
          
          // Fetch all GST entries for the company (all invoice types: sale/purchase/return/refund)
          let gstData: any[] = [];
          
          if (user?.id) {
            const { data, error } = await supabase
              .from('gst_entries')
              .select(`
                transaction_type,
                invoice_number,
                invoice_date,
                taxable_amount,
                cgst,
                sgst,
                igst,
                total_gst,
                invoices!inner(
                  company_id,
                  invoice_type
                )
              `)
              .eq('invoices.company_id', selectedCompany.company_name)
              .eq('user_id', user.id)
              .gte('invoice_date', dateFrom)
              .lte('invoice_date', dateTo)
              .order('invoice_date', { ascending: false });
            
            if (error) {
              console.error('Error fetching GST data:', error);
              toast({
                title: "Error",
                description: "Failed to fetch GST data: " + error.message,
                variant: "destructive"
              });
            } else {
              gstData = data || [];
            }
          }

          // Separate by transaction type
          const salesTransactions = (gstData || []).filter((g: any) => g.transaction_type === 'sale');
          const purchaseTransactions = (gstData || []).filter((g: any) => g.transaction_type === 'purchase');
          const saleReturns = (gstData || []).filter((g: any) => g.transaction_type === 'sale_return');
          const purchaseReturns = (gstData || []).filter((g: any) => g.transaction_type === 'purchase_return');

          // Calculate CGST totals (sales - returns)
          const salesCGST = salesTransactions.reduce((sum, g) => sum + (g.cgst || 0), 0);
          const purchaseCGST = purchaseTransactions.reduce((sum, g) => sum + (g.cgst || 0), 0);
          const saleReturnCGST = saleReturns.reduce((sum, g) => sum + (g.cgst || 0), 0);
          const purchaseReturnCGST = purchaseReturns.reduce((sum, g) => sum + (g.cgst || 0), 0);
          const cgstTotal = salesCGST + purchaseCGST - saleReturnCGST - purchaseReturnCGST;

          // Calculate SGST totals
          const salesSGST = salesTransactions.reduce((sum, g) => sum + (g.sgst || 0), 0);
          const purchaseSGST = purchaseTransactions.reduce((sum, g) => sum + (g.sgst || 0), 0);
          const saleReturnSGST = saleReturns.reduce((sum, g) => sum + (g.sgst || 0), 0);
          const purchaseReturnSGST = purchaseReturns.reduce((sum, g) => sum + (g.sgst || 0), 0);
          const sgstTotal = salesSGST + purchaseSGST - saleReturnSGST - purchaseReturnSGST;

          // Calculate IGST totals
          const salesIGST = salesTransactions.reduce((sum, g) => sum + (g.igst || 0), 0);
          const purchaseIGST = purchaseTransactions.reduce((sum, g) => sum + (g.igst || 0), 0);
          const saleReturnIGST = saleReturns.reduce((sum, g) => sum + (g.igst || 0), 0);
          const purchaseReturnIGST = purchaseReturns.reduce((sum, g) => sum + (g.igst || 0), 0);
          const igstTotal = salesIGST + purchaseIGST - saleReturnIGST - purchaseReturnIGST;

          // Calculate total GST
          const totalGST = cgstTotal + sgstTotal + igstTotal;

          // Map all GST entries for detailed view
          sampleData = (gstData || []).map((g: any) => ({
            subcategory: g.invoice_number || '',
            amount: g.total_gst || 0,
            category: g.transaction_type || '',
            invoice_number: g.invoice_number,
            invoice_date: g.invoice_date,
            transaction_type: g.transaction_type,
            taxable_amount: g.taxable_amount || 0,
            cgst: g.cgst || 0,
            sgst: g.sgst || 0,
            igst: g.igst || 0,
            total_gst: g.total_gst || 0
          }));

          newSummary = {
            totalSales: cgstTotal,
            totalPurchases: sgstTotal,
            grossProfit: igstTotal,
            netProfit: totalGST
          };
          break;
        }
        
        case 'payment-report': {
          const { data: { user } } = await supabase.auth.getUser();
          
          // Fetch payable ledgers (accounts payable)
          const { data: payableLedgers } = await supabase
            .from('ledgers')
            .select('id, name, current_balance, opening_balance')
            .eq('company_id', selectedCompany.company_name)
            .eq('ledger_type', 'payables');

          // Fetch receivable ledgers (accounts receivable)
          const { data: receivableLedgers } = await supabase
            .from('ledgers')
            .select('id, name, current_balance, opening_balance')
            .eq('company_id', selectedCompany.company_name)
            .eq('ledger_type', 'receivables');

          // Fetch ledger entries for payable and receivable ledgers
          const payableLedgerIds = (payableLedgers || []).map(l => l.id);
          const receivableLedgerIds = (receivableLedgers || []).map(l => l.id);
          const allLedgerIds = [...payableLedgerIds, ...receivableLedgerIds];

          let ledgerEntries: any[] = [];
          if (allLedgerIds.length > 0 && user?.id) {
            const { data: entriesData } = await supabase
              .from('ledger_entries')
              .select('ledger_id, debit_amount, credit_amount, description, entry_date')
              .in('ledger_id', allLedgerIds)
              .eq('user_id', user.id)
              .gte('entry_date', dateFrom)
              .lte('entry_date', dateTo)
              .order('entry_date', { ascending: false });
            ledgerEntries = entriesData || [];
          }

          // Fetch purchase invoices and returns
          const { data: purchaseInvoices } = await supabase
            .from('invoices')
            .select('invoice_number, invoice_date, total_amount, invoice_type, payment_status, suppliers(company_name), business_entities(name)')
            .eq('company_id', selectedCompany.company_name)
            .in('invoice_type', ['purchase', 'purchase_return'])
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo)
            .order('invoice_date', { ascending: false });

          // Map payable ledger entries
          const payableEntries = ledgerEntries
            .filter(e => payableLedgerIds.includes(e.ledger_id))
            .map(e => {
              const ledger = payableLedgers?.find(l => l.id === e.ledger_id);
              return {
                subcategory: ledger?.name || 'Payable',
                amount: e.debit_amount || 0,
                category: new Date(e.entry_date).toLocaleDateString('en-IN'),
                description: e.description,
                entry_date: e.entry_date,
                record_type: 'Payable Ledger',
                payment_status: 'due'
              };
            });

          // Map receivable ledger entries
          const receivableEntries = ledgerEntries
            .filter(e => receivableLedgerIds.includes(e.ledger_id))
            .map(e => {
              const ledger = receivableLedgers?.find(l => l.id === e.ledger_id);
              return {
                subcategory: ledger?.name || 'Receivable',
                amount: e.credit_amount || 0,
                category: new Date(e.entry_date).toLocaleDateString('en-IN'),
                description: e.description,
                entry_date: e.entry_date,
                record_type: 'Receivable Ledger',
                payment_status: 'due'
              };
            });

          // Map purchase invoices
          const regularPurchases = (purchaseInvoices || []).filter(inv => inv.invoice_type === 'purchase');
          const purchaseReturns = (purchaseInvoices || []).filter(inv => inv.invoice_type === 'purchase_return');

          const purchaseInvoiceRows = regularPurchases.map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: inv.total_amount || 0,
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            supplier: inv.suppliers?.company_name || inv.business_entities?.name || 'N/A',
            record_type: 'Purchase Invoice',
            payment_status: inv.payment_status || 'due'
          }));

          const purchaseReturnRows = purchaseReturns.map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: -(inv.total_amount || 0),
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            supplier: inv.suppliers?.company_name || inv.business_entities?.name || 'N/A',
            record_type: 'Purchase Return',
            payment_status: inv.payment_status || 'due'
          }));

          sampleData = [...payableEntries, ...receivableEntries, ...purchaseInvoiceRows, ...purchaseReturnRows];

          // Calculate totals
          const totalPayables = payableEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
          const totalReceivables = receivableEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
          const totalPurchases = regularPurchases.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) -
                                purchaseReturns.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

          newSummary = {
            totalSales: totalReceivables,
            totalPurchases: totalPayables + totalPurchases,
            grossProfit: sampleData.length,
            netProfit: totalReceivables - totalPayables - totalPurchases
          };
          break;
        }
        
        case 'ledger-summary': {
          sampleData = [
            { subcategory: 'Cash Account', amount: 50000, category: 'asset' },
            { subcategory: 'Bank Account', amount: 150000, category: 'asset' },
            { subcategory: 'Accounts Receivable', amount: 25000, category: 'asset' },
            { subcategory: 'Accounts Payable', amount: 75000, category: 'liability' },
            { subcategory: 'Sales Revenue', amount: newSummary.totalSales || 100000, category: 'income' },
            { subcategory: 'Purchase Expenses', amount: newSummary.totalPurchases || 60000, category: 'expense' }
          ];
          newSummary = {
            totalSales: 100000,
            totalPurchases: 60000,
            grossProfit: 40000,
            netProfit: 40000
          };
          break;
        }
        
        default: {
          sampleData = [];
          break;
        }
      }

      setReportData(sampleData);
      setSummary(newSummary);
      setGeneratedTime(new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
      
      const itemCount = sampleData.length;
      console.log(`Report generated successfully. Found ${itemCount} items for company ${selectedCompany.company_name} in date range ${dateFrom} to ${dateTo}`);
      
      toast({
        title: "Success",
        description: `Report generated for ${selectedCompany.company_name} - ${itemCount} ${itemCount === 1 ? 'item' : 'items'} found`,
        duration: 3000
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const exportReport = (format: 'pdf' | 'excel') => {
    toast({
      title: "Export Started",
      description: `Exporting report as ${format.toUpperCase()}...`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportReport('pdf')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => exportReport('excel')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Generate Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(report => (
                    <SelectItem key={report.id} value={report.id}>
                      <div className="flex items-center gap-2">
                        {report.icon}
                        {report.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={() => {
                  const range = getCurrentMonthRange();
                  setDateFrom(range.from);
                  setDateTo(range.to);
                }}
                variant="outline"
                className="flex-1"
              >
                Current Month
              </Button>
              <Button
                type="button"
                onClick={() => generateReport()}
                className="flex-1"
              >
                Refresh Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {reportData.length > 0 && (
        <div className="space-y-4">
          {/* Report Title */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedReport === 'profit-loss' && 'Profit & Loss Statement'}
                    {selectedReport === 'trial-balance' && 'Trial Balance'}
                    {selectedReport === 'sales-report' && 'Sales Report'}
                    {selectedReport === 'purchase-report' && 'Purchase Report'}
                    {selectedReport === 'gst-report' && 'GST Report'}
                    {selectedReport === 'payment-report' && 'Payment Report'}
                    {selectedReport === 'ledger-summary' && 'Ledger Summary'}
                    {selectedReport === 'invoice-aging' && 'Invoice Aging Report'}
                    {selectedCompany && (
                      <span className="text-muted-foreground font-normal text-base ml-2">
                        ({selectedCompany.company_name})
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(dateFrom)} to {formatDate(dateTo)}
                    {!selectedCompany && (
                      <span className="text-destructive ml-2">⚠️ Please select a company</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Generated: {generatedTime}</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Report Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedReport === 'profit-loss' && (
                      <>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </>
                    )}
                    {selectedReport === 'trial-balance' && (
                      <>
                        <TableHead>Ledger Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Opening Balance</TableHead>
                        <TableHead className="text-right">Debits</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead className="text-right">Closing Balance</TableHead>
                      </>
                    )}
                    {selectedReport === 'sales-report' && (
                      <>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                    {selectedReport === 'purchase-report' && (
                      <>
                        <TableHead>PO #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                    {selectedReport === 'gst-report' && (
                      <>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead>GST Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Tax Amount</TableHead>
                      </>
                    )}
                    {selectedReport === 'payment-report' && (
                      <>
                        <TableHead>Payment Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                    {selectedReport === 'ledger-summary' && (
                      <>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Opening Balance</TableHead>
                        <TableHead className="text-right">Debits</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead className="text-right">Closing Balance</TableHead>
                      </>
                    )}
                    {selectedReport === 'invoice-aging' && (
                      <>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Age Category</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      {selectedReport === 'profit-loss' && (
                        <>
                          <TableCell className="font-medium">
                            <span className="text-muted-foreground italic">
                              {row.category}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.subcategory || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={row.amount < 0 ? 'text-red-500' : 'text-green-500'}>
                              {formatIndianCurrency(Math.abs(row.amount))}
                              {row.amount < 0 && ' -'}
                            </span>
                          </TableCell>
                        </>
                      )}
                      {selectedReport === 'trial-balance' && (
                        <>
                          <TableCell className="font-medium">{row.subcategory}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount >= 0 ? row.amount : 0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(Math.abs(row.amount))}</TableCell>
                        </>
                      )}
                      {selectedReport === 'sales-report' && (
                        <>
                          <TableCell className="font-medium">{row.invoice_number || row.subcategory}</TableCell>
                          <TableCell>{row.invoice_date ? formatDate(row.invoice_date) : row.category}</TableCell>
                          <TableCell>{row.customer || 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.subtotal || 0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.tax_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">
                            {formatIndianCurrency((row.payment_status === 'paid' ? row.amount : 0) || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.payment_status === 'paid' ? 'default' : 'outline'}>
                              {row.payment_status || 'due'}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      {selectedReport === 'purchase-report' && (
                        <>
                          <TableCell className="font-medium">{row.po_number || row.subcategory}</TableCell>
                          <TableCell>{row.invoice_date ? formatDate(row.invoice_date) : row.category}</TableCell>
                          <TableCell>{row.supplier || 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.subtotal || 0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.tax_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(0)}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'received' ? 'default' : 'outline'}>
                              {row.status || 'draft'}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      {selectedReport === 'gst-report' && (
                        <>
                          <TableCell className="font-medium">{row.subcategory}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(5000)}</TableCell>
                          <TableCell className="text-right">18%</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                        </>
                      )}
                      {selectedReport === 'payment-report' && (
                        <>
                          <TableCell className="font-medium">{row.payment_method === 'cash' ? 'Cash Payment' : row.payment_method === 'bank_transfer' ? 'Bank Transfer' : row.payment_method || 'Cash'}</TableCell>
                          <TableCell>{row.invoice_date ? formatDate(row.invoice_date) : row.category}</TableCell>
                          <TableCell>{row.invoice_number || `REF-${index + 1}`}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {row.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
                               row.payment_method === 'upi' ? 'UPI' :
                               row.payment_method === 'cheque' ? 'Cheque' :
                               row.payment_method === 'credit_card' ? 'Credit Card' : 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">Completed</Badge>
                          </TableCell>
                        </>
                      )}
                      {selectedReport === 'ledger-summary' && (
                        <>
                          <TableCell className="font-medium">{row.subcategory}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              row.category === 'asset' ? 'text-green-500' :
                              row.category === 'liability' ? 'text-red-500' :
                              row.category === 'income' ? 'text-blue-500' : 'text-orange-500'
                            }>
                              {row.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(10000)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(15000)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount + 5000)}</TableCell>
                        </>
                      )}
                      {selectedReport === 'invoice-aging' && (
                        <>
                          <TableCell className="font-medium">{row.invoice_number || row.subcategory}</TableCell>
                          <TableCell>{row.customer || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              row.age_category === 'Not Due Yet' ? 'text-blue-500' :
                              row.age_category === '0-30 days' ? 'text-green-500' :
                              row.age_category === '31-60 days' ? 'text-yellow-500' :
                              row.age_category === '61-90 days' ? 'text-orange-500' : 'text-red-500'
                            }>
                              {row.age_category || row.category || '0-30 days'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.total_amount || row.amount || 0)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatIndianCurrency(row.total_paid || 0)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatIndianCurrency(row.amount_due || row.amount || 0)}</TableCell>
                          <TableCell>{row.due_date || row.expiration_date ? formatDate(row.due_date || row.expiration_date) : 'N/A'}</TableCell>
                          <TableCell>
                            {row.days_overdue > 0 ? (
                              <span className="text-red-600 font-medium">{row.days_overdue} days</span>
                            ) : row.days_until_due > 0 ? (
                              <span className="text-blue-600">{row.days_until_due} days</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              row.payment_status === 'paid' ? 'default' :
                              row.payment_status === 'partial' ? 'secondary' : 'destructive'
                            }>
                              {row.payment_status === 'paid' ? 'Paid' :
                               row.payment_status === 'partial' ? 'Partial' : 'Due'}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedReport === 'profit-loss' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(summary.totalSales)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Purchases</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(summary.totalPurchases)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Gross Profit</p>
                      <p className={`text-lg font-semibold ${summary.grossProfit < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatIndianCurrency(Math.abs(summary.grossProfit))}
                        {summary.grossProfit < 0 && ' -'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <p className={`text-lg font-semibold ${summary.netProfit < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatIndianCurrency(Math.abs(summary.netProfit))}
                        {summary.netProfit < 0 && ' -'}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'trial-balance' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(30000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(35000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Difference</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {formatIndianCurrency(5000)}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'sales-report' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(summary.totalSales)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Tax</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {formatIndianCurrency(summary.grossProfit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(summary.netProfit)}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'purchase-report' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Purchases</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(summary.totalPurchases)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Tax</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {formatIndianCurrency(summary.grossProfit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(2000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(summary.netProfit)}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'gst-report' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total CGST</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {formatIndianCurrency(900)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total SGST</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(900)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total IGST</p>
                      <p className="text-lg font-semibold text-orange-500">
                        {formatIndianCurrency(76900)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Net GST</p>
                      <p className="text-lg font-semibold text-purple-500">
                        {formatIndianCurrency(summary.netProfit)}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'payment-report' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Payments</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(summary.grossProfit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Cash Payments</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {formatIndianCurrency(5000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Bank Transfers</p>
                      <p className="text-lg font-semibold text-purple-500">
                        {formatIndianCurrency(50000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Other Payments</p>
                      <p className="text-lg font-semibold text-orange-500">
                        {formatIndianCurrency(40000)}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'ledger-summary' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Assets</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(225000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Liabilities</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(75000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {formatIndianCurrency(100000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-lg font-semibold text-orange-500">
                        {formatIndianCurrency(60000)}
                      </p>
                    </div>
                  </>
                )}
                
                {selectedReport === 'invoice-aging' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Pending</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(summary.totalSales)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Overdue</p>
                      <p className="text-lg font-semibold text-orange-500">
                        {formatIndianCurrency(summary.totalPurchases)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(summary.netProfit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Invoices Count</p>
                      <p className="text-lg font-semibold text-blue-500">
                        {summary.grossProfit}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating report...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
