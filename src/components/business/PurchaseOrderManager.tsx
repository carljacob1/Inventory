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
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, ShoppingCart, Download, Edit, Trash2, Eye, Package } from "lucide-react";
import { formatIndianCurrency, calculateGST } from "@/utils/indianBusiness";
import { downloadReportAsCSV } from "@/utils/pdfGenerator";
import { POReceivingManager } from "./POReceivingManager";
 

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  suppliers?: {
    company_name: string;
  };
  items_summary?: {
    total_items: number;
    total_quantity: number;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      received_quantity: number;
    }>;
  };
}

interface PurchaseOrderItem {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  line_total: number;
  received_quantity: number;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface Product {
  id: string;
  name: string;
  purchase_price: number | null;
  gst_rate: number;
  current_stock?: number;
  min_stock_level?: number | null;
}

export const PurchaseOrderManager = () => {
  const { selectedCompany } = useCompany();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poSearch, setPoSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [poDetailsLoading, setPoDetailsLoading] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPOItems] = useState<PurchaseOrderItem[]>([]);
  const [receivingItems, setReceivingItems] = useState<{[key: string]: number}>({});
  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [showNewReceivingManager, setShowNewReceivingManager] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    notes: ""
  });
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
    pan: ""
  });
  const [lineItems, setLineItems] = useState([{
    product_id: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    gst_rate: 18
  }]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchProducts();
  }, [selectedCompany]);

  const fetchPurchaseOrders = async () => {
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            company_name
          ),
          purchase_order_items (
            description,
            quantity,
            unit_price,
            line_total,
            received_quantity
          )
        `);

      // Filter by company if a company is selected
      if (selectedCompany?.company_name) {
        query = query.eq('company_id', selectedCompany.company_name);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the data to add items summary
      const processedData = (data || []).map((po: any) => {
        const items = po.purchase_order_items || [];
        const items_summary = {
          total_items: items.length,
          total_quantity: items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
          items: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            received_quantity: item.received_quantity || 0
          }))
        };
        return {
          ...po,
          items_summary
        };
      });
      
      setPurchaseOrders(processedData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      let query = supabase
        .from('suppliers')
        .select('id, company_name');

      // Filter by company if a company is selected
      if (selectedCompany?.company_name) {
        query = query.eq('company_id', selectedCompany.company_name);
      }

      const { data, error } = await query.order('company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select('id, name, purchase_price, gst_rate, current_stock, min_stock_level');

      // Filter by company if a company is selected
      if (selectedCompany?.company_name) {
        query = query.eq('company_id', selectedCompany.company_name);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('suppliers')
        .insert([{ ...newSupplierData, user_id: user.id, company_id: selectedCompany?.company_name || null }])
        .select()
        .single();

      if (error) throw error;

      // Update suppliers list
      setSuppliers(prev => [...prev, data]);
      
      // Select the new supplier
      setFormData(prev => ({ ...prev, supplier_id: data.id }));
      
      // Reset form and close dialog
      setNewSupplierData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        gstin: "",
        pan: ""
      });
      setSupplierDialogOpen(false);

      toast({
        title: "Success",
        description: "Supplier created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive"
      });
    }
  };

  const generatePONumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `PO-${year}${month}-${timestamp}`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all line items have descriptions
    const itemsWithoutDescription = lineItems.filter(item => !item.description || item.description.trim() === '');
    if (itemsWithoutDescription.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please enter description for all items. ${itemsWithoutDescription.length} item(s) missing description.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      const totals = calculateTotals();
      const poNumber = generatePONumber();

      // Create purchase order
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: poNumber,
          supplier_id: formData.supplier_id || null,
          company_id: selectedCompany?.company_name || null,
          order_date: formData.order_date,
          expected_delivery_date: formData.expected_delivery_date || null,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          notes: formData.notes || null,
          user_id: user.id
        }])
        .select()
        .single();

      if (poError) throw poError;

      // Create purchase order items
      const itemsToInsert = lineItems.map(item => ({
        purchase_order_id: po.id,
        product_id: item.product_id || null,
        description: item.description.trim(), // Ensure description is trimmed
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: item.gst_rate,
        line_total: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Do not change inventory on PO creation; update happens on receiving

      // Show success message immediately
      toast({ title: "Success", description: "Purchase order created successfully" });
      resetForm();
      fetchPurchaseOrders();

      // No attachments to upload
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Purchase order deleted successfully" });
      fetchPurchaseOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive"
      });
    }
  };

  const viewPurchaseOrder = async (po: PurchaseOrder) => {
    // Open immediately and show loader; then fetch items
    setSelectedPO(po);
    setPoDetailsLoading(true);
    setViewOpen(true);
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', po.id);

      if (error) throw error;
      setPOItems(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase order details",
        variant: "destructive"
      });
    } finally {
      setPoDetailsLoading(false);
    }
  };

  const downloadPurchaseOrder = (po: PurchaseOrder) => {
    const items = poItems.map(item => 
      `${item.description},${item.quantity},${item.unit_price},${item.gst_rate}%,${formatIndianCurrency(item.line_total)}`
    ).join('\n');
    
    const csvContent = `Purchase Order: ${po.po_number}
