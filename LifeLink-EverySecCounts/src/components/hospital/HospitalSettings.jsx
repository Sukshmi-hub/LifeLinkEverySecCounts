
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  Shield,
  Palette,
  Globe,
  Lock,
  Eye,
  Volume2,
  Smartphone,
  Building2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const HospitalSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    redAlertNotifications: true,
    twoFactorAuth: true,
    showProfile: true,
    darkMode: false,
    language: 'English',
    soundAlerts: true,
    autoAcceptRequests: false,
    operatingHours: '24/7',
  });

  const handleToggle = (key) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
      toast.success('Setting updated successfully');
    }
  };

  const handleSave = () => {
    localStorage.setItem('lifelink_hospital_settings', JSON.stringify(settings));
    toast.success('All settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Hospital Settings</h2>
        <p className="text-muted-foreground">Manage hospital preferences and notifications</p>
      </div>

      {/* Hospital-Specific Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Hospital Configuration
          </CardTitle>
          <CardDescription>
            Configure hospital-specific settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Red Alert Notifications</p>
                <p className="text-sm text-muted-foreground">Receive emergency red alerts instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-destructive/20 text-destructive">Critical</Badge>
              <Switch
                checked={settings.redAlertNotifications}
                onCheckedChange={() => handleToggle('redAlertNotifications')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Auto-Accept Requests</p>
                <p className="text-sm text-muted-foreground">Automatically accept incoming requests</p>
              </div>
            </div>
            <Switch
              checked={settings.autoAcceptRequests}
              onCheckedChange={() => handleToggle('autoAcceptRequests')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Operating Hours</p>
                <p className="text-sm text-muted-foreground">Hospital availability status</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success">
              {settings.operatingHours}
            </Badge>
          </div>

        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to receive updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Get SMS alerts for urgent updates</p>
              </div>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={() => handleToggle('smsNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Sound Alerts</p>
                <p className="text-sm text-muted-foreground">Play sound for important notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.soundAlerts}
              onCheckedChange={() => handleToggle('soundAlerts')}
            />
          </div>

        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Manage your hospital account security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={settings.twoFactorAuth ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}>
                {settings.twoFactorAuth ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={() => handleToggle('twoFactorAuth')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Public Listing</p>
                <p className="text-sm text-muted-foreground">Show hospital in public search results</p>
              </div>
            </div>
            <Switch
              checked={settings.showProfile}
              onCheckedChange={() => handleToggle('showProfile')}
            />
          </div>

        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={() => handleToggle('darkMode')}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Language</p>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
              </div>
            </div>
            <Badge variant="outline">{settings.language}</Badge>
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

export default HospitalSettings;
