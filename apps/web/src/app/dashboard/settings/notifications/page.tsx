'use client'

import { useState, useEffect } from 'react'
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Bell, Mail, Smartphone, Moon, TestTube, Save, RotateCcw } from 'lucide-react'

interface NotificationPreferences {
  // Email notifications
  emailEnabled: boolean
  emailDigest: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'NEVER'

  // Push notifications
  pushEnabled: boolean
  pushSound: boolean

  // In-app notifications
  inAppEnabled: boolean

  // Specific notification types
  sessionStarted: boolean
  sessionEnded: boolean
  agentConnected: boolean
  agentDisconnected: boolean
  recordingReady: boolean
  paymentReminders: boolean
  productUpdates: boolean
  weeklyReport: boolean
  securityAlerts: boolean

  // Quiet hours
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  quietHoursTimezone: string
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      const data = await response.json()

      if (data.success) {
        setPreferences(data.data)
      } else {
        throw new Error(data.message || 'Failed to load preferences')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load preferences',
      })
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setS aving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Preferences saved successfully!' })
        setPreferences(data.data)
      } else {
        throw new Error(data.message || 'Failed to save preferences')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save preferences',
      })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/notifications/preferences/reset', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Preferences reset to defaults!' })
        setPreferences(data.data)
      } else {
        throw new Error(data.message || 'Failed to reset preferences')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reset preferences',
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    setTesting(true)

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Test notification sent! Check your notification center.' })
      } else {
        throw new Error(data.message || 'Failed to send test notification')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send test notification',
      })
    } finally {
      setTesting(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (loading || !preferences) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-8"></div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Notification Preferences
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Customize how and when you receive notifications
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* General Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>Choose how you want to receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Email */}
              <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Receive notifications via email
                    </p>
                  </div>
                </label>

                {preferences.emailEnabled && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email Digest Frequency
                    </label>
                    <select
                      value={preferences.emailDigest}
                      onChange={(e) => updatePreference('emailDigest', e.target.value)}
                      className="w-full max-w-xs px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="REALTIME">Real-time (as they happen)</option>
                      <option value="HOURLY">Hourly digest</option>
                      <option value="DAILY">Daily digest</option>
                      <option value="WEEKLY">Weekly digest</option>
                      <option value="NEVER">Never send emails</option>
                    </select>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Choose how often you want to receive email notifications
                    </p>
                  </div>
                )}
              </div>

              {/* Push */}
              <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={preferences.pushEnabled}
                    onChange={(e) => updatePreference('pushEnabled', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      <p className="font-medium text-slate-900 dark:text-white">Push Notifications</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Receive push notifications on your devices
                    </p>
                  </div>
                </label>

                {preferences.pushEnabled && (
                  <div className="ml-8">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.pushSound}
                        onChange={(e) => updatePreference('pushSound', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Play sound</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Play a sound when receiving push notifications
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* In-App */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.inAppEnabled}
                    onChange={(e) => updatePreference('inAppEnabled', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">In-App Notifications</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Show notifications in the notification center
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>Choose which notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <NotificationToggle
                checked={preferences.sessionStarted}
                onChange={(checked) => updatePreference('sessionStarted', checked)}
                label="Session Started"
                description="When a new coding session begins"
              />

              <NotificationToggle
                checked={preferences.sessionEnded}
                onChange={(checked) => updatePreference('sessionEnded', checked)}
                label="Session Ended"
                description="When a coding session is completed"
              />

              <NotificationToggle
                checked={preferences.agentConnected}
                onChange={(checked) => updatePreference('agentConnected', checked)}
                label="Agent Connected"
                description="When a desktop agent connects"
              />

              <NotificationToggle
                checked={preferences.agentDisconnected}
                onChange={(checked) => updatePreference('agentDisconnected', checked)}
                label="Agent Disconnected"
                description="When a desktop agent disconnects"
              />

              <NotificationToggle
                checked={preferences.recordingReady}
                onChange={(checked) => updatePreference('recordingReady', checked)}
                label="Recording Ready"
                description="When a recording is processed and ready to view"
              />

              <NotificationToggle
                checked={preferences.paymentReminders}
                onChange={(checked) => updatePreference('paymentReminders', checked)}
                label="Payment Reminders"
                description="Billing and payment-related notifications"
              />

              <NotificationToggle
                checked={preferences.productUpdates}
                onChange={(checked) => updatePreference('productUpdates', checked)}
                label="Product Updates"
                description="New features and product announcements"
              />

              <NotificationToggle
                checked={preferences.weeklyReport}
                onChange={(checked) => updatePreference('weeklyReport', checked)}
                label="Weekly Report"
                description="Weekly summary of your activity"
              />

              <NotificationToggle
                checked={preferences.securityAlerts}
                onChange={(checked) => updatePreference('securityAlerts', checked)}
                label="Security Alerts"
                description="Important security and account alerts (recommended)"
                recommended
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Pause non-urgent notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) => updatePreference('quietHoursEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Enable Quiet Hours</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Security alerts will still come through
                  </p>
                </div>
              </label>

              {preferences.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursStart || '22:00'}
                      onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursEnd || '08:00'}
                      onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={preferences.quietHoursTimezone}
                      onChange={(e) => updatePreference('quietHoursTimezone', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                      <option value="Australia/Sydney">Sydney</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={savePreferences} disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>

          <Button
            onClick={sendTestNotification}
            variant="outline"
            disabled={testing}
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {testing ? 'Sending...' : 'Send Test Notification'}
          </Button>

          <Button onClick={resetToDefaults} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  )
}

interface NotificationToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
  recommended?: boolean
}

function NotificationToggle({ checked, onChange, label, description, recommended }: NotificationToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 dark:text-white">{label}</p>
          {recommended && (
            <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </label>
  )
}
