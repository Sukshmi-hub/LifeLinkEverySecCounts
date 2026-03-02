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
  HandHeart,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

const NgoSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    fundRequestAlerts: true,
    twoFactorAuth: false,
    showProfile: true,
    darkMode: false,
    language: 'English',
    soundAlerts: true,
    autoApproveSmall: false,
  });

  const handleToggle = (key) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
      toast.success('Setting updated successfully');
    }
  };

  const handleSave = () => {
    localStorage.setItem('lifelink_ngo_settings', JSON.stringify(settings));
    toast.success('All settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">NGO Settings</h2>
        <p className="text-muted-foreground">Manage organization preferences and notifications</p>
      </div>

      {/* NGO-Specific Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" />
            Fund Management
          </CardTitle>
          <CardDescription>
            Configure fund request handling preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Fund Request Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified for new fund requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary">Important</Badge>
              <Switch
                checked={settings.fundRequestAlerts}
                onCheckedChange={() => handleToggle('fundRequestAlerts')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <HandHeart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Auto-Approve Small Requests</p>
                <p className="text-sm text-muted-foreground">Automatically approve requests under ₹5,000</p>
              </div>
            </div>
            <Switch
              checked={settings.autoApproveSmall}
              onCheckedChange={() => handleToggle('autoApproveSmall')}
            />
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

      {/* Privacy & Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Manage your organization account security
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
                <p className="font-medium">Public Visibility</p>
                <p className="text-sm text-muted-foreground">Show organization in partner listings</p>
              </div>
            </div>
            <Switch
              checked={settings.showProfile}
              onCheckedChange={() => handleToggle('showProfile')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
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

export default NgoSettings;