import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Shield, 
  Bell, 
  Users, 
  Palette,
  Server,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    registrationsEnabled: true,
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    autoVerification: false,
    darkModeDefault: false,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Setting updated successfully');
  };

  const handleSave = () => {
    toast.success('All settings saved');
  };

  return (
    <div className="space-y-6">
      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Platform-level configuration options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">User Registrations</p>
                <p className="text-sm text-muted-foreground">Allow new users to register on the platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={settings.registrationsEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {settings.registrationsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                checked={settings.registrationsEnabled}
                onCheckedChange={() => handleToggle('registrationsEnabled')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Temporarily disable access for all non-admin users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={settings.maintenanceMode ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                {settings.maintenanceMode ? 'Active' : 'Inactive'}
              </Badge>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={() => handleToggle('maintenanceMode')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Auto Verification</p>
                <p className="text-sm text-muted-foreground">Automatically verify new user registrations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={settings.autoVerification ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                {settings.autoVerification ? 'On' : 'Off'}
              </Badge>
              <Switch
                checked={settings.autoVerification}
                onCheckedChange={() => handleToggle('autoVerification')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Toggles
          </CardTitle>
          <CardDescription>
            Configure system-wide notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Send email alerts to users</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-muted-foreground">Send SMS alerts to users</p>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={() => handleToggle('smsNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Send browser push notifications</p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={() => handleToggle('pushNotifications')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme & Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Default Dark Mode</p>
              <p className="text-sm text-muted-foreground">Use dark theme as default for new users</p>
            </div>
            <Switch
              checked={settings.darkModeDefault}
              onCheckedChange={() => handleToggle('darkModeDefault')}
            />
          </div>

          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium">Platform Branding</p>
            </div>
            <p className="text-sm text-muted-foreground">
              LifeLink branding is applied. Custom branding requires enterprise license.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Settings className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;