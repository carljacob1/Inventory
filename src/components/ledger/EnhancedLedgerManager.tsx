import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Plus, Edit, Trash2, Filter, Download, TrendingUp, AlertTriangle, CheckCircle, Calendar, MapPin } from 'lucide-react';
import { formatIndianCurrency } from '@/utils/indianBusiness';

interface Ledger {
  id: string;
  name: string;
  type: 'BANK' | 'PAYABLES' | 'RECEIVABLES' | 'CASH' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  location: string;
  balance: number;
  entries_count: number;
  created_at: string;
  updated_at: string;
}

interface LedgerEntry {
  id: string;
  ledger_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  entry_date: string;
  status: 'due' | 'paid' | 'overdue' | 'cancelled';
  reference_number: string | null;
  due_date: string | null;
  payment_date: string | null;
  created_at: string;
  ledger?: {
    name: string;
    type: string;
  };
}

export const EnhancedLedgerManager: React.FC = () => {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [showEntriesModal, setShowEntriesModal] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [financialYear, setFinancialYear] = useState('FY 2025-26');
  const [newLedger, setNewLedger] = useState({
    name: '',
    type: 'BANK' as 'BANK' | 'PAYABLES' | 'RECEIVABLES' | 'CASH' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE',
    location: '',
    balance: 0
  });
  const { toast } = useToast();

  // Sample data to match the original image
  const sampleLedgers: Ledger[] = [
    {
      id: '1',
      name: 'SBI',
      type: 'BANK',
      location: 'Dhekiajuli',
      balance: 15000,
      entries_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'test',
      type: 'PAYABLES',
      location: 'testpur',
      balance: 510000,
      entries_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Sample ledger entries data
  const sampleEntries: LedgerEntry[] = [
    {
      id: '1',
      ledger_id: '1',
      description: 'Initial deposit',
      debit_amount: 15000,
      credit_amount: 0,
      entry_date: '2025-01-01',
      status: 'paid',
      reference_number: 'DEP-001',
      due_date: null,
      payment_date: '2025-01-01',
      created_at: new Date().toISOString(),
      ledger: { name: 'SBI', type: 'BANK' }
    },
    {
      id: '2',
      ledger_id: '2',
      description: 'Supplier payment - ABC Corp',
      debit_amount: 200000,
      credit_amount: 0,
      entry_date: '2025-01-15',
      status: 'due',
      reference_number: 'SUP-001',
      due_date: '2025-02-15',
      payment_date: null,
      created_at: new Date().toISOString(),
      ledger: { name: 'test', type: 'PAYABLES' }
    },
    {
      id: '3',
      ledger_id: '2',
      description: 'Equipment purchase',
      debit_amount: 250000,
      credit_amount: 0,
      entry_date: '2025-01-20',
      status: 'paid',
      reference_number: 'EQP-001',
      due_date: '2025-02-20',
      payment_date: '2025-01-25',
      created_at: new Date().toISOString(),
      ledger: { name: 'test', type: 'PAYABLES' }
    },
    {
      id: '4',
      ledger_id: '2',
      description: 'Office supplies',
      debit_amount: 60000,
      credit_amount: 0,
      entry_date: '2025-01-25',
      status: 'overdue',
      reference_number: 'SUP-002',
      due_date: '2025-01-30',
      payment_date: null,
      created_at: new Date().toISOString(),
      ledger: { name: 'test', type: 'PAYABLES' }
    }
  ];

  useEffect(() => {
    // Use sample data for now to match the original design
    setLedgers(sampleLedgers);
    setEntries(sampleEntries);
    setLoading(false);
  }, []);

  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('ledgers')
        .insert([{
          name: newLedger.name,
          type: newLedger.type,
          location: newLedger.location,
          balance: newLedger.balance,
          entries_count: 0
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ledger created successfully"
      });

      setShowAddLedger(false);
      resetLedgerForm();
      // Refresh ledgers from database
      fetchLedgers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ledger",
        variant: "destructive"
      });
    }
  };

  const fetchLedgers = async () => {
    try {
      const { data, error } = await supabase
        .from('ledgers')
        .select('*')
        .order('name');

      if (error) throw error;
      setLedgers(data || []);
    } catch (error) {
      // Fallback to sample data if database fails
      setLedgers(sampleLedgers);
    }
  };

  const resetLedgerForm = () => {
    setNewLedger({
      name: '',
      type: 'BANK',
      location: '',
      balance: 0
    });
  };

  const handleViewEntries = (ledger: Ledger) => {
    setSelectedLedger(ledger);
    setShowEntriesModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      due: 'secondary',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getFilteredEntries = () => {
    if (!selectedLedger) return [];
    return sampleEntries.filter(entry => entry.ledger_id === selectedLedger.id);
  };

  const getTypeColor = (type: string) => {
    const colors = {
      BANK: 'text-blue-600',
      PAYABLES: 'text-red-600',
      RECEIVABLES: 'text-green-600',
      CASH: 'text-green-600',
      ASSET: 'text-green-600',
      LIABILITY: 'text-red-600',
      EQUITY: 'text-blue-600',
      INCOME: 'text-purple-600',
      EXPENSE: 'text-orange-600'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  // Calculate summary data
  const totalLedgers = ledgers.length;
  const totalBalance = ledgers.reduce((sum, ledger) => sum + ledger.balance, 0);
  const dueEntries = 0; // Sample data
  const paidEntries = 0; // Sample data

  if (loading) {
    return <div className="text-center py-8">Loading ledger data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Ledger Management
          </h2>
        </div>
        <Button onClick={() => setShowAddLedger(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Ledger
        </Button>
      </div>

      {/* Financial Year Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Financial Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FY 2024-25">FY 2024-25</SelectItem>
              <SelectItem value="FY 2025-26">FY 2025-26</SelectItem>
              <SelectItem value="FY 2026-27">FY 2026-27</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Total Ledgers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLedgers}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatIndianCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Due Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dueEntries}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Paid Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {paidEntries}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ledgers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ledgers">Ledgers</TabsTrigger>
          <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ledgers">
          <Card>
            <CardHeader>
              <CardTitle>All Ledgers - {financialYear}</CardTitle>
              <CardDescription>
                Manage your ledgers across multiple locations and companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell className="font-medium">{ledger.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeColor(ledger.type)}>
                          {ledger.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ledger.location}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatIndianCurrency(ledger.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {ledger.entries_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewEntries(ledger)}
                        >
                          View Entries
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Ledger Entries</CardTitle>
              <CardDescription>
                View and manage all ledger entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ledger</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Payment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.entry_date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.ledger?.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.ledger?.type}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.description}
                        </TableCell>
                        <TableCell>
                          {entry.reference_number || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.debit_amount > 0 ? formatIndianCurrency(entry.debit_amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit_amount > 0 ? formatIndianCurrency(entry.credit_amount) : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(entry.status)}
                        </TableCell>
                        <TableCell>
                          {entry.due_date ? new Date(entry.due_date).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.payment_date ? new Date(entry.payment_date).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No entries found. Add some ledger entries to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Ledger Dialog */}
      {showAddLedger && (
        <Dialog open={showAddLedger} onOpenChange={setShowAddLedger}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Ledger</DialogTitle>
              <DialogDescription>
                Create a new ledger account for your business
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLedger} className="space-y-4">
              <div>
                <Label>Ledger Name</Label>
                <Input
                  value={newLedger.name}
                  onChange={(e) => setNewLedger(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter ledger name"
                  required
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newLedger.type} onValueChange={(value: any) => setNewLedger(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="PAYABLES">Payables</SelectItem>
                    <SelectItem value="RECEIVABLES">Receivables</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={newLedger.location}
                  onChange={(e) => setNewLedger(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  required
                />
              </div>
              <div>
                <Label>Initial Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLedger.balance}
                  onChange={(e) => setNewLedger(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddLedger(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Ledger</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* View Entries Modal */}
      {showEntriesModal && selectedLedger && (
        <Dialog open={showEntriesModal} onOpenChange={setShowEntriesModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Ledger Entries - {selectedLedger.name}
              </DialogTitle>
              <DialogDescription>
                View all entries for {selectedLedger.name} ({selectedLedger.type}) in {selectedLedger.location}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Ledger Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatIndianCurrency(selectedLedger.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Entries</p>
                      <p className="text-lg font-semibold">
                        {selectedLedger.entries_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="text-lg font-semibold flex items-center justify-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedLedger.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entries Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Entries ({getFilteredEntries().length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Payment Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredEntries().map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.entry_date).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.description}
                          </TableCell>
                          <TableCell>
                            {entry.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.debit_amount > 0 ? formatIndianCurrency(entry.debit_amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit_amount > 0 ? formatIndianCurrency(entry.credit_amount) : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(entry.status)}
                          </TableCell>
                          <TableCell>
                            {entry.due_date ? new Date(entry.due_date).toLocaleDateString('en-IN') : '-'}
                          </TableCell>
                          <TableCell>
                            {entry.payment_date ? new Date(entry.payment_date).toLocaleDateString('en-IN') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {getFilteredEntries().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No entries found for this ledger.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowEntriesModal(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};