import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { useCompany } from "@/contexts/CompanyContext";
import { 
  BookOpen, 
  Plus, 
  Building, 
  Calendar,
  IndianRupee,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Users
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

interface LedgerEntry {
  id: string;
  entry_date: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  status: 'paid' | 'due' | 'partial';
  financial_year: string;
  ledger_id: string;
  created_at: string;
  updated_at: string;
}

interface Ledger {
  id: string;
  name: string;
  ledger_type: string;
  location: string;
  company_id: string;
  financial_year: string;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
  entries_count: number;
}

interface LedgerStats {
  totalLedgers: number;
  totalBalance: number;
  paidEntries: number;
  dueEntries: number;
  partialEntries: number;
}

export const LedgerManager = () => {
  const { selectedCompany } = useCompany();
  const { isOwnerOrManager, hasPermission, loading: roleLoading } = useRoles();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<string>("");
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LedgerStats>({
    totalLedgers: 0,
    totalBalance: 0,
    paidEntries: 0,
    dueEntries: 0,
    partialEntries: 0
  });
  const [showNewLedgerDialog, setShowNewLedgerDialog] = useState(false);
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);
  const [offlineEntries, setOfflineEntries] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [newLedger, setNewLedger] = useState({
    name: "",
    ledger_type: "cash",
    location: "",
    company_id: "",
    opening_balance: 0
  });

  const [newEntry, setNewEntry] = useState({
    description: "",
    debit_amount: 0,
    credit_amount: 0,
    status: "due" as const,
    entry_date: new Date().toISOString().split('T')[0]
  });

  const { toast } = useToast();

  // Helper functions
  const loadOfflineEntries = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem('offline_ledger_entries') || '[]');
    setOfflineEntries(stored);
  }, []);

  const calculateStats = useCallback((ledgerData: Ledger[]) => {
    const totalBalance = ledgerData.reduce((sum, ledger) => sum + ledger.current_balance, 0);
    
    setStats({
      totalLedgers: ledgerData.length,
      totalBalance,
      paidEntries: 0, // Will be calculated from actual entries
      dueEntries: 0,
      partialEntries: 0
    });
  }, []);

  const fetchLedgers = useCallback(async () => {
    if (!selectedCompany) {
      setLedgers([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');
      
      // Use type assertion to work around missing types
      const { data, error } = await (supabase as any)
        .from('ledgers')
        .select('*')
        .eq('financial_year', selectedFinancialYear)
        .eq('company_id', selectedCompany.company_name)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get entry counts separately
      const ledgersWithCount = await Promise.all((data || []).map(async (ledger: any) => {
        const { count } = await (supabase as any)
          .from('ledger_entries')
          .select('*', { count: 'exact', head: true })
          .eq('ledger_id', ledger.id);
        
        return {
          ...ledger,
          entries_count: count || 0
        };
      }));

      setLedgers(ledgersWithCount);
      calculateStats(ledgersWithCount);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ledgers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedFinancialYear, selectedCompany, calculateStats, toast]);

  const fetchLedgerEntries = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('ledger_entries')
        .select('*')
        .eq('ledger_id', selectedLedger)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ledger entries",
        variant: "destructive"
      });
    }
  }, [selectedLedger, toast]);

  // Effects
  useEffect(() => {
    const fy = getCurrentFinancialYear();
    setSelectedFinancialYear(fy.label);
  }, []);

  useEffect(() => {
    if (!roleLoading && selectedFinancialYear) {
      fetchLedgers();
      loadOfflineEntries();
    }
  }, [roleLoading, selectedFinancialYear, fetchLedgers, loadOfflineEntries]);

  useEffect(() => {
    if (selectedLedger && activeTab === 'entries') {
      fetchLedgerEntries();
    }
  }, [selectedLedger, activeTab, fetchLedgerEntries]);

  useEffect(() => {
    // Check online/offline status with sync function
    const syncOfflineEntries = async () => {
      if (offlineEntries.length === 0) return;

      try {
        const entriesToSync = offlineEntries.filter(entry => entry.id.startsWith('offline_'));
        
        if (entriesToSync.length > 0) {
          const { error } = await (supabase as any)
            .from('ledger_entries')
            .insert(entriesToSync.map(entry => ({
              description: entry.description,
              debit_amount: entry.debit_amount,
              credit_amount: entry.credit_amount,
              status: entry.status,
              entry_date: entry.entry_date,
              ledger_id: entry.ledger_id,
              financial_year: entry.financial_year,
              balance: entry.balance
            })));

          if (error) throw error;

          // Clear synced entries
          localStorage.removeItem('offline_ledger_entries');
          setOfflineEntries([]);
          
          toast({ 
            title: "Sync Complete", 
            description: `${entriesToSync.length} entries synced successfully` 
          });
          
          fetchLedgerEntries();
          fetchLedgers();
        }
      } catch (error) {
        toast({
          title: "Sync Error",
          description: "Failed to sync offline entries",
          variant: "destructive"
        });
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineEntries();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineEntries, toast, fetchLedgerEntries, fetchLedgers]);

  const createLedger = async () => {
    if (!isOwnerOrManager()) {
      toast({
        title: "Access Denied",
        description: "Only owners and managers can create ledgers",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCompany) {
      toast({
        title: "No Company Selected",
        description: "Please select a company before creating a ledger",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('ledgers')
        .insert([{
          ...newLedger,
          company_id: selectedCompany.company_name,
          financial_year: selectedFinancialYear,
          current_balance: newLedger.opening_balance,
          user_id: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Ledger created successfully" });
      setShowNewLedgerDialog(false);
      setNewLedger({
        name: "",
        ledger_type: "cash",
        location: "",
        company_id: "",
        opening_balance: 0
      });
      fetchLedgers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ledger",
        variant: "destructive"
      });
    }
  };

  const createEntry = async () => {
    if (!selectedLedger) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const entryData = {
      ...newEntry,
      ledger_id: selectedLedger,
      financial_year: selectedFinancialYear,
      balance: 0, // Will be calculated
      user_id: userData.user.id
    };

    if (isOffline) {
      // Store offline
      const offlineEntry = {
        ...entryData,
        id: `offline_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const existing = JSON.parse(localStorage.getItem('offline_ledger_entries') || '[]');
      existing.push(offlineEntry);
      localStorage.setItem('offline_ledger_entries', JSON.stringify(existing));
      setOfflineEntries(existing);
      
      toast({ 
        title: "Saved Offline", 
        description: "Entry saved locally. Will sync when online." 
      });
    } else {
      try {
        const { data, error } = await (supabase as any)
          .from('ledger_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;

        toast({ title: "Success", description: "Entry created successfully" });
        fetchLedgerEntries();
        fetchLedgers(); // Refresh to update balances
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create entry",
          variant: "destructive"
        });
      }
    }

    setShowNewEntryDialog(false);
    setNewEntry({
      description: "",
      debit_amount: 0,
      credit_amount: 0,
      status: "due",
      entry_date: new Date().toISOString().split('T')[0]
    });
  };

  const updateEntryStatus = async (entryId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('ledger_entries')
        .update({ status: newStatus })
        .eq('id', entryId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Entry marked as ${newStatus}` 
      });
      fetchLedgerEntries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update entry status",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'partial': return <Clock className="h-4 w-4 text-warning" />;
      case 'due': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'due': return 'destructive';
      default: return 'outline';
    }
  };

  if (roleLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!hasPermission('ledger_management') && !hasPermission('all')) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          Ledger management is only available for Owners and Managers.
        </p>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Ledger Management</h2>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please select a company to view and manage ledgers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Ledger Management</h2>
            <p className="text-sm text-muted-foreground">{selectedCompany.company_name}</p>
          </div>
          {isOffline && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <Upload className="h-3 w-3 mr-1" />
              Offline Mode
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isOwnerOrManager() && (
            <Dialog open={showNewLedgerDialog} onOpenChange={setShowNewLedgerDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ledger
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Ledger</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Ledger Name</Label>
                    <Input
                      value={newLedger.name}
                      onChange={(e) => setNewLedger({...newLedger, name: e.target.value})}
                      placeholder="Enter ledger name"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={newLedger.ledger_type} 
                      onValueChange={(value) => setNewLedger({...newLedger, ledger_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="receivables">Receivables</SelectItem>
                        <SelectItem value="payables">Payables</SelectItem>
                        <SelectItem value="expenses">Expenses</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={newLedger.location}
                      onChange={(e) => setNewLedger({...newLedger, location: e.target.value})}
                      placeholder="Enter location"
                    />
                  </div>
                  <div>
                    <Label>Opening Balance</Label>
                    <Input
                      type="number"
                      value={newLedger.opening_balance}
                      onChange={(e) => setNewLedger({...newLedger, opening_balance: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                  <Button onClick={createLedger} className="w-full">
                    Create Ledger
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Financial Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Financial Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedFinancialYear} onValueChange={setSelectedFinancialYear}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FY 2025-26">FY 2025-26</SelectItem>
                <SelectItem value="FY 2024-25">FY 2024-25</SelectItem>
                <SelectItem value="FY 2023-24">FY 2023-24</SelectItem>
                <SelectItem value="FY 2022-23">FY 2022-23</SelectItem>
              </SelectContent>
            </Select>
            {offlineEntries.length > 0 && (
              <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                {offlineEntries.length} offline entries pending sync
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ledgers"
          value={stats.totalLedgers}
          icon={<BookOpen className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Total Balance"
          value={formatIndianCurrency(stats.totalBalance)}
          icon={<IndianRupee className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Due Entries"
          value={stats.dueEntries}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Paid Entries"
          value={stats.paidEntries}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="info"
        />
      </div>

      {/* Ledger Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="ledgers" onClick={() => {
            setActiveTab("ledgers");
            setSelectedLedger("");
          }}>
            Ledgers
          </TabsTrigger>
          <TabsTrigger value="entries" disabled={!selectedLedger} onClick={() => selectedLedger && setActiveTab("entries")}>
            Entries {selectedLedger && `(${ledgerEntries.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledgers">
          <Card>
            <CardHeader>
              <CardTitle>All Ledgers - {selectedFinancialYear}</CardTitle>
              <CardDescription>
                Manage your ledgers across multiple locations and companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading ledgers...</div>
              ) : ledgers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4" />
                  <p>No ledgers found for {selectedFinancialYear}</p>
                  {isOwnerOrManager() && (
                    <Button 
                      onClick={() => setShowNewLedgerDialog(true)}
                      className="mt-4"
                    >
                      Create Your First Ledger
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgers.map((ledger) => (
                        <TableRow 
                          key={ledger.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedLedger(ledger.id)}
                        >
                          <TableCell className="font-medium">
                            {ledger.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ledger.ledger_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {ledger.location || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatIndianCurrency(ledger.current_balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {ledger.entries_count}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLedger(ledger.id);
                                setActiveTab("entries");
                                fetchLedgerEntries();
                              }}
                            >
                              View Entries
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ledger Entries</CardTitle>
                  <CardDescription>
                    {selectedLedger ? `Managing entries for selected ledger` : 'Select a ledger to view entries'}
                  </CardDescription>
                </div>
                {selectedLedger && isOwnerOrManager() && (
                  <Dialog open={showNewEntryDialog} onOpenChange={setShowNewEntryDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Ledger Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Entry Date</Label>
                          <Input
                            type="date"
                            value={newEntry.entry_date}
                            onChange={(e) => setNewEntry({...newEntry, entry_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                            placeholder="Enter description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Debit Amount</Label>
                            <Input
                              type="number"
                              value={newEntry.debit_amount}
                              onChange={(e) => setNewEntry({...newEntry, debit_amount: Number(e.target.value)})}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label>Credit Amount</Label>
                            <Input
                              type="number"
                              value={newEntry.credit_amount}
                              onChange={(e) => setNewEntry({...newEntry, credit_amount: Number(e.target.value)})}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select 
                            value={newEntry.status} 
                            onValueChange={(value: any) => setNewEntry({...newEntry, status: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="due">Due</SelectItem>
                              <SelectItem value="partial">Partially Paid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={createEntry} className="w-full">
                          Create Entry
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedLedger ? (
                ledgerEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4" />
                    <p>No entries found for this ledger</p>
                    <Button 
                      onClick={() => setShowNewEntryDialog(true)}
                      className="mt-4"
                    >
                      Add First Entry
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {new Date(entry.entry_date).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right">
                              {entry.debit_amount > 0 ? formatIndianCurrency(entry.debit_amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.credit_amount > 0 ? formatIndianCurrency(entry.credit_amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatIndianCurrency(entry.balance)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(entry.status)}
                                <Badge variant={getStatusColor(entry.status)}>
                                  {entry.status.toUpperCase()}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={entry.status}
                                onValueChange={(value) => updateEntryStatus(entry.id, value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="due">Due</SelectItem>
                                  <SelectItem value="partial">Partial</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>Select a ledger from the Ledgers tab to view its entries</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};