Date: ${po.order_date}
Supplier: ${po.suppliers?.company_name || 'N/A'}
Expected Delivery: ${po.expected_delivery_date || 'N/A'}

Description,Quantity,Unit Price,GST Rate,Line Total
${items}

Subtotal: ${formatIndianCurrency(po.subtotal)}
Tax: ${formatIndianCurrency(po.tax_amount)}
Total: ${formatIndianCurrency(po.total_amount)}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-order-${po.po_number}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openReceivingModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowNewReceivingManager(true);
  };

  const updateReceivedQuantities = async () => {
    if (!selectedPO) return;

    try {
      // Update received quantities for each item
      for (const itemId in receivingItems) {
        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: receivingItems[itemId] })
          .eq('id', itemId);
      }

      // Check if all items are fully received
      const updatedItems = poItems.map(item => ({
        ...item,
        received_quantity: receivingItems[item.id] || item.received_quantity
      }));

      const allFullyReceived = updatedItems.every(item => 
        (item.received_quantity || 0) >= item.quantity
      );

      const hasPartialReceipt = updatedItems.some(item => 
        (item.received_quantity || 0) > 0 && (item.received_quantity || 0) < item.quantity
      );

      // Update PO status based on receipt status
      let newStatus = selectedPO.status;
      if (allFullyReceived) {
        newStatus = 'received';
        
        // Only update inventory when fully received
        for (const item of updatedItems) {
          if (item.product_id) {
            const { data: product } = await supabase
              .from('products')
              .select('current_stock')
              .eq('id', item.product_id)
              .single();
            
            if (product) {
              // Add the newly received quantity (not total received)
              const previouslyReceived = poItems.find(pi => pi.id === item.id)?.received_quantity || 0;
              const newlyReceived = (item.received_quantity || 0) - previouslyReceived;
              
              if (newlyReceived > 0) {
                await supabase
                  .from('products')
                  .update({ 
                    current_stock: product.current_stock + newlyReceived
                  })
                  .eq('id', item.product_id);
              }
            }
          }
        }
        
        toast({ 
          title: "Success", 
          description: "Purchase order fully received and inventory updated" 
        });
      } else if (hasPartialReceipt) {
        newStatus = 'partial';
        toast({ 
          title: "Success", 
          description: "Partial receipt recorded. Inventory will update when fully received." 
        });
      }

      // Update PO status
      await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', selectedPO.id);

      fetchPurchaseOrders();
      setShowReceivingModal(false);
      setViewOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update received quantities",
        variant: "destructive"
      });
    }
  };

  // Removed attachment upload logic

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: "",
      notes: ""
    });
    setLineItems([{
      product_id: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      gst_rate: 18
    }]);
    setOpen(false);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product_id: "",
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
    const currentItem = { ...updated[index] }; // Copy current item before updating
    const previousProductId = currentItem.product_id;
    const previousDescription = currentItem.description;
    
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill product details when product is selected
    if (field === 'product_id') {
      if (value && value !== "__manual__") {
        const product = products.find(p => p.id === value);
        if (product) {
          // Auto-fill description if it's empty or if it matches the previous product name
          const previousProduct = previousProductId ? products.find(p => p.id === previousProductId) : null;
          const wasAutoFilledFromPrevious = previousProduct && previousDescription === previousProduct.name;
          
          if (!previousDescription || wasAutoFilledFromPrevious) {
            updated[index].description = product.name;
          }
          updated[index].unit_price = product.purchase_price || 0;
          updated[index].gst_rate = product.gst_rate;
        }
      } else {
        // When "Manual Entry" is selected (empty value), clear description only if it was auto-filled
        const wasAutoFilled = previousProductId && products.some(p => 
          p.id === previousProductId && p.name === previousDescription
        );
        if (wasAutoFilled) {
          updated[index].description = '';
        }
      }
    }
    
    setLineItems(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'default';
      case 'sent': return 'secondary';
      case 'partial': return 'outline';
      case 'draft': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const downloadPOReport = () => {
    const reportData = purchaseOrders.map(po => ({
      po_number: po.po_number,
      order_date: po.order_date,
      supplier_name: po.suppliers?.company_name || 'N/A',
      status: po.status,
      total_amount: po.total_amount
    }));
    
    downloadReportAsCSV(
      'Purchase Orders Report',
      reportData,
      ['po_number', 'order_date', 'supplier_name', 'status', 'total_amount']
    );
    
    toast({ title: "Success", description: "Purchase Orders report downloaded successfully" });
  };

  if (loading) {
    return <div className="text-center py-8">Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Purchase Orders</h2>
          <p className="text-muted-foreground">Create and manage purchase orders for inventory restocking</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPOReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <div className="flex gap-2">
                    <Select value={formData.supplier_id} onValueChange={(value) => {
                      if (value === "add_new") {
                        setSupplierDialogOpen(true);
                      } else {
                        setFormData(prev => ({ ...prev, supplier_id: value }));
                      }
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.company_name}
                          </SelectItem>
                        ))}
                        <SelectItem value="add_new" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add New Supplier
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="order_date">Order Date</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expected_delivery_date">Expected Delivery</Label>
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start mb-4 p-3 border rounded-lg">
                    <div className="col-span-3">
                      <Label htmlFor={`product-${index}`} className="text-sm mb-1 block">Product</Label>
                      <Select value={item.product_id || "__manual__"} onValueChange={(value) => updateLineItem(index, 'product_id', value === "__manual__" ? "" : value)}>
                        <SelectTrigger id={`product-${index}`}>
                          <SelectValue placeholder="Select product (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">Manual Entry</SelectItem>
                          {(showLowStockOnly ? products.filter(p => (p.current_stock || 0) <= (p.min_stock_level || 0)) : products).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} {(product.current_stock !== undefined) ? ` (Stock: ${product.current_stock})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor={`description-${index}`} className="text-sm mb-1 block">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`description-${index}`}
                        placeholder="Enter item description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        required
                        className={!item.description ? "border-destructive" : ""}
                      />
                      {!item.description && (
                        <p className="text-xs text-destructive mt-1">Description is required</p>
                      )}
                      {item.product_id && item.description === products.find(p => p.id === item.product_id)?.name && (
                        <p className="text-xs text-muted-foreground mt-1">Auto-filled from product. You can edit if needed.</p>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Label htmlFor={`quantity-${index}`} className="text-sm mb-1 block">Qty</Label>
                      <Input
                        id={`quantity-${index}`}
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
                      <Label htmlFor={`price-${index}`} className="text-sm mb-1 block">Unit Price</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <Label htmlFor={`gst-${index}`} className="text-sm mb-1 block">GST %</Label>
                      <Input
                        id={`gst-${index}`}
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
                      <Label className="text-sm mb-1 block">Line Total</Label>
                      <p className="text-sm font-medium pt-[9px]">{formatIndianCurrency(item.quantity * item.unit_price)}</p>
                    </div>
                    <div className="col-span-1 flex items-start">
                      {lineItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(index)} className="mt-[29px]">
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

              {/* Low-stock helper */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label>Inventory Helper</Label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showLowStockOnly}
                      onChange={(e) => setShowLowStockOnly(e.target.checked)}
                    />
                    Show low-stock products only
                  </label>
                </div>
                <div className="text-xs text-muted-foreground">
                  Select products below to auto-fill item details. Low-stock uses current_stock ≤ min_stock_level.
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
                <Button type="submit">Create Purchase Order</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by PO number, supplier, status..."
          value={poSearch}
          onChange={(e) => setPoSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {purchaseOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders found. Create your first purchase order to get started.</p>
            </CardContent>
          </Card>
        ) : (
          purchaseOrders
            .filter((po) => {
              if (!poSearch.trim()) return true;
              const term = poSearch.toLowerCase();
              return (
                po.po_number.toLowerCase().includes(term) ||
                (po.suppliers?.company_name || '').toLowerCase().includes(term) ||
                (po.status || '').toLowerCase().includes(term)
              );
            })
            .map((po) => (
            <Card key={po.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      {po.po_number}
                      <Badge variant={getStatusColor(po.status)}>
                        {po.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {po.suppliers?.company_name || 'No supplier'} • {po.order_date}
                      {po.expected_delivery_date && ` • Expected: ${po.expected_delivery_date}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => viewPurchaseOrder(po)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadPurchaseOrder(po)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(po.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">{formatIndianCurrency(po.total_amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{po.status}</p>
                    </div>
                  </div>
                  
                  {po.items_summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Items</p>
                        <p className="font-semibold text-lg">{po.items_summary.total_items}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Quantity</p>
                        <p className="font-semibold text-lg">{po.items_summary.total_quantity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Subtotal</p>
                        <p className="font-semibold">{formatIndianCurrency(po.subtotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tax</p>
                        <p className="font-semibold">{formatIndianCurrency(po.tax_amount)}</p>
                      </div>
                    </div>
                  )}
                  
                  {po.items_summary && po.items_summary.items.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2 text-muted-foreground">Items Preview</p>
                      <div className="space-y-2">
                        {po.items_summary.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex-1 truncate">
                              <span className="font-medium">{item.description}</span>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                              <span className="text-muted-foreground">Qty: <span className="font-medium">{item.quantity}</span></span>
                              <span className="text-muted-foreground">@ <span className="font-medium">{formatIndianCurrency(item.unit_price)}</span></span>
                              <span className="font-semibold">{formatIndianCurrency(item.line_total)}</span>
                            </div>
                          </div>
                        ))}
                        {po.items_summary.items.length > 3 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{po.items_summary.items.length - 3} more item{po.items_summary.items.length - 3 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={viewOpen && !!selectedPO} onOpenChange={(open) => {
        setViewOpen(open);
        if (!open) {
          setSelectedPO(null);
          setPOItems([]);
          setPoDetailsLoading(false);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details - {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              {poDetailsLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading purchase order details...</div>
              ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedPO.suppliers?.company_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{selectedPO.order_date}</p>
                </div>
              </div>
              )}
              
               <div>
                 <h4 className="font-medium mb-2">Items</h4>
                 <div className="space-y-2">
                  {poDetailsLoading ? (
                    <div className="p-3 bg-muted rounded border text-sm text-muted-foreground">Loading items...</div>
                  ) : poItems.map((item) => (
                     <div key={item.id} className="flex justify-between items-center p-3 bg-muted rounded border">
                       <div className="flex-1">
                         <p className="font-medium">{item.description}</p>
                         <p className="text-sm text-muted-foreground">
                           {formatIndianCurrency(item.unit_price)} per unit ({item.gst_rate}% GST)
                         </p>
                       </div>
                       <div className="text-center mx-4">
                         <p className="text-sm text-muted-foreground">Ordered</p>
                         <p className="font-medium">{item.quantity}</p>
                       </div>
                       <div className="text-center mx-4">
                         <p className="text-sm text-muted-foreground">Received</p>
                         <div className="flex items-center gap-2">
                           <p className="font-medium">{item.received_quantity || 0}</p>
                           <Badge variant={
                             (item.received_quantity || 0) >= item.quantity ? 'default' : 
                             (item.received_quantity || 0) > 0 ? 'secondary' : 'outline'
                           }>
                             {((item.received_quantity || 0) / item.quantity * 100).toFixed(0)}%
                           </Badge>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-sm text-muted-foreground">Line Total</p>
                         <p className="font-medium">{formatIndianCurrency(item.line_total)}</p>
                       </div>
                     </div>
                  ))}
                 </div>
               </div>
              
              <div className="border-t pt-4">
                <div className="space-y-1 text-right">
                  <p>Subtotal: {formatIndianCurrency(selectedPO.subtotal)}</p>
                  <p>Tax: {formatIndianCurrency(selectedPO.tax_amount)}</p>
                  <p className="text-lg font-bold">Total: {formatIndianCurrency(selectedPO.total_amount)}</p>
                </div>
              </div>
              
              {/* Attachments removed */}

              <div className="flex justify-end gap-2">
                {selectedPO.status !== 'received' && (
                  <Button onClick={() => openReceivingModal(selectedPO)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Package className="w-4 h-4 mr-2" />
                    Update Receipt
                  </Button>
                )}
                <Button variant="outline" onClick={() => downloadPurchaseOrder(selectedPO)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* New Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={newSupplierData.company_name}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, company_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={newSupplierData.contact_person}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, contact_person: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newSupplierData.email}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newSupplierData.phone}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newSupplierData.address}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={newSupplierData.gstin}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, gstin: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={newSupplierData.pan}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, pan: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Supplier
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receiving Modal */}
      <Dialog open={showReceivingModal} onOpenChange={setShowReceivingModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Received Quantities - {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-6">
              <div className="space-y-4">
                {poItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.description}</h4>
                        <p className="text-sm text-muted-foreground">
                          Ordered: {item.quantity} | Previously Received: {item.received_quantity || 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`received-${item.id}`} className="text-sm">
                          Received Qty:
                        </Label>
                        <Input
                          id={`received-${item.id}`}
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={receivingItems[item.id] || 0}
                          onChange={(e) => setReceivingItems(prev => ({
                            ...prev,
                            [item.id]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                          className="w-24"
                        />
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, ((receivingItems[item.id] || 0) / item.quantity) * 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {((receivingItems[item.id] || 0) / item.quantity * 100).toFixed(1)}% received
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReceivingModal(false)}
                >
                  Cancel
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={updateReceivedQuantities}>
                  Update Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced PO Receiving Manager */}
      {showNewReceivingManager && selectedPO && (
        <POReceivingManager
          po={selectedPO}
          onClose={() => {
            setShowNewReceivingManager(false);
            setSelectedPO(null);
          }}
          onInventoryUpdated={() => {
            fetchPurchaseOrders();
            toast({
              title: "Success",
              description: "Inventory updated successfully"
            });
          }}
        />
      )}
    </div>
  );
};