-- Ensure all tables have proper RLS policies and foreign key relationships

-- Update foreign key relationships for invoice_items
ALTER TABLE public.invoice_items 
ADD CONSTRAINT fk_invoice_items_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_items 
ADD CONSTRAINT fk_invoice_items_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Update foreign key relationships for invoices
ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoices_supplier_id 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Update foreign key relationships for purchase_order_items
ALTER TABLE public.purchase_order_items 
ADD CONSTRAINT fk_purchase_order_items_purchase_order_id 
FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_order_items 
ADD CONSTRAINT fk_purchase_order_items_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Update foreign key relationships for purchase_orders
ALTER TABLE public.purchase_orders 
ADD CONSTRAINT fk_purchase_orders_supplier_id 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON public.invoice_items(product_id);
CREATE INDEX idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product_id ON public.purchase_order_items(product_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_date ON public.purchase_orders(order_date);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_suppliers_gstin ON public.suppliers(gstin);