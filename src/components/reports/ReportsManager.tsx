import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [selectedReport, setSelectedReport] = useState<string>('invoice-aging');
  const [dateFrom, setDateFrom] = useState('2025-03-31');
  const [dateTo, setDateTo] = useState('2025-09-20');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalSales: 5900,
    totalPurchases: 509900,
    grossProfit: -504000,
    netProfit: -504000
  });
  const [generatedTime, setGeneratedTime] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Set default date range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedReport) {
      generateReport();
    }
  }, [selectedReport, dateFrom, dateTo]);

  const generateReport = async () => {
    if (!dateFrom || !dateTo) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate sample data based on report type
      let sampleData: ReportRow[] = [];
      let newSummary: ReportSummary = {
        totalSales: 0,
        totalPurchases: 0,
        grossProfit: 0,
        netProfit: 0
      };

      switch (selectedReport) {
        case 'profit-loss':
          sampleData = [
            { subcategory: 'Sales Revenue', amount: 5900, category: 'Revenue' },
            { subcategory: 'Purchases', amount: 509900, category: 'Cost of Goods Sold' },
            { subcategory: '', amount: -504000, category: 'Gross Profit' },
            { subcategory: 'Sales Tax Collected', amount: 900, category: 'Taxes' },
            { subcategory: 'Purchase Tax Paid', amount: 76900, category: 'Taxes' },
            { subcategory: '', amount: -504000, category: 'Net Profit' }
          ];
          newSummary = {
            totalSales: 5900,
            totalPurchases: 509900,
            grossProfit: -504000,
            netProfit: -504000
          };
          break;
        
        case 'trial-balance':
          sampleData = [
            { subcategory: 'test', amount: 510000, category: 'payables' },
            { subcategory: 'SBI', amount: 15000, category: 'bank' }
          ];
          newSummary = {
            totalSales: 30000,
            totalPurchases: 35000,
            grossProfit: 5000,
            netProfit: 5000
          };
          break;
        
        case 'sales-report':
          sampleData = [
            { subcategory: 'INV-202509-792845', amount: 5900, category: '14/9/2025' }
          ];
          newSummary = {
            totalSales: 5900,
            totalPurchases: 0,
            grossProfit: 900,
            netProfit: 5900
          };
          break;
        
        case 'purchase-report':
          sampleData = [
            { subcategory: 'Laptop Dell XPS 13', amount: 100300, category: '20/9/2025' },
            { subcategory: 'Laptop Dell XPS 13', amount: 100300, category: '20/9/2025' },
            { subcategory: 'Laptop Dell XPS 13', amount: 100300, category: '20/9/2025' },
            { subcategory: 'Laptop Dell XPS 13', amount: 100300, category: '20/9/2025' },
            { subcategory: 'Laptop Dell XPS 13', amount: 100300, category: '20/9/2025' },
            { subcategory: 'Laptop Bag', amount: 2000, category: '20/9/2025' }
          ];
          newSummary = {
            totalSales: 0,
            totalPurchases: 509900,
            grossProfit: 76900,
            netProfit: 507900
          };
          break;
        
        case 'gst-report':
          sampleData = [
            { subcategory: 'Sales Tax Collected', amount: 900, category: 'CGST' },
            { subcategory: 'Sales Tax Collected', amount: 900, category: 'SGST' },
            { subcategory: 'Purchase Tax Paid', amount: 76900, category: 'IGST' },
            { subcategory: 'GST Refund', amount: 5000, category: 'Refund' }
          ];
          newSummary = {
            totalSales: 0,
            totalPurchases: 0,
            grossProfit: 90000,
            netProfit: 85000
          };
          break;
        
        case 'payment-report':
          sampleData = [
            { subcategory: 'Customer Payment', amount: 25000, category: '14/9/2025' },
            { subcategory: 'Supplier Payment', amount: 15000, category: '15/9/2025' },
            { subcategory: 'Bank Transfer', amount: 50000, category: '16/9/2025' },
            { subcategory: 'Cash Payment', amount: 5000, category: '17/9/2025' }
          ];
          newSummary = {
            totalSales: 0,
            totalPurchases: 0,
            grossProfit: 95000,
            netProfit: 95000
          };
          break;
        
        case 'ledger-summary':
          sampleData = [
            { subcategory: 'Cash Account', amount: 50000, category: 'asset' },
            { subcategory: 'Bank Account', amount: 150000, category: 'asset' },
            { subcategory: 'Accounts Receivable', amount: 25000, category: 'asset' },
            { subcategory: 'Accounts Payable', amount: 75000, category: 'liability' },
            { subcategory: 'Sales Revenue', amount: 100000, category: 'income' },
            { subcategory: 'Purchase Expenses', amount: 60000, category: 'expense' }
          ];
          newSummary = {
            totalSales: 100000,
            totalPurchases: 60000,
            grossProfit: 40000,
            netProfit: 40000
          };
          break;
        
        case 'invoice-aging':
          sampleData = [
            { subcategory: 'INV-001', amount: 15000, category: '0-30 days' },
            { subcategory: 'INV-002', amount: 25000, category: '31-60 days' },
            { subcategory: 'INV-003', amount: 10000, category: '61-90 days' },
            { subcategory: 'INV-004', amount: 5000, category: '90+ days' }
          ];
          newSummary = {
            totalSales: 55000,
            totalPurchases: 0,
            grossProfit: 0,
            netProfit: 55000
          };
          break;
        
        default:
          sampleData = [];
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
      
      toast({
        title: "Success",
        description: "Report generated successfully"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </CardTitle>
                  <CardDescription>
                    {formatDate(dateFrom)} to {formatDate(dateTo)}
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
                          <TableCell className="text-right">{formatIndianCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(25000)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(35000)}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(row.amount + 10000)}</TableCell>
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
