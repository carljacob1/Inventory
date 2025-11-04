import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Warehouse, 
  ShoppingCart, 
  FileText, 
  BarChart3, 
  Receipt, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Calculator,
  BookOpen,
  Users,
  Activity
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSignIn = () => {
    navigate('/auth?view=login');
  };

  const handleSupport = () => {
    navigate('/auth?view=support');
  };

  const handleSignUp = () => {
    navigate('/auth?view=signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/30 via-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{
            animationDelay: '1s',
            transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
        
        {/* Floating particles */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #60a5fa 50%, #fff 100%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/40 rounded-xl blur-xl group-hover:bg-primary/60 transition-all"></div>
                <div className="relative bg-gradient-to-br from-primary via-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Warehouse className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
                  InventoryPath
                </span>
                <div className="text-[10px] text-primary/70 font-medium -mt-1">Smart Inventory Management</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors font-medium relative group">
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all"></span>
              </a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-medium relative group">
                How It Works
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all"></span>
              </a>
              <a href="#support" onClick={handleSupport} className="text-white/80 hover:text-white transition-colors font-medium relative group cursor-pointer">
                Support
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all"></span>
              </a>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleSignIn}
                className="text-white/90 hover:text-white hover:bg-white/10 border-0 font-medium"
              >
                Login
              </Button>
              <Button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 hover:from-primary/90 hover:via-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all font-semibold"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">Complete Inventory Solution</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
              Streamline Your
              <span className="block shimmer-text">Inventory Management</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 leading-relaxed max-w-2xl">
              Powerful, intuitive inventory management system with GST compliance, multi-company support, and comprehensive reporting. Manage your business inventory effortlessly.
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="group flex flex-col items-center text-center p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all hover:scale-105">
                <div className="bg-gradient-to-br from-primary to-blue-500 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="text-white font-semibold">Smart Stock</span>
                <span className="text-white/60 text-sm">Management</span>
              </div>
              <div className="group flex flex-col items-center text-center p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all hover:scale-105">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <span className="text-white font-semibold">GST Compliant</span>
                <span className="text-white/60 text-sm">Invoicing</span>
              </div>
              <div className="group flex flex-col items-center text-center p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all hover:scale-105">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <span className="text-white font-semibold">Real-time</span>
                <span className="text-white/60 text-sm">Analytics</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleSupport}
                size="lg"
                className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 hover:from-primary/90 hover:via-blue-600 hover:to-purple-700 text-white text-lg px-8 py-7 h-auto shadow-2xl hover:shadow-primary/50 transition-all group font-semibold"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                onClick={handleSupport}
                size="lg"
                variant="outline"
                className="border-2 border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 text-white text-lg px-8 py-7 h-auto backdrop-blur-sm font-semibold"
              >
                Schedule Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-white/70 text-sm">No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-white/70 text-sm">Free Setup Support</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="h-6 w-6 text-primary" />
                  Inventory Dashboard
                </h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                </div>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="text-2xl font-bold text-blue-400 mb-1">1,247</div>
                  <div className="text-xs text-white/70">Total Products</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/30 relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="text-2xl font-bold text-orange-400 mb-1">23</div>
                  <div className="text-xs text-white/70">Low Stock Items</div>
                </div>
              </div>

              {/* Status Cards */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-white font-medium text-sm">Inventory Sync</span>
                  </div>
                  <span className="text-green-400 text-xs font-semibold">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="text-white font-medium text-sm">Pending Orders</span>
                  </div>
                  <span className="text-orange-400 text-xs font-semibold">8 Orders</span>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Recent Transactions
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-white/80 text-sm">PO #PO-2024-001</span>
                    <span className="text-white font-semibold text-sm">₹45,280</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-white/80 text-sm">Invoice #INV-2024-156</span>
                    <span className="text-white font-semibold text-sm">₹12,450</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16">
          <Button
            variant="outline"
            className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 mb-6"
          >
            <Zap className="h-4 w-4 mr-2" />
            Powerful Features
          </Button>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Everything You Need to
            <span className="block bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Manage Your Inventory
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Comprehensive inventory management solution with advanced features for modern businesses. From stock tracking to financial reporting, we've got you covered.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Warehouse,
              title: 'Smart Inventory Management',
              description: 'Track products, stock levels, and manage multi-location inventory with real-time updates and automated alerts.',
              color: 'from-blue-500 to-cyan-500'
            },
            {
              icon: ShoppingCart,
              title: 'Purchase Order Management',
              description: 'Create, track, and manage purchase orders with supplier integration and receiving workflows.',
              color: 'from-green-500 to-emerald-500'
            },
            {
              icon: Receipt,
              title: 'Sales & Purchase Invoices',
              description: 'Generate GST-compliant invoices with automatic tax calculations, CGST, SGST, and IGST support.',
              color: 'from-purple-500 to-pink-500'
            },
            {
              icon: Calculator,
              title: 'GST Compliance & Tracking',
              description: 'Automated GST calculations, tax tracking, and comprehensive GST reports for all transactions.',
              color: 'from-orange-500 to-red-500'
            },
            {
              icon: BarChart3,
              title: 'Advanced Financial Reports',
              description: 'Profit & Loss, Trial Balance, Sales Reports, and Payment Reports with detailed analytics.',
              color: 'from-indigo-500 to-purple-500'
            },
            {
              icon: BookOpen,
              title: 'Ledger & Accounting',
              description: 'Complete ledger management with income, expense tracking, and financial summaries.',
              color: 'from-teal-500 to-cyan-500'
            },
            {
              icon: Users,
              title: 'Supplier & Customer Management',
              description: 'Manage suppliers, customers, and business entities with complete contact and tax information.',
              color: 'from-pink-500 to-rose-500'
            },
            {
              icon: FileText,
              title: 'Invoice Aging & Payments',
              description: 'Track due invoices, payment status, and manage receivables with aging reports.',
              color: 'from-yellow-500 to-orange-500'
            },
            {
              icon: Shield,
              title: 'Multi-Company Support',
              description: 'Manage multiple companies from a single account with separate inventories and reports.',
              color: 'from-blue-600 to-indigo-600'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-white/10 hover:border-primary/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent rounded-2xl transition-all"></div>
              <div className="relative z-10">
                <div className={`bg-gradient-to-br ${feature.color} p-4 rounded-xl mb-4 w-fit group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Get Started in
            <span className="block bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Three Simple Steps
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              step: '01',
              title: 'Sign Up',
              description: 'Create your account and set up your company profile with basic business information.',
              icon: Users
            },
            {
              step: '02',
              title: 'Import Inventory',
              description: 'Import your existing inventory from Excel, CSV, or JSON files. Bulk upload supported.',
              icon: Layers
            },
            {
              step: '03',
              title: 'Start Managing',
              description: 'Begin creating invoices, managing stock, and generating reports. Full setup support included.',
              icon: CheckCircle
            }
          ].map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-white/10 hover:border-primary/50 transition-all text-center">
                <div className="text-6xl font-extrabold text-primary/20 mb-4">{step.step}</div>
                <div className="bg-gradient-to-br from-primary to-blue-500 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/70">{step.description}</p>
              </div>
              {index < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="h-8 w-8 text-primary/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="relative bg-gradient-to-br from-primary/20 via-blue-500/20 to-purple-500/20 rounded-3xl p-12 md:p-16 border border-primary/30 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Ready to Transform Your Inventory Management?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using InventoryPath to streamline their inventory operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleSupport}
                size="lg"
                className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 hover:from-primary/90 hover:via-blue-600 hover:to-purple-700 text-white text-lg px-8 py-7 h-auto shadow-2xl hover:shadow-primary/50 transition-all font-semibold"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={handleSignIn}
                size="lg"
                variant="outline"
                className="border-2 border-white/30 hover:border-primary/50 bg-white/10 hover:bg-white/20 text-white text-lg px-8 py-7 h-auto backdrop-blur-sm font-semibold"
              >
                Login to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/60 backdrop-blur-xl py-12 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary via-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent block">
                  InventoryPath
                </span>
                <span className="text-xs text-white/60">Smart Inventory Management</span>
              </div>
            </div>
            <div className="flex items-center gap-8 text-white/70 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#support" onClick={handleSupport} className="hover:text-white transition-colors cursor-pointer">Support</a>
            </div>
            <div className="text-white/60 text-sm">
              © 2024 InventoryPath. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
