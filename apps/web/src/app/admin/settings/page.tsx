'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Plus } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Setting {
  id: string;
  key: string;
  value: any;
  description: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
  });
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: any, description?: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ value, description }),
      });

      if (res.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSetting = async () => {
    if (!newSetting.key || !newSetting.value) return;

    try {
      setSaving(true);
      let parsedValue = newSetting.value;
      try {
        parsedValue = JSON.parse(newSetting.value);
      } catch {
        // Keep as string if not valid JSON
      }

      await handleUpdateSetting(newSetting.key, parsedValue, newSetting.description);
      setNewSetting({ key: '', value: '', description: '' });
      setShowNewForm(false);
    } catch (error) {
      console.error('Failed to create setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBoolean = async (setting: Setting) => {
    const newValue = !setting.value;
    await handleUpdateSetting(setting.key, newValue, setting.description || undefined);
  };

  const renderSettingInput = (setting: Setting) => {
    if (typeof setting.value === 'boolean') {
      return (
        <button
          onClick={() => handleToggleBoolean(setting)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            setting.value
              ? 'bg-blue-600 dark:bg-blue-500'
              : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              setting.value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
    }

    if (typeof setting.value === 'number') {
      return (
        <Input
          type="number"
          defaultValue={setting.value}
          onBlur={(e) =>
            handleUpdateSetting(
              setting.key,
              parseFloat(e.target.value),
              setting.description || undefined
            )
          }
          className="max-w-xs"
        />
      );
    }

    if (typeof setting.value === 'object') {
      return (
        <textarea
          defaultValue={JSON.stringify(setting.value, null, 2)}
          onBlur={(e) => {
            try {
              const value = JSON.parse(e.target.value);
              handleUpdateSetting(setting.key, value, setting.description || undefined);
            } catch {
              alert('Invalid JSON');
            }
          }}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
          rows={4}
        />
      );
    }

    return (
      <Input
        type="text"
        defaultValue={setting.value}
        onBlur={(e) =>
          handleUpdateSetting(setting.key, e.target.value, setting.description || undefined)
        }
        className="max-w-xs"
      />
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          System Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage system configuration and feature flags
        </p>
      </div>

      <div className="mb-6">
        <Button onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Setting
        </Button>
      </div>

      {showNewForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Setting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Key
                </label>
                <Input
                  type="text"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  placeholder="e.g., feature.new_feature_enabled"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Value (JSON)
                </label>
                <Input
                  type="text"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  placeholder='e.g., true, 100, "text", or {"key": "value"}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <Input
                  type="text"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  placeholder="Description of this setting"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCreateSetting} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Create
                </Button>
                <Button onClick={() => setShowNewForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {settings.map((setting) => (
                <div key={setting.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <SettingsIcon className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                          {setting.key}
                        </h3>
                      </div>
                      {setting.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {setting.description}
                        </p>
                      )}
                      <div className="mt-2">
                        {renderSettingInput(setting)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {settings.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No settings configured
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Common Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p>
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                maintenance.mode
              </code>
              - Enable/disable maintenance mode
            </p>
            <p>
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                feature.beta_features
              </code>
              - Enable beta features for all users
            </p>
            <p>
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                limits.max_projects_per_user
              </code>
              - Maximum number of projects per user
            </p>
            <p>
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                limits.max_session_duration
              </code>
              - Maximum session duration in minutes
            </p>
            <p>
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                api.rate_limit
              </code>
              - API rate limit per minute
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
