'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, Globe, Mail, Phone, Key, Database, Bell, Shield, 
  RefreshCw, Download, Trash2, Save, CheckCircle, AlertCircle,
  Loader2, Eye, EyeOff, Copy, Server, Clock, DollarSign
} from 'lucide-react';
import { useTheme } from '@/context/theme-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

export default function AdminSettings() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [databaseStats, setDatabaseStats] = useState({ users: 0, courses: 0, enrollments: 0 });

  // Settings state
  const [settings, setSettings] = useState({
    platformName: 'Shara Climate Academy',
    timeZone: 'Africa/Lagos',
    platformEmail: 'admin@sharaclimate.com',
    currency: 'NGN',
    supportEmail: 'support@sharaclimate.com',
    phoneNumber: '+234 800 000 0000',
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false,
  });

  const [apiKeys, setApiKeys] = useState({
    apiKey: '',
    webhookSecret: '',
  });

  useEffect(() => {
    fetchSettings();
    fetchDatabaseStats();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsRef = doc(db, 'settings', 'platform');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings({
          platformName: data.platformName || 'Shara Climate Academy',
          timeZone: data.timeZone || 'Africa/Lagos',
          platformEmail: data.platformEmail || 'admin@sharaclimate.com',
          currency: data.currency || 'NGN',
          supportEmail: data.supportEmail || 'support@sharaclimate.com',
          phoneNumber: data.phoneNumber || '+234 800 000 0000',
          emailNotifications: data.emailNotifications !== false,
          smsNotifications: data.smsNotifications || false,
          maintenanceMode: data.maintenanceMode || false,
        });
      }
      
      // Generate or fetch API keys
      const keysRef = doc(db, 'settings', 'apiKeys');
      const keysSnap = await getDoc(keysRef);
      if (keysSnap.exists()) {
        const data = keysSnap.data();
        setApiKeys({
          apiKey: data.apiKey || generateApiKey(),
          webhookSecret: data.webhookSecret || generateWebhookSecret(),
        });
      } else {
        setApiKeys({
          apiKey: generateApiKey(),
          webhookSecret: generateWebhookSecret(),
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      setDatabaseStats({
        users: usersSnapshot.docs.length,
        courses: coursesSnapshot.docs.length,
        enrollments: 0, // Calculate from courses
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateApiKey = () => {
    return `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const generateWebhookSecret = () => {
    return `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'platform');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: new Date(),
        updatedBy: 'admin',
      }, { merge: true });

      const keysRef = doc(db, 'settings', 'apiKeys');
      await setDoc(keysRef, {
        apiKey: apiKeys.apiKey,
        webhookSecret: apiKeys.webhookSecret,
        updatedAt: new Date(),
      }, { merge: true });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const regenerateApiKey = () => {
    setApiKeys({ ...apiKeys, apiKey: generateApiKey() });
    setMessage({ type: 'success', text: 'API Key regenerated! Remember to save.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const regenerateWebhookSecret = () => {
    setApiKeys({ ...apiKeys, webhookSecret: generateWebhookSecret() });
    setMessage({ type: 'success', text: 'Webhook secret regenerated! Remember to save.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: `${name} copied to clipboard!` });
    setTimeout(() => setMessage(null), 2000);
  };

  const clearCache = () => {
    if (confirm('Are you sure you want to clear the cache? This will log you out.')) {
      localStorage.clear();
      sessionStorage.clear();
      setMessage({ type: 'success', text: 'Cache cleared! Redirecting to login...' });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  };

  const downloadBackup = () => {
    const backup = {
      settings,
      apiKeys: { ...apiKeys, apiKey: '***HIDDEN***', webhookSecret: '***HIDDEN***' },
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shara-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Backup downloaded!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const resetToDefaults = () => {
    if (confirm('Reset all settings to default values? This action cannot be undone.')) {
      setSettings({
        platformName: 'Shara Climate Academy',
        timeZone: 'Africa/Lagos',
        platformEmail: 'admin@sharaclimate.com',
        currency: 'NGN',
        supportEmail: 'support@sharaclimate.com',
        phoneNumber: '+234 800 000 0000',
        emailNotifications: true,
        smsNotifications: false,
        maintenanceMode: false,
      });
      setMessage({ type: 'success', text: 'Settings reset to defaults! Click Save to apply.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const timeZones = [
    'Africa/Lagos',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Dubai',
  ];

  const currencies = [
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const SettingCard = ({ title, description, children }: any) => (
    <Card className={isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}>
      <CardHeader>
        <CardTitle className={isDarkMode ? 'text-white' : ''}>{title}</CardTitle>
        <CardDescription className={isDarkMode ? 'text-gray-400' : ''}>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure platform settings and preferences</p>
      </div>

      {message && (
        <Alert className={`${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className={`grid w-full max-w-md grid-cols-4 mb-6 ${isDarkMode ? 'bg-gray-800' : ''}`}>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <SettingCard title="General Settings" description="Basic platform information">
            <div className="space-y-4">
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Platform Name</Label>
                <Input
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Time Zone</Label>
                <select
                  value={settings.timeZone}
                  onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                >
                  {timeZones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Platform Email</Label>
                <Input
                  type="email"
                  value={settings.platformEmail}
                  onChange={(e) => setSettings({ ...settings, platformEmail: e.target.value })}
                  className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Currency</Label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                >
                  {currencies.map(curr => (
                    <option key={curr.code} value={curr.code}>{curr.code} - {curr.name} ({curr.symbol})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Support Email</Label>
                <Input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Phone Number</Label>
                <Input
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <SettingCard title="Notification Settings" description="Configure how users receive notifications">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>Email Notifications</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Send email notifications for platform events</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>SMS Notifications</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Send SMS alerts for critical events</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                />
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <SettingCard title="Security & API Keys" description="Manage API keys and security settings">
            <div className="space-y-6">
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>API Key</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeys.apiKey}
                      onChange={(e) => setApiKeys({ ...apiKeys, apiKey: e.target.value })}
                      className={`pr-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      readOnly
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={regenerateApiKey} size="sm">Regenerate</Button>
                  <Button variant="outline" onClick={() => copyToClipboard(apiKeys.apiKey, 'API Key')} size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Keep this secret. Never share your API key.</p>
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : ''}>Webhook Secret</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={apiKeys.webhookSecret}
                      onChange={(e) => setApiKeys({ ...apiKeys, webhookSecret: e.target.value })}
                      className={`pr-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      readOnly
                    />
                    <button
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={regenerateWebhookSecret} size="sm">Regenerate</Button>
                  <Button variant="outline" onClick={() => copyToClipboard(apiKeys.webhookSecret, 'Webhook Secret')} size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Used to verify webhook authenticity.</p>
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <SettingCard title="System Status" description="Manage system operations">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>Maintenance Mode</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Disable access for all users except admins</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                />
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Database Statistics" description="Current platform data">
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-3 text-center rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className="text-2xl font-bold text-foreground">{databaseStats.users}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
              <div className={`p-3 text-center rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className="text-2xl font-bold text-foreground">{databaseStats.courses}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
              <div className={`p-3 text-center rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Enrollments</p>
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Data Management" description="Backup and maintenance">
            <div className="space-y-3">
              <Button variant="outline" onClick={downloadBackup} className="w-full justify-start gap-2">
                <Download className="h-4 w-4" /> Download Backup
              </Button>
              <Button variant="outline" onClick={clearCache} className="w-full justify-start gap-2 text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" /> Clear Cache
              </Button>
            </div>
          </SettingCard>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-0 pt-4 pb-2 bg-background border-t border-border">
        <Button onClick={saveSettings} disabled={saving} className="bg-green-700 hover:bg-green-800 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
        <Button variant="outline" onClick={resetToDefaults}>Reset to Defaults</Button>
      </div>
    </div>
  );
}