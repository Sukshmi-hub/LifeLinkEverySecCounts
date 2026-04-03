import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, MapPin, Mail, Clock, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { serverUrl } from '@/lib/serverConfig';

const HospitalProfile = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'City General Hospital',
    registrationNumber: 'HOS-2024-12345',
    type: 'Government',
    email: 'contact@cityhospital.com',
    emergencyPhone: '+91 98765 43211', // Emergency contact remains
    address: '123 Healthcare Avenue, Medical District, Mumbai - 400001',
    workingHours: '24/7',
  });

  // Load hospital profile from backend when available
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch(`${serverUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const json = await resp.json();
        if (!json || !json.success || !json.data || !json.data.user) return;
        const profileUser = json.data.user;

        setProfile(prev => ({
          ...prev,
          name: profileUser.name || profileUser.organizationName || prev.name,
          registrationNumber: profileUser.registration_number || profileUser.registrationNumber || prev.registrationNumber,
          type: profileUser.hospital_type || profileUser.type || prev.type,
          email: profileUser.email || prev.email,
          emergencyPhone: profileUser.contact_phone || profileUser.hospitalContactPhone || prev.emergencyPhone,
          address: profileUser.address || (profileUser.location && profileUser.location.full_address) || prev.address,
          workingHours: profileUser.working_hours || profileUser.workingHours || prev.workingHours,
        }));
      } catch (err) {
        // ignore errors
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hospital Profile</h2>
          <p className="text-muted-foreground">Manage hospital information and settings</p>
        </div>
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
              <Mail className="w-5 h-5" />
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
            {/* Emergency Contact Added Back */}
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
          </CardContent>
        </Card>

        {/* Location and Hours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location & Hours
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
      </div>
    </div>
  );
};

export default HospitalProfile;


