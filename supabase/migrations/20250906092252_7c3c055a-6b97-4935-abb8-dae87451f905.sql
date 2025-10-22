-- Create ledgers table
CREATE TABLE public.ledgers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ledger_type TEXT NOT NULL DEFAULT 'cash',
  location TEXT,
  company_id TEXT,
  financial_year TEXT NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ledger_entries table
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID REFERENCES public.ledgers(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('paid', 'due', 'partial')),
  financial_year TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ledgers
CREATE POLICY "Users can view their own ledgers" 
ON public.ledgers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ledgers" 
ON public.ledgers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ledgers" 
ON public.ledgers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ledgers" 
ON public.ledgers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for ledger_entries
CREATE POLICY "Users can view their own ledger entries" 
ON public.ledger_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ledger entries" 
ON public.ledger_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ledger entries" 
ON public.ledger_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ledger entries" 
ON public.ledger_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_ledgers_user_id ON public.ledgers(user_id);
CREATE INDEX idx_ledgers_financial_year ON public.ledgers(financial_year);
CREATE INDEX idx_ledger_entries_ledger_id ON public.ledger_entries(ledger_id);
CREATE INDEX idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX idx_ledger_entries_entry_date ON public.ledger_entries(entry_date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ledgers_updated_at
BEFORE UPDATE ON public.ledgers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ledger_entries_updated_at
BEFORE UPDATE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update ledger balance when entries are added/updated
CREATE OR REPLACE FUNCTION public.update_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the current balance of the ledger
  UPDATE public.ledgers 
  SET current_balance = opening_balance + (
    SELECT COALESCE(SUM(credit_amount - debit_amount), 0)
    FROM public.ledger_entries 
    WHERE ledger_id = COALESCE(NEW.ledger_id, OLD.ledger_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.ledger_id, OLD.ledger_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update ledger balance
CREATE TRIGGER trigger_update_ledger_balance
AFTER INSERT OR UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_ledger_balance();