import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Download, Edit, Trash2, Eye, Receipt } from "lucide-react";
import { formatIndianCurrency, calculateGST } from "@/utils/indianBusiness";
import { downloadInvoiceAsCSV } from "@/utils/pdfGenerator";
import { InvoicePDF } from "@/components/pdf/InvoicePDF";
import { pdf } from "@react-pdf/renderer";
import { GSTSyncService } from "@/services/gstSyncService";

interface Invoice {
  id: string;
  invoice_number: string;
  custom_invoice_number: string | null;
  supplier_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  invoice_type: string;
  payment_status: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  suppliers?: {
    company_name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  business_entities?: {
    name: string;
    entity_type: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  line_total: number;
}

interface BusinessEntity {
  id: string;
  name: string;
  entity_type: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  gst_rate: number;
  current_stock?: number;
  min_stock_level?: number | null;
}

export const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showNewEntityForm, setShowNewEntityForm] = useState(false);
  const [formData, setFormData] = useState({
    entity_id: "",
    entity_type: "customer" as string,
    invoice_type: "sales" as string,
    custom_invoice_number: "",
    payment_status: "due" as string,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: "",
    notes: ""
  });
  const [newEntityData, setNewEntityData] = useState({
    name: "",
    entity_type: "customer" as string,
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gstin: ""
  });
  const [lineItems, setLineItems] = useState([{
    description: "",
    quantity: 1,
    unit_price: 0,
    gst_rate: 18
  }]);
  const [companyState, setCompanyState] = useState('27'); // Default to Maharashtra
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
    fetchBusinessEntities();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          suppliers (
            company_name,
            address,
            phone,
            email,
            gstin
          ),
          business_entities (
            name,
            entity_type,
            address,
            phone,
            email,
            gstin
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessEntities = async () => {
    try {
      const { data, error } = await supabase
        .from('business_entities')
        .select('*')
        .order('name');

      if (error) throw error;
      setBusinessEntities(data || []);
    } catch (error) {
      console.error('Failed to load business entities:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, selling_price, gst_rate, current_stock, min_stock_level')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    lineItems.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      subtotal += lineTotal;
      const gstCalc = calculateGST(lineTotal, item.gst_rate);
      taxAmount += gstCalc.totalTax;
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  };

  const createNewEntity = async () => {
    try {
      // Get current user for RLS compliance
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const entityData = {
        ...newEntityData,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('business_entities')
        .insert([entityData])
        .select()
        .single();

      if (error) throw error;
      
      setFormData(prev => ({ 
        ...prev, 
        entity_id: data.id,
        entity_type: data.entity_type 
      }));
      setShowNewEntityForm(false);
      setNewEntityData({
        name: "",
        entity_type: "customer",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        gstin: ""
      });
      fetchBusinessEntities();
      toast({ title: "Success", description: "New entity created successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create entity",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get current user for RLS compliance
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const totals = calculateTotals();
      let invoiceNumber = formData.custom_invoice_number || generateInvoiceNumber();

      // If user provided a custom invoice number, validate it isn't already used for this user
      if (formData.custom_invoice_number) {
        const { data: existing, error: existingError } = await supabase
          .from('invoices')
          .select('id')
          .eq('user_id', user.id)
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
          toast({
            title: "Duplicate Invoice Number",
            description: "This invoice number already exists. Please choose a different one.",
            variant: "destructive"
          });
          return;
        }
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          custom_invoice_number: formData.custom_invoice_number || null,
          entity_id: formData.entity_id || null,
          entity_type: formData.entity_type,
          invoice_type: formData.invoice_type,
          payment_status: formData.payment_status,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date || null,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          notes: formData.notes || null,
          user_id: user.id
        }])
        .select()
        .single();

      // Handle duplicate error from DB (race condition). If auto-generated, regenerate and retry once.
      if (invoiceError && (invoiceError as any).code === '23505') {
        if (!formData.custom_invoice_number) {
          invoiceNumber = generateInvoiceNumber();
          const retry = await supabase
            .from('invoices')
            .insert([{ 
              invoice_number: invoiceNumber,
              custom_invoice_number: formData.custom_invoice_number || null,
              entity_id: formData.entity_id || null,
              entity_type: formData.entity_type,
              invoice_type: formData.invoice_type,
              payment_status: formData.payment_status,
              invoice_date: formData.invoice_date,
              due_date: formData.due_date || null,
              subtotal: totals.subtotal,
              tax_amount: totals.taxAmount,
              total_amount: totals.total,
              notes: formData.notes || null,
              user_id: user.id
            }])
            .select()
            .single();

          if (retry.error) throw retry.error;
          // Overwrite invoice with retry data
          var invoice = retry.data as any;
        } else {
          // Custom numbers should not auto-resolve; show friendly message
          toast({
            title: "Duplicate Invoice Number",
            description: "This invoice number already exists. Please enter a different number.",
            variant: "destructive"
          });
          return;
        }
      } else if (invoiceError) {
        throw invoiceError;
      }

      // Create invoice items
      const itemsToInsert = lineItems.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: item.gst_rate,
        line_total: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update inventory based on invoice type
      for (const item of lineItems) {
        const product = products.find(p => p.name === item.description);
        if (!product) continue;
        const { data: current } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', product.id)
          .single();
        if (!current) continue;

        const delta = formData.invoice_type === 'sales' ? -item.quantity : item.quantity;
        await supabase
          .from('products')
          .update({ current_stock: current.current_stock + delta })
          .eq('id', product.id);
      }

      // Create GST entry automatically
      try {
        // Get entity details for GST calculation
        const entityDetails = await GSTSyncService.getEntityDetails(
          formData.entity_id || '', 
          formData.entity_type === 'supplier' ? 'supplier' : 'customer'
        );

        const invoiceGSTData = {
          invoice_id: invoice.id,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          transaction_type: formData.invoice_type === 'sales' ? 'sale' : 'purchase',
          entity_name: entityDetails?.company_name || 'Unknown',
          entity_id: formData.entity_id || '',
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          from_state: entityDetails?.state || '27',
          to_state: companyState,
          line_items: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            gst_rate: item.gst_rate,
            line_total: item.quantity * item.unit_price
          }))
        };

        const gstResult = await GSTSyncService.createGSTEntryFromInvoice(invoiceGSTData);
        if (gstResult.success) {
          toast({ 
            title: "Success", 
            description: "Invoice created and GST entry added successfully" 
          });
        } else {
          toast({ 
            title: "Warning", 
            description: "Invoice created but GST entry failed: " + gstResult.error,
            variant: "destructive"
          });
        }
      } catch (gstError) {
        console.error('GST sync error:', gstError);
        toast({ 
          title: "Warning", 
          description: "Invoice created but GST entry failed",
          variant: "destructive"
        });
      }
      
      // Fetch company info from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_entities')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const companyInfo = profileData?.business_entities?.[0] || {
        company_name: "Your Company Name",
        address: "Your Company Address",
        owner_phone: "Your Phone",
        gst: "Your GSTIN"
      };

