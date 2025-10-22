-- Create profiles table for user authentication
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id column to all business tables
ALTER TABLE public.business_entities ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to have a default user_id (this will need to be updated once users sign up)
-- For now, we'll set them to NULL to avoid breaking existing functionality

-- Create updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- DROP existing overly permissive policies
DROP POLICY IF EXISTS "Allow all on business_entities" ON public.business_entities;
DROP POLICY IF EXISTS "Allow all on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
DROP POLICY IF EXISTS "Allow all on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all on invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Allow all on purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all on purchase_order_items" ON public.purchase_order_items;

-- Create secure RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create secure RLS policies for business_entities
CREATE POLICY "Users can view their own business entities" ON public.business_entities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business entities" ON public.business_entities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business entities" ON public.business_entities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business entities" ON public.business_entities
  FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for suppliers
CREATE POLICY "Users can view their own suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers" ON public.suppliers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers" ON public.suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for products
CREATE POLICY "Users can view their own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for purchase_orders
CREATE POLICY "Users can view their own purchase orders" ON public.purchase_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase orders" ON public.purchase_orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase orders" ON public.purchase_orders
  FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for invoice_items (access through invoice ownership)
CREATE POLICY "Users can view invoice items for their invoices" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice items for their invoices" ON public.invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice items for their invoices" ON public.invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invoice items for their invoices" ON public.invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Create secure RLS policies for purchase_order_items (access through purchase order ownership)
CREATE POLICY "Users can view PO items for their purchase orders" ON public.purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders 
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
      AND purchase_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create PO items for their purchase orders" ON public.purchase_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders 
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
      AND purchase_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update PO items for their purchase orders" ON public.purchase_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders 
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
      AND purchase_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete PO items for their purchase orders" ON public.purchase_order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders 
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
      AND purchase_orders.user_id = auth.uid()
    )
  );