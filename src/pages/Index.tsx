import React, { Suspense, lazy } from "react";
import { 
  Package, 
  BarChart3, 
  ShoppingCart, 
  Warehouse, 
  Truck, 
  FileText, 
  Calculator, 
  Plus, 
  RefreshCw,
  Building,
  Upload,
  WifiOff,
  LogOut,
  Receipt,
  BookOpen,
  Settings
} from "lucide-react";
import { StatCard } from "@/components/inventory/StatCard";
import { NavButton } from "@/components/inventory/NavButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Lazy load components for better performance
const ImportModal = lazy(() => import("@/components/inventory/ImportModal").then(m => ({ default: m.ImportModal })));
const GSTCalculator = lazy(() => import("@/components/inventory/GSTCalculator").then(m => ({ default: m.GSTCalculator })));
const GSTTracker = lazy(() => import("@/components/gst/GSTTracker").then(m => ({ default: m.GSTTracker })));
const LedgerManager = lazy(() => import("@/components/ledger/EnhancedLedgerManager").then(m => ({ default: m.EnhancedLedgerManager })));
const SuppliersManager = lazy(() => import("@/components/business/SuppliersManager").then(m => ({ default: m.SuppliersManager })));
const ProductsManager = lazy(() => import("@/components/business/ProductsManager").then(m => ({ default: m.ProductsManager })));
const InvoiceManager = lazy(() => import("@/components/business/InvoiceManager").then(m => ({ default: m.InvoiceManager })));
const PurchaseOrderManager = lazy(() => import("@/components/business/PurchaseOrderManager").then(m => ({ default: m.PurchaseOrderManager })));
const StockTakeManager = lazy(() => import("@/components/inventory/StockTakeManager").then(m => ({ default: m.StockTakeManager })));
const CompanySettings = lazy(() => import("@/components/business/CompanySettings").then(m => ({ default: m.CompanySettings })));
const ReportsManager = lazy(() => import("@/components/reports/ReportsManager").then(m => ({ default: m.ReportsManager })));

