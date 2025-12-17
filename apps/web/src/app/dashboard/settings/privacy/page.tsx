'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Info, CheckCircle } from 'lucide-react';

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState({
    analyticsEnabled: true,
    trackingEnabled: true,
    errorReportingEnabled: true,
    anonymizeData: false,
    shareUsageData: true,
    emailNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/analytics/preferences');
      const data = await response.json();

      if (data.success && data.data) {
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/analytics/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: string, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Privacy Settings</h1>
          <p className="text-gray-500">Manage your privacy and data sharing preferences</p>
        </div>
      </div>

      {saved && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your preferences have been saved successfully.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analytics & Tracking</CardTitle>
          <CardDescription>
            Control how we collect and use your data to improve our services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="analytics">Analytics</Label>
              <p className="text-sm text-gray-500">
                Allow us to collect usage statistics to improve the platform
              </p>
            </div>
            <Switch
              id="analytics"
              checked={preferences.analyticsEnabled}
              onCheckedChange={(checked) => updatePreference('analyticsEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="tracking">User Tracking</Label>
              <p className="text-sm text-gray-500">
                Track your activity to provide personalized recommendations
              </p>
            </div>
            <Switch
              id="tracking"
              checked={preferences.trackingEnabled}
              onCheckedChange={(checked) => updatePreference('trackingEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="error-reporting">Error Reporting</Label>
              <p className="text-sm text-gray-500">
                Automatically send error reports to help us fix bugs faster
              </p>
            </div>
            <Switch
              id="error-reporting"
              checked={preferences.errorReportingEnabled}
              onCheckedChange={(checked) => updatePreference('errorReportingEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy</CardTitle>
          <CardDescription>Control how your data is collected and stored</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="anonymize">Anonymize Data</Label>
              <p className="text-sm text-gray-500">
                Remove personally identifiable information from analytics data
              </p>
            </div>
            <Switch
              id="anonymize"
              checked={preferences.anonymizeData}
              onCheckedChange={(checked) => updatePreference('anonymizeData', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="share-usage">Share Usage Data</Label>
              <p className="text-sm text-gray-500">
                Share anonymized usage data to help improve the platform
              </p>
            </div>
            <Switch
              id="share-usage"
              checked={preferences.shareUsageData}
              onCheckedChange={(checked) => updatePreference('shareUsageData', checked)}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              When anonymization is enabled, we remove your IP address, location data, and other
              identifying information before storing analytics events.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive updates and alerts via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive real-time notifications in your browser
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What We Collect</CardTitle>
          <CardDescription>Transparency about data collection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">When Analytics is Enabled:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Page views and navigation patterns</li>
              <li>Feature usage and interactions</li>
              <li>Session duration and frequency</li>
              <li>Device and browser information</li>
              <li>Performance metrics (load times, API response times)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">When Error Reporting is Enabled:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Error messages and stack traces</li>
              <li>Context about when the error occurred</li>
              <li>Browser and system information</li>
              <li>User actions leading to the error</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">We Never Collect:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Passwords or authentication tokens</li>
              <li>Personal messages or conversations</li>
              <li>Credit card or payment information (handled by Stripe)</li>
              <li>Code or project content without explicit permission</li>
            </ul>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All data is encrypted in transit and at rest. We comply with GDPR, CCPA, and other
              privacy regulations. You can request a copy of your data or deletion at any time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={fetchPreferences} disabled={saving}>
          Reset
        </Button>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