      // Download PDF immediately after creation
      const pdfDoc = (
        <InvoicePDF 
          invoice={invoice} 
          items={itemsToInsert} 
          companyInfo={{
            name: companyInfo.company_name || "Your Company Name",
            address: companyInfo.address || "Your Company Address",
            phone: companyInfo.owner_phone || "Your Phone",
            email: (await supabase.auth.getUser()).data.user?.email || "your@email.com",
            gstin: companyInfo.gst || "Your GSTIN"
          }}
        />
      );
      
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      resetForm();
      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Invoice deleted successfully" });
      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      });
    }
  };

  const viewInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (error) throw error;
      setInvoiceItems(data || []);
      setSelectedInvoice(invoice);
      setViewOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive"
      });
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    try {
      // Fetch invoice items first
      const { data: items, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (error) throw error;
      
      // Fetch company info from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_entities')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const companyInfo = profileData?.business_entities?.[0] || {
        company_name: "Your Company Name",
        address: "Your Company Address",
        owner_phone: "Your Phone",
        gst: "Your GSTIN"
      };
      
      // Generate and download PDF
      const pdfDoc = (
        <InvoicePDF 
          invoice={invoice} 
          items={items || []} 
          companyInfo={{
            name: companyInfo.company_name || "Your Company Name",
            address: companyInfo.address || "Your Company Address",
            phone: companyInfo.owner_phone || "Your Phone",
            email: (await supabase.auth.getUser()).data.user?.email || "your@email.com",
            gstin: companyInfo.gst || "Your GSTIN"
          }}
        />
      );
      
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Success", description: "Invoice PDF downloaded successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          payment_status: newStatus,
          status: newStatus === 'paid' ? 'paid' : 'sent'
        })
        .eq('id', invoiceId);

      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `Payment status updated to ${newStatus}` 
      });
      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      // Update corresponding GST entry
      const gstResult = await GSTSyncService.updateGSTEntryFromInvoice(
        invoiceId, 
        newStatus,
        newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
      );

      if (gstResult.success) {
        toast({ 
          title: "Success", 
          description: "Invoice status updated and GST entry synced" 
        });
      } else {
        toast({ 
          title: "Warning", 
          description: "Invoice status updated but GST sync failed: " + gstResult.error,
          variant: "destructive"
        });
      }

      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      entity_id: "",
      entity_type: "customer",
      invoice_type: "sales",
      custom_invoice_number: "",
      payment_status: "due",
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: "",
      notes: ""
    });
    setLineItems([{
      description: "",
      quantity: 1,
      unit_price: 0,
      gst_rate: 18
    }]);
    setShowNewEntityForm(false);
    setOpen(false);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: "",
      quantity: 1,
      unit_price: 0,
      gst_rate: 18
    }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'due': return 'secondary';
      case 'partial': return 'outline';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'draft': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="text-muted-foreground">Create and manage invoices for your business</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_type">Invoice Type</Label>
                  <Select value={formData.invoice_type} onValueChange={(value) => setFormData(prev => ({ ...prev, invoice_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Invoice</SelectItem>
                      <SelectItem value="purchase">Purchase Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Due</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom_invoice_number">Custom Invoice Number (Optional)</Label>
                  <Input
                    id="custom_invoice_number"
                    value={formData.custom_invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, custom_invoice_number: e.target.value }))}
                    placeholder="Enter custom invoice number"
                  />
                </div>
                <div>
                  <Label htmlFor="entity_type">Entity Type</Label>
                  <Select value={formData.entity_type} onValueChange={(value) => setFormData(prev => ({ ...prev, entity_type: value, entity_id: "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="wholesaler">Wholesaler</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="labour">Labour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Business Entity</Label>
                <div className="flex gap-2">
                  <Select value={formData.entity_id} onValueChange={(value) => setFormData(prev => ({ ...prev, entity_id: value }))}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessEntities
                        .filter(entity => entity.entity_type === formData.entity_type)
                        .map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name} ({entity.entity_type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewEntityForm(!showNewEntityForm)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {showNewEntityForm && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Add New {formData.entity_type}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new_entity_name">Name</Label>
                      <Input
                        id="new_entity_name"
                        value={newEntityData.name}
                        onChange={(e) => setNewEntityData(prev => ({ ...prev, name: e.target.value, entity_type: formData.entity_type }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_entity_contact">Contact Person</Label>
                      <Input
                        id="new_entity_contact"
                        value={newEntityData.contact_person}
                        onChange={(e) => setNewEntityData(prev => ({ ...prev, contact_person: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_entity_phone">Phone</Label>
                      <Input
                        id="new_entity_phone"
                        value={newEntityData.phone}
                        onChange={(e) => setNewEntityData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_entity_email">Email</Label>
                      <Input
                        id="new_entity_email"
                        type="email"
                        value={newEntityData.email}
                        onChange={(e) => setNewEntityData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_entity_address">Address</Label>
                      <Input
                        id="new_entity_address"
                        value={newEntityData.address}
                        onChange={(e) => setNewEntityData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_entity_gstin">GSTIN</Label>
                      <Input
                        id="new_entity_gstin"
                        value={newEntityData.gstin}
                        onChange={(e) => setNewEntityData(prev => ({ ...prev, gstin: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={createNewEntity}>
                    Create {formData.entity_type}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_date">Invoice Date</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>


              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="border rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Inventory Helper</Label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showLowStockOnly}
                        onChange={(e) => setShowLowStockOnly(e.target.checked)}
                      />
                      Show low-stock products only
                    </label>
                  </div>
                </div>
                
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end mb-2">
                    <div className="col-span-3">
                      <Select value={''} onValueChange={(value) => {
                        const product = products.find(p => p.id === value);
                        if (product) {
                          updateLineItem(index, 'description', product.name);
                          updateLineItem(index, 'unit_price', product.selling_price || 0);
                          updateLineItem(index, 'gst_rate', product.gst_rate);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {(showLowStockOnly ? products.filter(p => (p.current_stock || 0) <= (p.min_stock_level || 0)) : products).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} {(product.current_stock !== undefined) ? ` (Stock: ${product.current_stock})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="GST %"
                        value={item.gst_rate}
                        onChange={(e) => updateLineItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm font-medium">{formatIndianCurrency(item.quantity * item.unit_price)}</p>
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end space-y-2">
                  <div className="text-right">
                    <p>Subtotal: {formatIndianCurrency(calculateTotals().subtotal)}</p>
                    <p>Tax: {formatIndianCurrency(calculateTotals().taxAmount)}</p>
                    <p className="font-bold">Total: {formatIndianCurrency(calculateTotals().total)}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by number, entity, type, status..."
          value={invoiceSearch}
          onChange={(e) => setInvoiceSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found. Create your first invoice to get started.</p>
            </CardContent>
          </Card>
        ) : (
          invoices
            .filter((inv) => {
              if (!invoiceSearch.trim()) return true;
              const term = invoiceSearch.toLowerCase();
              return (
                (inv.custom_invoice_number || inv.invoice_number).toLowerCase().includes(term) ||
                (inv.business_entities?.name || inv.suppliers?.company_name || '').toLowerCase().includes(term) ||
                (inv.invoice_type || '').toLowerCase().includes(term) ||
                (inv.payment_status || '').toLowerCase().includes(term)
              );
            })
            .map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <Receipt className="w-5 h-5" />
                      {invoice.custom_invoice_number || invoice.invoice_number}
                      <Badge variant={getPaymentStatusColor(invoice.payment_status)}>
                        {invoice.payment_status}
                      </Badge>
                      <Badge variant="outline">
                        {invoice.invoice_type}
                      </Badge>
                      {invoice.entity_type && (
                        <Badge variant="secondary">
                          {invoice.entity_type}
                        </Badge>
                      )}
                    </CardTitle>
                     <CardDescription>
                       {invoice.business_entities?.name || invoice.suppliers?.company_name || 'No entity'} • {invoice.invoice_date}
                     </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {invoice.payment_status === 'due' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark Paid
                      </Button>
                    )}
                    {invoice.payment_status === 'paid' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateInvoiceStatus(invoice.id, 'due')}
                      >
                        Mark Due
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => viewInvoice(invoice)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadInvoice(invoice)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(invoice.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">{formatIndianCurrency(invoice.total_amount)}</p>
                  </div>
                  {invoice.due_date && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">{invoice.due_date}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {invoice.payment_status !== 'paid' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updatePaymentStatus(invoice.id, 'paid')}
                      >
                        Mark as Paid
                      </Button>
                    )}
                    {invoice.payment_status !== 'due' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updatePaymentStatus(invoice.id, 'due')}
                      >
                        Mark as Due
                      </Button>
                    )}
                    {invoice.payment_status !== 'partial' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updatePaymentStatus(invoice.id, 'partial')}
                      >
                        Mark as Partial
                      </Button>
                    )}
                  </div>
                  {invoice.notes && (
                    <p className="text-sm text-muted-foreground italic">{invoice.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-sm text-muted-foreground">Entity</p>
                   <p className="font-medium">{selectedInvoice.business_entities?.name || selectedInvoice.suppliers?.company_name || 'N/A'}</p>
                 </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedInvoice.invoice_date}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2">
                  {invoiceItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatIndianCurrency(item.unit_price)} ({item.gst_rate}% GST)
                        </p>
                      </div>
                      <p className="font-medium">{formatIndianCurrency(item.line_total)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="space-y-1 text-right">
                  <p>Subtotal: {formatIndianCurrency(selectedInvoice.subtotal)}</p>
                  <p>Tax: {formatIndianCurrency(selectedInvoice.tax_amount)}</p>
                  <p className="text-lg font-bold">Total: {formatIndianCurrency(selectedInvoice.total_amount)}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button onClick={() => downloadInvoice(selectedInvoice)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};