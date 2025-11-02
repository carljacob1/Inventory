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
          // Fetch actual sales invoices
          const { data: salesInvoices, error: salesError } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount, invoice_date')
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

          console.log('Sales invoices found:', salesInvoices?.length || 0);
          console.log('Purchase invoices found:', purchaseInvoices?.length || 0);

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

          // Calculate totals (subtract returns)
          const totalSales = (salesInvoices?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0) -
                            (saleReturns?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0);
          const totalPurchases = (purchaseInvoices?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0) -
                                 (purchaseReturns?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0);
          const salesTax = (salesInvoices?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0) -
                          (saleReturns?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0);
          const purchaseTax = (purchaseInvoices?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0) -
                              (purchaseReturns?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0);
          const grossProfit = totalSales - totalPurchases;
          const netProfit = grossProfit - (purchaseTax - salesTax);

          console.log('Report totals - Sales:', totalSales, 'Purchases:', totalPurchases, 'Profit:', netProfit);

          sampleData = [
            { subcategory: 'Sales Revenue', amount: totalSales, category: 'Revenue' },
            { subcategory: 'Purchases', amount: totalPurchases, category: 'Cost of Goods Sold' },
            { subcategory: '', amount: grossProfit, category: 'Gross Profit' },
            { subcategory: 'Sales Tax Collected', amount: salesTax, category: 'Taxes' },
            { subcategory: 'Purchase Tax Paid', amount: purchaseTax, category: 'Taxes' },
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
          const { data: salesData, error: salesDataError } = await supabase
            .from('invoices')
            .select(`
              invoice_number,
              invoice_date,
              subtotal,
              tax_amount,
              total_amount,
              payment_status,
              business_entities(name),
              suppliers(company_name)
            `)
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sales')
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

          sampleData = (salesData || []).map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: inv.total_amount || 0,
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN')
          }));

          newSummary = {
            totalSales: (salesData || []).reduce((sum, inv) => sum + (inv.subtotal || 0), 0),
            totalPurchases: 0,
            grossProfit: (salesData || []).reduce((sum, inv) => sum + (inv.tax_amount || 0), 0),
            netProfit: (salesData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
          };
          break;
        }

        case 'purchase-report': {
          const { data: purchaseData } = await supabase
            .from('purchase_orders')
            .select(`
              po_number,
              order_date,
              subtotal,
              tax_amount,
              total_amount,
              status,
              suppliers(company_name)
            `)
            .eq('company_id', selectedCompany.company_name)
            .gte('order_date', dateFrom)
            .lte('order_date', dateTo)
            .order('order_date', { ascending: false });

          sampleData = (purchaseData || []).map(po => ({
            subcategory: po.po_number || '',
            amount: po.total_amount || 0,
            category: new Date(po.order_date).toLocaleDateString('en-IN')
          }));

          newSummary = {
            totalSales: 0,
            totalPurchases: (purchaseData || []).reduce((sum, po) => sum + (po.subtotal || 0), 0),
            grossProfit: (purchaseData || []).reduce((sum, po) => sum + (po.tax_amount || 0), 0),
            netProfit: (purchaseData || []).reduce((sum, po) => sum + (po.total_amount || 0), 0)
          };
          break;
        }

        case 'invoice-aging': {
          const { data: agingInvoices, error: agingError } = await supabase
            .from('invoices')
            .select('invoice_number, invoice_date, due_date, total_amount, payment_status')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sales')
            .order('invoice_date', { ascending: false });

          if (agingError) {
            console.error('Error fetching aging invoices:', agingError);
          }

          const now = new Date();
          const agingData = (agingInvoices || []).map(inv => {
            const dueDate = inv.due_date ? new Date(inv.due_date) : null;
            const daysDiff = dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
            let category = '0-30 days';
            if (daysDiff > 90) category = '90+ days';
            else if (daysDiff > 60) category = '61-90 days';
            else if (daysDiff > 30) category = '31-60 days';

            return {
              subcategory: inv.invoice_number || '',
              amount: inv.total_amount || 0,
              category
            };
          });

          sampleData = agingData;
          newSummary = {
            totalSales: agingData.reduce((sum, item) => sum + item.amount, 0),
            totalPurchases: 0,
            grossProfit: 0,
            netProfit: agingData.reduce((sum, item) => sum + item.amount, 0)
          };
          break;
        }

        case 'trial-balance': {
          // Fetch ledgers for the selected company
          const { data: ledgersData } = await supabase
            .from('ledgers')
            .select('name, ledger_type, current_balance, opening_balance')
            .eq('company_id', selectedCompany.company_name);

          // Fetch sales invoices
          const { data: salesInvoicesTB } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sales')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          // Fetch purchase invoices
          const { data: purchaseInvoicesTB } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'purchase')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          // Fetch sale returns (negative sales)
          const { data: saleReturnsTB } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'sale_return')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          // Fetch purchase returns (negative purchases)
          const { data: purchaseReturnsTB } = await supabase
            .from('invoices')
            .select('subtotal, tax_amount, total_amount')
            .eq('company_id', selectedCompany.company_name)
            .eq('invoice_type', 'purchase_return')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          const totalSales = (salesInvoicesTB || []).reduce((sum, inv) => sum + (inv.subtotal || 0), 0) -
                            (saleReturnsTB || []).reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
          const totalPurchases = (purchaseInvoicesTB || []).reduce((sum, inv) => sum + (inv.subtotal || 0), 0) -
                                (purchaseReturnsTB || []).reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
          const grossProfit = totalSales - totalPurchases;

          // Organize ledgers by type
          const capitalLedgers = (ledgersData || []).filter((l: any) => l.ledger_type === 'capital' || l.ledger_type === 'equity');
          const loanLedgers = (ledgersData || []).filter((l: any) => l.ledger_type === 'loan');
          const liabilityLedgers = (ledgersData || []).filter((l: any) => l.ledger_type === 'payables' || l.ledger_type === 'liability');
          const fixedAssetsLedgers = (ledgersData || []).filter((l: any) => l.ledger_type === 'asset' || l.ledger_type === 'fixed_asset');
          const currentAssetsLedgers = (ledgersData || []).filter((l: any) => l.ledger_type === 'bank' || l.ledger_type === 'cash' || l.ledger_type === 'receivables');
          const branchLedgers = (ledgersData || []).filter((l: any) => l.ledger_type === 'branch' || l.ledger_type === 'division');

          sampleData = [
            // Capital Account
            ...capitalLedgers.map((l: any) => ({
              subcategory: l.name,
              amount: l.current_balance || 0,
              category: 'Capital Account'
            })),
            // Loan Account
            ...loanLedgers.map((l: any) => ({
              subcategory: l.name,
              amount: l.current_balance || 0,
              category: 'Loan Account'
            })),
            // Current Liability
            ...liabilityLedgers.map((l: any) => ({
              subcategory: l.name,
              amount: l.current_balance || 0,
              category: 'Current Liability'
            })),
            // Fixed Assets
            ...fixedAssetsLedgers.map((l: any) => ({
              subcategory: l.name,
              amount: l.current_balance || 0,
              category: 'Fixed Assets'
            })),
            // Current Assets
            ...currentAssetsLedgers.map((l: any) => ({
              subcategory: l.name,
              amount: l.current_balance || 0,
              category: 'Current Assets'
            })),
            // Branch/Division
            ...branchLedgers.map((l: any) => ({
              subcategory: l.name,
              amount: l.current_balance || 0,
              category: 'Branch/Division'
            })),
            // Sales Account
            {
              subcategory: 'Sales Revenue',
              amount: totalSales,
              category: 'Sales Account'
            },
            // Purchase Account
            {
              subcategory: 'Purchase Expenses',
              amount: totalPurchases,
              category: 'Purchase Account'
            },
            // Direct Expenses (placeholder - should come from expense ledgers)
            {
              subcategory: 'Direct Expenses',
              amount: 0,
              category: 'Direct Expenses'
            },
            // Indirect Expenses (placeholder - should come from expense ledgers)
            {
              subcategory: 'Indirect Expenses',
              amount: 0,
              category: 'Indirect Expenses'
            },
            // Unadjusted/Forex Gain Loss
            {
              subcategory: 'Unadjusted/Forex Gain Loss',
              amount: 0,
              category: 'Unadjusted/Forex Gain Loss'
            },
            // Gross Profit
            {
              subcategory: 'Gross Profit',
              amount: grossProfit,
              category: 'Gross Profit'
            },
            // Net Profit (will be calculated)
            {
              subcategory: 'Net Profit',
              amount: grossProfit,
              category: 'Net Profit'
            }
          ];

          newSummary = {
            totalSales,
            totalPurchases,
            grossProfit,
            netProfit: grossProfit
          };
          break;
        }
        
        case 'gst-report': {
          const { data: { user } } = await supabase.auth.getUser();
          
          // First, get invoice IDs for the selected company
          const { data: companyInvoices } = await supabase
            .from('invoices')
            .select('id')
            .eq('company_id', selectedCompany.company_name)
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);
          
          const invoiceIds = (companyInvoices || []).map(inv => inv.id);
          
          // Then fetch GST entries for those invoices
          let gstData: any[] = [];
          
          if (invoiceIds.length > 0) {
            const { data, error } = await supabase
              .from('gst_entries')
              .select('transaction_type, cgst, sgst, igst, total_gst')
              .eq('user_id', user?.id)
              .in('invoice_id', invoiceIds)
              .gte('invoice_date', dateFrom)
              .lte('invoice_date', dateTo);
            
            if (error) {
              console.error('Error fetching GST data:', error);
            } else {
              gstData = data || [];
            }
          }

          // Separate regular transactions from returns
          const regularTransactions = (gstData || []).filter((g: any) => 
            g.transaction_type === 'sale' || g.transaction_type === 'purchase'
          );
          const returnTransactions = (gstData || []).filter((g: any) => 
            g.transaction_type === 'sale_return' || g.transaction_type === 'purchase_return'
          );

          // Calculate totals (regular transactions add, returns subtract)
          const cgstTotal = (regularTransactions.reduce((sum, g) => sum + (g.cgst || 0), 0) || 0) -
                           (returnTransactions.reduce((sum, g) => sum + (g.cgst || 0), 0) || 0);
          const sgstTotal = (regularTransactions.reduce((sum, g) => sum + (g.sgst || 0), 0) || 0) -
                           (returnTransactions.reduce((sum, g) => sum + (g.sgst || 0), 0) || 0);
          const igstTotal = (regularTransactions.reduce((sum, g) => sum + (g.igst || 0), 0) || 0) -
                           (returnTransactions.reduce((sum, g) => sum + (g.igst || 0), 0) || 0);
          const totalGST = (regularTransactions.reduce((sum, g) => sum + (g.total_gst || 0), 0) || 0) -
                          (returnTransactions.reduce((sum, g) => sum + (g.total_gst || 0), 0) || 0);

          sampleData = [
            { subcategory: 'Sales Tax Collected', amount: cgstTotal, category: 'CGST' },
            { subcategory: 'Sales Tax Collected', amount: sgstTotal, category: 'SGST' },
            { subcategory: 'Purchase Tax Paid', amount: igstTotal, category: 'IGST' },
            { subcategory: 'GST Refund', amount: 0, category: 'Refund' }
          ];
          newSummary = {
            totalSales: 0,
            totalPurchases: 0,
            grossProfit: cgstTotal + sgstTotal + igstTotal,
            netProfit: totalGST
          };
          break;
        }
        
        case 'payment-report': {
          // Fetch invoices with payment status
          const { data: paymentData } = await supabase
            .from('invoices')
            .select('invoice_number, invoice_date, total_amount, payment_status')
            .eq('company_id', selectedCompany.company_name)
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

          sampleData = (paymentData || []).map(inv => ({
            subcategory: inv.invoice_number || '',
            amount: inv.total_amount || 0,
            category: new Date(inv.invoice_date).toLocaleDateString('en-IN')
          }));

          newSummary = {
            totalSales: (paymentData || []).filter(inv => inv.payment_status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
            totalPurchases: 0,
            grossProfit: (paymentData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
            netProfit: (paymentData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
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
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Due Date</TableHead>
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
                          <TableCell className="font-medium">{row.subcategory}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(5000)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(900)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(0)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-500">paid</Badge>
                          </TableCell>
                        </>
                      )}
                      {selectedReport === 'purchase-report' && (
                        <>
                          <TableCell className="font-medium">PO-{index + 1}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(85000)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(15300)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(index === 5 ? 2000 : 0)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={index < 3 ? 'text-yellow-500' : 'text-green-500'}>
                              {index < 3 ? 'draft' : 'received'}
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
                          <TableCell className="font-medium">{row.subcategory}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>REF-{index + 1}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-blue-500">
                              {index % 2 === 0 ? 'Bank Transfer' : 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-500">Completed</Badge>
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
                          <TableCell className="font-medium">{row.subcategory}</TableCell>
                          <TableCell>Customer {index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              row.category === '0-30 days' ? 'text-green-500' :
                              row.category === '31-60 days' ? 'text-yellow-500' :
                              row.category === '61-90 days' ? 'text-orange-500' : 'text-red-500'
                            }>
                              {row.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell>{new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-red-500">Overdue</Badge>
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
                      <p className="text-sm text-muted-foreground">0-30 Days</p>
                      <p className="text-lg font-semibold text-green-500">
                        {formatIndianCurrency(15000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">31-60 Days</p>
                      <p className="text-lg font-semibold text-yellow-500">
                        {formatIndianCurrency(25000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">61-90 Days</p>
                      <p className="text-lg font-semibold text-orange-500">
                        {formatIndianCurrency(10000)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">90+ Days</p>
                      <p className="text-lg font-semibold text-red-500">
                        {formatIndianCurrency(5000)}
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
