import React, { useState } from 'react';
import DonorSidebar from '@/components/donor/DonorSidebar';
import { useDonor } from '@/context/DonorContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Droplets,
  UserCircle,
} from 'lucide-react';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DonorProfilePage = () => {
  const { donorProfile } = useDonor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState(donorProfile);

  return (
    <div className="min-h-screen bg-background">
      <DonorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your donor profile information</p>
          </div>
        </header>

        <div className="p-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{donorProfile.fullName || 'New Donor'}</CardTitle>
                    <CardDescription>Registered Donor</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Read-only)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={formData.email}
                        className="pl-10"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        className="pl-10"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Medical Information
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select
                      value={formData.bloodGroup}
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aadhaar">Aadhaar Number</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="aadhaar"
                        value={formData.aadhaarNumber}
                        className="pl-10"
                        readOnly
                        placeholder="1234 5678 9012"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    readOnly
                    rows={3}
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Contact
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input
                      id="emergencyName"
                      value={formData.emergencyContactName}
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Contact Number</Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyContactNumber}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DonorProfilePage;
