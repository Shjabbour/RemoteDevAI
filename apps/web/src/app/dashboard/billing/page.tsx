import { Check, CreditCard } from 'lucide-react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function BillingPage() {
  // Mock data
  const subscription = {
    plan: 'Pro',
    status: 'active',
    nextBilling: '2024-02-15',
    amount: 29,
  }

  const usage = {
    projects: { current: 12, limit: 'unlimited' },
    voiceTime: { current: 15.5, limit: 20 },
    storage: { current: 24, limit: 90 },
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Billing
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                {subscription.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {subscription.plan}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  ${subscription.amount}/month
                </p>
              </div>
              <Button variant="outline">Change Plan</Button>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Next billing date: {new Date(subscription.nextBilling).toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You will be charged ${subscription.amount} on this date
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Projects
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {usage.projects.current} / {usage.projects.limit}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: '0%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Voice Time
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {usage.voiceTime.current}h / {usage.voiceTime.limit}h
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500"
                    style={{ width: `${(usage.voiceTime.current / usage.voiceTime.limit) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Recording Storage
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {usage.storage.current} / {usage.storage.limit} days
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500"
                    style={{ width: `${(usage.storage.current / usage.storage.limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Visa ending in 4242
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Expires 12/2025
                  </p>
                </div>
              </div>
              <Button variant="outline">Update</Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: '2024-01-15', amount: 29, status: 'paid' },
                { date: '2023-12-15', amount: 29, status: 'paid' },
                { date: '2023-11-15', amount: 29, status: 'paid' },
              ].map((invoice, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      ${invoice.amount}.00
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      Paid
                    </span>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
