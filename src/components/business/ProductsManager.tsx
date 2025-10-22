import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Package, Download, Upload } from "lucide-react";
import { downloadReportAsCSV } from "@/utils/pdfGenerator";
import { formatIndianCurrency } from "@/utils/indianBusiness";
import { ERPImportManager } from "@/components/import/ERPImportManager";

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  hsn_code: string | null;
  unit: string;
  purchase_price: number | null;
  selling_price: number | null;
  gst_rate: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number | null;
}

export const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    hsn_code: "",
    unit: "Nos",
    purchase_price: "",
    selling_price: "",
    gst_rate: "18",
    current_stock: "0",
    min_stock_level: "0",
    max_stock_level: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get current user for RLS compliance
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const productData = {
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku || null,
        hsn_code: formData.hsn_code || null,
        unit: formData.unit,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        gst_rate: parseFloat(formData.gst_rate),
        current_stock: parseInt(formData.current_stock),
        min_stock_level: parseInt(formData.min_stock_level),
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : null,
        user_id: user.id
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast({ title: "Success", description: "Product added successfully" });
      }

      resetForm();
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully" });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      hsn_code: "",
      unit: "Nos",
      purchase_price: "",
      selling_price: "",
      gst_rate: "18",
      current_stock: "0",
      min_stock_level: "0",
      max_stock_level: ""
    });
    setEditingProduct(null);
    setOpen(false);
  };

  const startEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      hsn_code: product.hsn_code || "",
      unit: product.unit,
      purchase_price: product.purchase_price?.toString() || "",
      selling_price: product.selling_price?.toString() || "",
      gst_rate: product.gst_rate.toString(),
      current_stock: product.current_stock.toString(),
      min_stock_level: product.min_stock_level.toString(),
      max_stock_level: product.max_stock_level?.toString() || ""
    });
    setEditingProduct(product);
    setOpen(true);
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock <= product.min_stock_level) return 'Low Stock';
    if (product.current_stock >= (product.max_stock_level || Infinity)) return 'Overstock';
    return 'In Stock';
  };

  const downloadProductReport = () => {
    const reportData = products.map(product => ({
      name: product.name,
      sku: product.sku || '',
      current_stock: product.current_stock,
      min_stock_level: product.min_stock_level,
      selling_price: product.selling_price || 0,
      status: getStockStatus(product)
    }));
    
    downloadReportAsCSV(
      'Products Report',
      reportData,
      ['name', 'sku', 'current_stock', 'min_stock_level', 'selling_price', 'status']
    );
    
    toast({ title: "Success", description: "Products report downloaded successfully" });
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Products & Inventory</h2>
          <p className="text-muted-foreground">Manage your product catalog and inventory levels</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadProductReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Unique product code"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, hsn_code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="gst_rate">GST Rate (%)</Label>
                  <Input
                    id="gst_rate"
                    type="number"
                    step="0.01"
                    value={formData.gst_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_rate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_price">Purchase Price (₹)</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="selling_price">Selling Price (₹)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_stock: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_stock_level">Max Stock Level</Label>
                  <Input
                    id="max_stock_level"
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_stock_level: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update" : "Add"} Product
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, SKU, HSN..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products found. Add your first product to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-dashed border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground mb-1">Bulk Import Products</h3>
                  <p className="text-sm text-muted-foreground">Import multiple products from CSV files exported from Tally, SAP, or other ERP systems</p>
                </div>
                <Button onClick={() => setImportOpen(true)} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              </div>
            </div>
            
            {products
              .filter((p) => {
                if (!productSearch.trim()) return true;
                const term = productSearch.toLowerCase();
                return (
                  p.name.toLowerCase().includes(term) ||
                  (p.sku || '').toLowerCase().includes(term) ||
                  (p.hsn_code || '').toLowerCase().includes(term)
                );
              })
              .map((product) => {
              const stockStatus = getStockStatus(product);
              
              return (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {product.name}
                          {product.sku && <Badge variant="outline">{product.sku}</Badge>}
                        </CardTitle>
                        {product.description && (
                          <CardDescription>{product.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {product.current_stock} {product.unit}
                      </p>
                    </div>
                    {product.purchase_price && (
                      <div>
                        <p className="text-sm text-muted-foreground">Purchase Price</p>
                        <p className="font-semibold">{formatIndianCurrency(product.purchase_price)}</p>
                      </div>
                    )}
                    {product.selling_price && (
                      <div>
                        <p className="text-sm text-muted-foreground">Selling Price</p>
                        <p className="font-semibold">{formatIndianCurrency(product.selling_price)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">GST Rate</p>
                      <p className="font-semibold">{product.gst_rate}%</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    {product.hsn_code && (
                      <Badge variant="secondary">HSN: {product.hsn_code}</Badge>
                    )}
                    {stockStatus === "Low Stock" && (
                      <Badge variant="destructive">Low Stock</Badge>
                    )}
                    {stockStatus === "Overstock" && (
                      <Badge variant="secondary">Overstocked</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </>
        )}
      </div>

      {/* ERP Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <ERPImportManager onClose={() => {
            setImportOpen(false);
            fetchProducts(); // Refresh products after import
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};