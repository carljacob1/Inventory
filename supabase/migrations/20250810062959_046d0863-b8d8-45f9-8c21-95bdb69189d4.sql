-- Create business_entities table to support customers, suppliers, wholesalers, transport, labours
CREATE TABLE public.business_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier', 'wholesaler', 'transport', 'labour')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gstin TEXT,
  pan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_entities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all on business_entities" 
ON public.business_entities 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for timestamps
CREATE TRIGGER update_business_entities_updated_at
BEFORE UPDATE ON public.business_entities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update invoices table to support the new entity system and payment status
ALTER TABLE public.invoices 
ADD COLUMN entity_id UUID REFERENCES public.business_entities(id),
ADD COLUMN entity_type TEXT CHECK (entity_type IN ('customer', 'supplier', 'wholesaler', 'transport', 'labour')),
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'due' CHECK (payment_status IN ('due', 'paid', 'partial', 'overdue')),
ADD COLUMN custom_invoice_number TEXT,
ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'sales' CHECK (invoice_type IN ('sales', 'purchase'));

-- Create index for better performance
CREATE INDEX idx_business_entities_type ON public.business_entities(entity_type);
CREATE INDEX idx_invoices_entity ON public.invoices(entity_id);
CREATE INDEX idx_invoices_payment_status ON public.invoices(payment_status);

-- Insert some sample business entities
INSERT INTO public.business_entities (name, entity_type, contact_person, phone, email) VALUES
('ABC Transport', 'transport', 'Raj Kumar', '+91-9876543210', 'raj@abctransport.com'),
('XYZ Labour Contractors', 'labour', 'Mohan Singh', '+91-9876543211', 'mohan@xyzlabour.com'),
('Quick Wholesale', 'wholesaler', 'Priya Sharma', '+91-9876543212', 'priya@quickwholesale.com'),
('Premium Customers Ltd', 'customer', 'Amit Patel', '+91-9876543213', 'amit@premiumcustomers.com');