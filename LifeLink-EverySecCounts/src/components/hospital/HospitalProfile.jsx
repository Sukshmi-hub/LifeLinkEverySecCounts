import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Building2, Phone, MapPin, Mail, Globe, Clock, Save, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const HospitalProfile = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'City General Hospital',
    registrationNumber: 'HOS-2024-12345',
    type: 'Government',
    email: 'contact@cityhospital.com',
    phone: '+91 98765 43210',
    emergencyPhone: '+91 98765 43211',
    address: '123 Healthcare Avenue, Medical District, Mumbai - 400001',
    website: 'www.cityhospital.com',
    beds: 500,
    icuBeds: 50,
    bloodBankAvailable: true,
    organTransplantLicense: true,
    workingHours: '24/7',
  });

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Hospital profile has been saved successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hospital Profile</h2>
          <p className="text-muted-foreground">Manage hospital information and settings</p>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hospital Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input
                value={profile.registrationNumber}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Hospital Type</Label>
              <Input
                value={profile.type}
                onChange={(e) => setProfile({ ...profile, type: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone
              </Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Emergency Phone
              </Label>
              <Input
                value={profile.emergencyPhone}
                onChange={(e) => setProfile({ ...profile, emergencyPhone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Website
              </Label>
              <Input
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Address</Label>
              <Textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Working Hours
              </Label>
              <Input
                value={profile.workingHours}
                onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Facilities */}
        <Card>
          <CardHeader>
            <CardTitle>Facilities & Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Beds</Label>
                <Input
                  type="number"
                  value={profile.beds}
                  onChange={(e) => setProfile({ ...profile, beds: parseInt(e.target.value) || 0 })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>ICU Beds</Label>
                <Input
                  type="number"
                  value={profile.icuBeds}
                  onChange={(e) => setProfile({ ...profile, icuBeds: parseInt(e.target.value) || 0 })}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Blood Bank Available</Label>
              <Switch
                checked={profile.bloodBankAvailable}
                onCheckedChange={(checked) => setProfile({ ...profile, bloodBankAvailable: checked })}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Organ Transplant License</Label>
              <Switch
                checked={profile.organTransplantLicense}
                onCheckedChange={(checked) => setProfile({ ...profile, organTransplantLicense: checked })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HospitalProfile;