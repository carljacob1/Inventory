import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Save, Building } from "lucide-react";

interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  website: string;
  owner_name: string;
  owner_phone: string;
  city: string;
  state: string;
  postalcode: string;
  country: string;
  gst: string;
  year_start: number;
  currency: string;
}

export const CompanySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    website: "",
    owner_name: "",
    owner_phone: "",
    city: "",
    state: "",
    postalcode: "",
    country: "India",
    gst: "",
    year_start: new Date().getFullYear(),
    currency: "INR"
  });

  useEffect(() => {
    if (user) {
      fetchCompanyDetails();
    }
  }, [user]);

  const fetchCompanyDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_entities')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.business_entities && Array.isArray(data.business_entities) && data.business_entities.length > 0) {
        const businessEntity = data.business_entities[0] as any;
        setCompanyDetails({
          name: businessEntity?.company_name || "",
          address: businessEntity?.address || "",
          phone: businessEntity?.owner_phone || "",
          email: user?.email || "",
          gstin: businessEntity?.gst || "",
          website: businessEntity?.website || "",
          owner_name: businessEntity?.owner_name || "",
          owner_phone: businessEntity?.owner_phone || "",
          city: businessEntity?.city || "",
          state: businessEntity?.state || "",
          postalcode: businessEntity?.postalcode || "",
          country: businessEntity?.country || "India",
          gst: businessEntity?.gst || "",
          year_start: businessEntity?.year_start || new Date().getFullYear(),
          currency: businessEntity?.currency || "INR"
        });
      }
    } catch (error) {
      console.error('Failed to load company details:', error);
      toast({
        title: "Error",
        description: "Failed to load company details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updatedBusinessEntity = {
        company_name: companyDetails.name,
        full_name: companyDetails.owner_name,
        owner_name: companyDetails.owner_name,
        owner_phone: companyDetails.owner_phone,
        address: companyDetails.address,
        city: companyDetails.city,
        state: companyDetails.state,
        postalcode: companyDetails.postalcode,
        country: companyDetails.country,
        gst: companyDetails.gstin,
        website: companyDetails.website,
        year_start: companyDetails.year_start,
        currency: companyDetails.currency
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          business_entities: [updatedBusinessEntity]
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company details updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update company details",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CompanyDetails, value: string | number) => {
    setCompanyDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Company Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Update your company details that will appear on invoices and other documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={companyDetails.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div>
              <Label htmlFor="owner-name">Owner Name</Label>
              <Input
                id="owner-name"
                value={companyDetails.owner_name}
                onChange={(e) => handleInputChange('owner_name', e.target.value)}
                placeholder="Enter owner name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={companyDetails.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={companyDetails.owner_phone}
                onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={companyDetails.gstin}
                onChange={(e) => handleInputChange('gstin', e.target.value)}
                placeholder="Enter GSTIN number"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={companyDetails.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="Enter website URL"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={companyDetails.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter complete address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={companyDetails.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter city"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={companyDetails.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="Enter state"
              />
            </div>

            <div>
              <Label htmlFor="postalcode">Postal Code</Label>
              <Input
                id="postalcode"
                value={companyDetails.postalcode}
                onChange={(e) => handleInputChange('postalcode', e.target.value)}
                placeholder="Enter postal code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={companyDetails.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={companyDetails.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                placeholder="Enter currency code"
              />
            </div>

            <div>
              <Label htmlFor="year-start">Financial Year Start</Label>
              <Input
                id="year-start"
                type="number"
                value={companyDetails.year_start}
                onChange={(e) => handleInputChange('year_start', parseInt(e.target.value))}
                placeholder="Enter year"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full md:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};