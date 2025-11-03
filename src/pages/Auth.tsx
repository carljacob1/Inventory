import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';

// Web3Forms Access Key - Get yours from https://web3forms.com
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY_HERE';
const ADMIN_EMAIL = 'retailmarketingpro1.0@gmail.com';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Contact form states
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    businessType: '',
    message: ''
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        toast.success('Successfully signed in!');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      // Save to database
      const { error: dbError } = await supabase
        .from('contact_inquiries')
        .insert([{
          full_name: contactFormData.fullName,
          email: contactFormData.email,
          mobile_number: contactFormData.mobileNumber,
          business_type: contactFormData.businessType || null,
          message: contactFormData.message
        }]);

      if (dbError) throw dbError;

      // Prepare email content for admin
      const adminEmailBody = `
New Contact Form Submission

Full Name: ${contactFormData.fullName}
Email Address: ${contactFormData.email}
Mobile Number: ${contactFormData.mobileNumber}
${contactFormData.businessType ? `Business Type: ${contactFormData.businessType}\n` : ''}

Message:
${contactFormData.message}

---
This email was sent from the Inventory Manager contact form.
      `.trim();

      // Send email to admin using Web3Forms
      try {
        const adminEmailResponse = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: `New Contact Form Submission from ${contactFormData.fullName}`,
            from_name: 'Inventory Manager Contact Form',
            email: ADMIN_EMAIL,
            message: adminEmailBody,
            replyto: contactFormData.email,
          }),
        });

        const adminResult = await adminEmailResponse.json();
        
        if (!adminEmailResponse.ok || !adminResult.success) {
          console.error('Admin email sending failed:', adminResult);
        }
      } catch (adminEmailErr) {
        console.error('Error sending admin email:', adminEmailErr);
      }

      // Send confirmation email to user immediately
      try {
        const userConfirmationBody = `
Dear ${contactFormData.fullName},

Thank you for contacting us! We have received your message and will get back to you soon.

Your submission details:
- Email: ${contactFormData.email}
- Mobile: ${contactFormData.mobileNumber}
${contactFormData.businessType ? `- Business Type: ${contactFormData.businessType}\n` : ''}

Your Message:
${contactFormData.message}

Our team will review your inquiry and contact you at the earliest convenience.

Best regards,
Inventory Manager Team
        `.trim();

        const userEmailResponse = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: 'Thank You for Contacting Us - Inventory Manager',
            from_name: 'Inventory Manager',
            email: contactFormData.email,
            message: userConfirmationBody,
          }),
        });

        const userResult = await userEmailResponse.json();
        
        if (userEmailResponse.ok && userResult.success) {
          toast.success('Thank you! We have sent a confirmation email to your inbox.');
        } else {
          toast.success('Thank you! Our team will contact you soon.');
        }
      } catch (userEmailErr) {
        console.error('Error sending user confirmation email:', userEmailErr);
        toast.success('Thank you! Our team will contact you soon.');
      }
      
      // Reset form
      setContactFormData({
        fullName: '',
        email: '',
        mobileNumber: '',
        businessType: '',
        message: ''
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-background to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium animated background with parallax effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs with advanced animations */}
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        ></div>
        <div 
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{
            animationDelay: '1s',
            transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.05) 0%, transparent 70%)',
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
            transition: 'transform 0.5s ease-out'
          }}
        ></div>
        
        {/* Floating particles effect */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Animated border glow effect */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.7; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      <div className="w-full max-w-6xl relative z-10 space-y-8">
        {/* Sign Up Notice Banner - Premium Styling */}
        <Card className="relative overflow-hidden border-2 border-orange-500/30 bg-gradient-to-br from-orange-950/90 via-orange-900/80 to-amber-950/90 backdrop-blur-xl shadow-2xl">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 animate-pulse"></div>
          {/* Shimmer effect */}
          <div className="absolute inset-0 shimmer-effect opacity-30"></div>
          
          <CardContent className="p-6 md:p-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/50 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 rounded-full p-3 shadow-lg">
                    <AlertCircle className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2 drop-shadow-lg">
                    Sign Up Available Only on Mobile App
                  </h3>
                  <p className="text-sm md:text-base text-orange-100/90 leading-relaxed max-w-2xl">
                    To create an account and get started, please download our mobile app from the App Store or Google Play Store. The web application is for account management only.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-shrink-0">
                <Button
                  asChild
                  className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold h-12 px-6"
                >
                  <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                    <span className="font-semibold">Google Play Store</span>
                    <ExternalLink className="w-4 h-4 opacity-70" />
                  </a>
                </Button>
                <Button
                  asChild
                  className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold h-12 px-6"
                >
                  <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05,20.28C14.75,21.36 13.5,20.5 12,20.5C10.5,20.5 9.25,21.36 6.95,20.28C4.65,19.2 3.5,16.74 3.5,13.5C3.5,10.26 4.65,7.8 6.95,6.72C9.25,5.64 10.5,6.5 12,6.5C13.5,6.5 14.75,5.64 17.05,6.72C19.35,7.8 20.5,10.26 20.5,13.5C20.5,16.74 19.35,19.2 17.05,20.28M12,2C11.5,2 11,2.19 10.59,2.59C10.19,3 10,3.5 10,4C10,4.5 10.19,5 10.59,5.41C11,5.81 11.5,6 12,6C12.5,6 13,5.81 13.41,5.41C13.81,5 14,4.5 14,4C14,3.5 13.81,3 13.41,2.59C13,2.19 12.5,2 12,2Z" />
                    </svg>
                    <span className="font-semibold">App Store</span>
                    <ExternalLink className="w-4 h-4 opacity-70" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Login Card - Enhanced */}
          <Card className="relative z-10 shadow-2xl border-2 border-primary/20 backdrop-blur-xl bg-gradient-to-br from-card/95 via-card/90 to-card/95 overflow-hidden group hover:border-primary/30 transition-all duration-300">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 shimmer-effect pointer-events-none opacity-20"></div>
            
            {/* Glowing border */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-br-full opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-primary/20 to-transparent rounded-tl-full opacity-50"></div>
            
            <CardHeader className="text-center pb-8 pt-8 relative z-10">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative group/logo">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary via-blue-500 to-primary rounded-2xl opacity-60 blur-xl group-hover/logo:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                  <div className="absolute inset-0 bg-primary/40 rounded-xl blur-lg"></div>
                  <div className="relative bg-gradient-to-br from-primary via-primary/90 to-blue-600 p-4 rounded-xl shadow-2xl transform group-hover/logo:scale-110 group-hover/logo:rotate-3 transition-all duration-300">
                    <Package className="h-10 w-10 text-white drop-shadow-2xl" />
                  </div>
                </div>
                <div className="text-center">
                  <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-foreground via-primary/90 to-foreground bg-clip-text text-transparent mb-2">
                    Inventory Manager
                  </CardTitle>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-semibold text-primary/80">Account Management</span>
                  </div>
                </div>
              </div>
              
              <CardDescription className="text-base font-medium text-foreground/70">
                Sign in to manage your account
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10">
              <form onSubmit={handleSignIn} className="space-y-5">
                {/* Email field */}
                <div className="space-y-2.5">
                  <Label htmlFor="signin-email" className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                    <Mail className="h-4 w-4 text-primary" />
                    Email Address
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300 z-10 pointer-events-none" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      className="pl-12 h-12 text-base bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-lg relative z-10"
                      required
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2.5">
                  <Label htmlFor="signin-password" className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                    <Lock className="h-4 w-4 text-primary" />
                    Password
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300 z-10 pointer-events-none" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      className="pl-12 pr-12 h-12 text-base bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-lg relative z-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 p-1 rounded z-20"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Error alert */}
                {error && (
                  <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300 border-red-500/50 bg-red-500/10 backdrop-blur-sm">
                    <AlertDescription className="flex items-center gap-2 text-sm font-medium">
                      <span className="font-bold">⚠️</span>
                      <span>{error}</span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary via-primary/95 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 shadow-xl hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-lg relative overflow-hidden group" 
                  disabled={isLoading}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span className="relative z-10">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5 relative z-10" />
                      <span className="relative z-10">Sign In</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Form Card - Enhanced */}
          <Card className="relative z-10 shadow-2xl border-2 border-primary/20 backdrop-blur-xl bg-gradient-to-br from-card/95 via-card/90 to-card/95 overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className="absolute inset-0 shimmer-effect pointer-events-none opacity-20"></div>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            {/* Corner accents */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-primary/20 to-transparent rounded-tr-full opacity-50"></div>
            
            <CardHeader className="text-center pb-8 pt-8 relative z-10">
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary via-blue-500 to-primary rounded-full opacity-30 blur-xl animate-pulse"></div>
                <CardTitle className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent relative z-10 drop-shadow-lg">
                  Get in Touch
                </CardTitle>
              </div>
              <CardDescription className="text-base font-medium text-foreground/70 max-w-md mx-auto">
                Fill out the form below and our team will contact you to help set up your business account.
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10">
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-sm font-semibold">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contact-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={contactFormData.fullName}
                      onChange={(e) => setContactFormData({ ...contactFormData, fullName: e.target.value })}
                      className="h-11 bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-semibold">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="your@email.com"
                      value={contactFormData.email}
                      onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                      className="h-11 bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Mobile Number */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-mobile" className="text-sm font-semibold">
                      Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contact-mobile"
                      type="tel"
                      placeholder="9876543210"
                      value={contactFormData.mobileNumber}
                      onChange={(e) => setContactFormData({ ...contactFormData, mobileNumber: e.target.value })}
                      className="h-11 bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  {/* Business Type */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-business" className="text-sm font-semibold">
                      Business Type <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      id="contact-business"
                      type="text"
                      placeholder="e.g., Retail, Restaurant, Healthcare"
                      value={contactFormData.businessType}
                      onChange={(e) => setContactFormData({ ...contactFormData, businessType: e.target.value })}
                      className="h-11 bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-sm font-semibold">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Tell us about your business and setup requirements..."
                    value={contactFormData.message}
                    onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                    className="min-h-[120px] bg-background/50 border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-y"
                    required
                  />
                </div>

                {/* Submit button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary via-primary/95 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 shadow-xl hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-lg relative overflow-hidden group" 
                  disabled={isSubmittingContact}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  {isSubmittingContact ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span className="relative z-10">Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5 relative z-10" />
                      <span className="relative z-10">Send Message</span>
                    </>
                  )}
                </Button>

                {/* Login link */}
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Already have an account?{' '}
                  <Link to="/auth" className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors duration-200">
                    Login here
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
