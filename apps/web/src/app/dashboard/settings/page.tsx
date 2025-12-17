'use client'

import { useState } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { currentUser } from '@clerk/nextjs'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    videoQuality: '1080p',
    frameRate: '30',
    autoStart: true,
    notifications: true,
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
              />
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {/* Video Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Video Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Quality
                </label>
                <select
                  value={settings.videoQuality}
                  onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p (Recommended)</option>
                  <option value="4k">4K</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Frame Rate
                </label>
                <select
                  value={settings.frameRate}
                  onChange={(e) => setSettings({ ...settings, frameRate: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="15">15 FPS</option>
                  <option value="30">30 FPS (Recommended)</option>
                  <option value="60">60 FPS</option>
                </select>
              </div>

              <Button>Save Settings</Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoStart}
                  onChange={(e) => setSettings({ ...settings, autoStart: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Auto-start agent</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically start the desktop agent on system startup
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Enable notifications</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Receive notifications for session updates
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