const Index = () => {
  const { user, signOut } = useAuth();
  const [selectedCompany, setSelectedCompany] = React.useState<any>(null);
  const [companies] = React.useState([
    { id: 1, company_name: "Acme Electronics Ltd." },
    { id: 2, company_name: "Tech Solutions Inc." },
    { id: 3, company_name: "Global Imports Co." }
  ]);
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [dashboardData, setDashboardData] = React.useState({
    totalProducts: 1247,
    lowStockItems: 23,
    pendingPOs: 8,
    totalInvoices: 156,
  });
  const [isOffline, setIsOffline] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Check online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-select first company
  React.useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  const loadDashboardData = () => {
    // Simulate data refresh
    setDashboardData(prev => ({
      ...prev,
      totalProducts: prev.totalProducts + Math.floor(Math.random() * 10),
      lowStockItems: Math.max(0, prev.lowStockItems + Math.floor(Math.random() * 5) - 2),
    }));
  };

  const handleImportComplete = () => {
    loadDashboardData();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Package className="h-6 w-6" />
                Inventory Manager
              </h1>
              {isOffline && (
                <span className="bg-warning/10 text-warning px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
              {user && (
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.email}
                </span>
              )}
            </div>

            {/* Company Selector */}
            <div className="flex items-center space-x-4">
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 transition-colors">
                <Plus className="h-4 w-4" />
                Add Company
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Import Modal */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          selectedCompany={selectedCompany}
          onImportComplete={handleImportComplete}
        />
      </Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
              <nav className="space-y-2">
                <NavButton
                  id="dashboard"
                  label="Dashboard"
                  icon={<BarChart3 className="h-5 w-5" />}
                  active={activeTab === "dashboard"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="products"
                  label="Products"
                  icon={<Package className="h-5 w-5" />}
                  active={activeTab === "products"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="purchase-orders"
                  label="Purchase Orders"
                  icon={<ShoppingCart className="h-5 w-5" />}
                  active={activeTab === "purchase-orders"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="stock-take"
                  label="Stock Take"
                  icon={<Warehouse className="h-5 w-5" />}
                  active={activeTab === "stock-take"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="suppliers"
                  label="Suppliers"
                  icon={<Truck className="h-5 w-5" />}
                  active={activeTab === "suppliers"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="invoices"
                  label="Invoices"
                  icon={<FileText className="h-5 w-5" />}
                  active={activeTab === "invoices"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="gst-calculator"
                  label="GST Calculator"
                  icon={<Calculator className="h-5 w-5" />}
                  active={activeTab === "gst-calculator"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="gst-tracker"
                  label="GST Tracker"
                  icon={<Receipt className="h-5 w-5" />}
                  active={activeTab === "gst-tracker"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="reports"
                  label="Reports"
                  icon={<BarChart3 className="h-5 w-5" />}
                  active={activeTab === "reports"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="ledger"
                  label="Ledger Management"
                  icon={<BookOpen className="h-5 w-5" />}
                  active={activeTab === "ledger"}
                  onClick={setActiveTab}
                />
                <NavButton
                  id="settings"
                  label="Company Settings"
                  icon={<Settings className="h-6 w-6" />}
                  active={activeTab === "settings"}
                  onClick={setActiveTab}
                />
                </nav>
              </div>
              
              {/* Bottom section with Company Selector and Sign Out */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Company</label>
                    <select
                      value={selectedCompany?.id || ""}
                      onChange={(e) => {
                        const company = companies.find(
                          (c) => c.id === parseInt(e.target.value)
                        );
                        setSelectedCompany(company);
                      }}
                      className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground text-sm"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedCompany && (
                    <Button
                      onClick={() => setShowImportModal(true)}
                      className="w-full bg-success text-success-foreground hover:bg-success/90"
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="w-full text-muted-foreground hover:text-foreground justify-start"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
          <div className="flex-1">
            {!selectedCompany ? (
              <div className="bg-card rounded-lg shadow-sm p-8 text-center border border-border">
                <div className="text-muted-foreground text-6xl mb-4">
                  <Building className="h-16 w-16 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold text-card-foreground mb-2">
                  Select a Company
                </h2>
                <p className="text-muted-foreground mb-4">
                  Choose a company from the dropdown above to start managing
                  inventory
                </p>
                <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors">
                  Add Your First Company
                </button>
              </div>
            ) : (
              <>
                {/* Dashboard Tab */}
                {activeTab === "dashboard" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-foreground">
                        Dashboard - {selectedCompany.company_name}
                      </h2>
                      <button
                        onClick={loadDashboardData}
                        className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard
                        title="Total Products"
                        value={dashboardData.totalProducts}
                        icon={<Package className="h-6 w-6" />}
                        variant="primary"
                      />
                      <StatCard
                        title="Low Stock Items"
                        value={dashboardData.lowStockItems}
                        icon={<Package className="h-6 w-6" />}
                        variant="warning"
                      />
                      <StatCard
                        title="Pending POs"
                        value={dashboardData.pendingPOs}
                        icon={<ShoppingCart className="h-6 w-6" />}
                        variant="info"
                      />
                      <StatCard
                        title="Total Invoices"
                        value={dashboardData.totalInvoices}
                        icon={<FileText className="h-6 w-6" />}
                        variant="success"
                      />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
                      <h3 className="text-lg font-semibold text-card-foreground mb-4">
                        Quick Actions
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                          onClick={() => setActiveTab("products")}
                          className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center hover:bg-primary/20 transition-colors group"
                        >
                          <Plus className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-primary font-medium">Add Product</p>
                        </button>
                        <button
                          onClick={() => setActiveTab("purchase-orders")}
                          className="bg-success/10 border border-success/20 rounded-lg p-4 text-center hover:bg-success/20 transition-colors group"
                        >
                          <ShoppingCart className="h-8 w-8 text-success mx-auto mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-success font-medium">Create PO</p>
                        </button>
                        <button
                          onClick={() => setActiveTab("stock-take")}
                          className="bg-info/10 border border-info/20 rounded-lg p-4 text-center hover:bg-info/20 transition-colors group"
                        >
                          <Warehouse className="h-8 w-8 text-info mx-auto mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-info font-medium">Stock Take</p>
                        </button>
                        <button
                          onClick={() => setActiveTab("invoices")}
                          className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center hover:bg-warning/20 transition-colors group"
                        >
                          <FileText className="h-8 w-8 text-warning mx-auto mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-warning font-medium">New Invoice</p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lazy loaded components */}
                <Suspense fallback={
                  <div className="bg-card rounded-lg shadow-sm p-8 text-center border border-border">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                }>
                  {activeTab === "gst-calculator" && <GSTCalculator />}
                  {activeTab === "gst-tracker" && <GSTTracker />}
                  {activeTab === "reports" && <ReportsManager />}
                  {activeTab === "ledger" && <LedgerManager />}
                  {activeTab === "products" && <ProductsManager />}
                  {activeTab === "stock-take" && <StockTakeManager />}
                  {activeTab === "purchase-orders" && <PurchaseOrderManager />}
                  {activeTab === "invoices" && <InvoiceManager />}
                  {activeTab === "suppliers" && <SuppliersManager />}
                  {activeTab === "settings" && <CompanySettings />}
                </Suspense>

                {/* Other Tabs - Placeholder for now */}
                {!["dashboard", "gst-calculator", "gst-tracker", "reports", "ledger", "products", "stock-take", "purchase-orders", "invoices", "suppliers", "settings"].includes(activeTab) && (
                  <div className="bg-card rounded-lg shadow-sm p-8 text-center border border-border">
                    <div className="text-muted-foreground text-6xl mb-4">
                      <Package className="h-16 w-16 mx-auto" />
                    </div>
                    <h2 className="text-xl font-semibold text-card-foreground mb-2">
                      {activeTab.charAt(0).toUpperCase() +
                        activeTab.slice(1).replace("-", " ")}{" "}
                      Module
                    </h2>
                    <p className="text-muted-foreground">
                      This module is being built. Click on Dashboard to see
                      available features.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
