import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Download, 
  Filter, 
  Calendar,
  FileText,
  IndianRupee,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { formatIndianCurrency, getCurrentFinancialYear } from "@/utils/indianBusiness";
import { StatCard } from "@/components/inventory/StatCard";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pdf } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/pdf/ReportPDF";

interface GSTData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  entity_type: string;
  invoice_type: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  business_entities?: {
    name: string;
    gstin: string;
  };
  suppliers?: {
    company_name: string;
    gstin: string;
  };
  invoice_items: {
    gst_rate: number;
    line_total: number;
  }[];
}

interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  taxableAmount: number;
}

export const GSTTracker = () => {
  const [gstData, setGstData] = useState<GSTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [entityType, setEntityType] = useState<string>("all");
  const [invoiceType, setInvoiceType] = useState<string>("all");
  const [gstBreakdown, setGstBreakdown] = useState<GSTBreakdown>({
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 0,
    taxableAmount: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    const fy = getCurrentFinancialYear();
    setDateFrom(fy.start.toISOString().split('T')[0]);
    setDateTo(fy.end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchGSTData();
    }
  }, [dateFrom, dateTo, entityType, invoiceType]);

  const fetchGSTData = async () => {
    try {
      setLoading(true);
      
      // Get all invoices - both sales and purchase
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          entity_type,
          invoice_type,
          subtotal,
          tax_amount,
          total_amount,
          business_entities (
            name,
            gstin
          ),
          suppliers (
            company_name,
            gstin
          ),
          invoice_items (
            gst_rate,
            line_total
          )
        `)
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo)
        .order('invoice_date', { ascending: false });

      if (entityType !== 'all') {
        query = query.eq('entity_type', entityType);
      }

      if (invoiceType !== 'all') {
        query = query.eq('invoice_type', invoiceType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setGstData(data || []);
      calculateGSTBreakdown(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load GST data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGSTBreakdown = (data: GSTData[]) => {
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalTaxableAmount = 0;

    data.forEach(invoice => {
      totalTaxableAmount += invoice.subtotal;
      
      // Calculate CGST, SGST, IGST based on transaction type
      // For simplicity, assuming intra-state = CGST+SGST, inter-state = IGST
      const isInterState = invoice.entity_type === 'interstate' || 
                          (invoice.business_entities?.gstin && 
                           invoice.suppliers?.gstin && 
                           invoice.business_entities.gstin.substring(0, 2) !== 
                           invoice.suppliers.gstin.substring(0, 2));

      if (isInterState) {
        totalIGST += invoice.tax_amount;
      } else {
        totalCGST += invoice.tax_amount / 2;
        totalSGST += invoice.tax_amount / 2;
      }
    });

    setGstBreakdown({
      cgst: totalCGST,
      sgst: totalSGST,
      igst: totalIGST,
      total: totalCGST + totalSGST + totalIGST,
      taxableAmount: totalTaxableAmount
    });
  };

  const exportGSTReport = async (format: 'pdf' | 'excel') => {
    try {
      if (format === 'pdf') {
        const reportData = {
          title: "GST Tax Report",
          subtitle: `Period: ${dateFrom} to ${dateTo}`,
          generatedDate: new Date(),
          columns: [
            { key: 'invoice_date', label: 'Date', width: '15%' },
            { key: 'invoice_number', label: 'Invoice No.', width: '15%' },
            { key: 'entity_name', label: 'Entity', width: '20%' },
            { key: 'invoice_type', label: 'Type', width: '10%' },
            { key: 'subtotal', label: 'Taxable Amount', width: '15%', format: 'currency' as const },
            { key: 'tax_amount', label: 'GST Amount', width: '15%', format: 'currency' as const },
            { key: 'total_amount', label: 'Total', width: '10%', format: 'currency' as const }
          ],
          data: gstData.map(item => ({
            invoice_date: new Date(item.invoice_date).toLocaleDateString('en-IN'),
            invoice_number: item.invoice_number,
            entity_name: item.business_entities?.name || item.suppliers?.company_name || 'N/A',
            invoice_type: item.invoice_type.toUpperCase(),
            subtotal: item.subtotal,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount
          })),
          summary: [
            { label: 'Total Taxable Amount', value: formatIndianCurrency(gstBreakdown.taxableAmount) },
            { label: 'CGST', value: formatIndianCurrency(gstBreakdown.cgst) },
            { label: 'SGST', value: formatIndianCurrency(gstBreakdown.sgst) },
            { label: 'IGST', value: formatIndianCurrency(gstBreakdown.igst) },
            { label: 'Total GST', value: formatIndianCurrency(gstBreakdown.total) }
          ]
        };

        const pdfDoc = <ReportPDF reportData={reportData} />;
        const blob = await pdf(pdfDoc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gst-report-${dateFrom}-to-${dateTo}.pdf`;
        link.click();
        URL.revokeObjectURL(url);

        toast({ title: "Success", description: "GST report exported as PDF" });
      } else {
        // Excel export
        const csvContent = [
          ['Date', 'Invoice No.', 'Entity', 'Type', 'Taxable Amount', 'GST Amount', 'Total'],
          ...gstData.map(item => [
            new Date(item.invoice_date).toLocaleDateString('en-IN'),
            item.invoice_number,
            item.business_entities?.name || item.suppliers?.company_name || 'N/A',
            item.invoice_type.toUpperCase(),
            item.subtotal,
            item.tax_amount,
            item.total_amount
          ]),
          [],
          ['Summary'],
          ['Total Taxable Amount', gstBreakdown.taxableAmount],
          ['CGST', gstBreakdown.cgst],
          ['SGST', gstBreakdown.sgst],
          ['IGST', gstBreakdown.igst],
          ['Total GST', gstBreakdown.total]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gst-report-${dateFrom}-to-${dateTo}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast({ title: "Success", description: "GST report exported as Excel" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">GST Tracker</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportGSTReport('pdf')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => exportGSTReport('excel')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            onClick={() => window.open('https://www.gst.gov.in/newsandupdates/read/424', '_blank')}
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Latest GST Updates
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Entity Type</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="retailer">Retailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Invoice Type</label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GST Summary Cards - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Transactions"
          value={gstData.length.toString()}
          icon={<FileText className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="Taxable Amount"
          value={formatIndianCurrency(gstBreakdown.taxableAmount)}
          icon={<IndianRupee className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="CGST"
          value={formatIndianCurrency(gstBreakdown.cgst)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="SGST"
          value={formatIndianCurrency(gstBreakdown.sgst)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="IGST"
          value={formatIndianCurrency(gstBreakdown.igst)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Total GST"
          value={formatIndianCurrency(gstBreakdown.total)}
          icon={<BarChart3 className="h-5 w-5" />}
          variant="primary"
        />
      </div>

      {/* GST Rate Breakdown */}
      {gstData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>GST Rate Analysis</CardTitle>
            <CardDescription>Breakdown by tax slabs for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[5, 12, 18, 28].map(rate => {
                const rateData = gstData.filter(invoice => 
                  invoice.invoice_items.some(item => item.gst_rate === rate)
                );
                const rateTotal = rateData.reduce((sum, inv) => sum + inv.total_amount, 0);
                
                return (
                  <div key={rate} className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{rate}%</div>
                    <div className="text-sm text-muted-foreground mb-2">{rateData.length} transactions</div>
                    <div className="font-medium">{formatIndianCurrency(rateTotal)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GST Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>GST Transaction Details</CardTitle>
          <CardDescription>
            Detailed breakdown of all GST transactions for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading GST data...</div>
          ) : gstData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>No GST data found for the selected period</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Taxable Amount</TableHead>
                    <TableHead className="text-right">GST Amount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.invoice_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.invoice_number}
                      </TableCell>
                      <TableCell>
                        {item.business_entities?.name || item.suppliers?.company_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.invoice_type === 'sales' ? 'default' : 'secondary'}>
                          {item.invoice_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatIndianCurrency(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatIndianCurrency(item.tax_amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIndianCurrency(item.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};