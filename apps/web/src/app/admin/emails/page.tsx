'use client';

import { useState, useEffect } from 'react';
import { Send, Eye, Mail, Settings, BarChart3 } from 'lucide-react';

interface EmailTemplate {
  name: string;
  description: string;
  defaultVariables: Record<string, any>;
}

const emailTemplates: EmailTemplate[] = [
  {
    name: 'welcome',
    description: 'Welcome email sent after signup',
    defaultVariables: {
      userName: 'John Doe',
    },
  },
  {
    name: 'verify-email',
    description: 'Email verification link',
    defaultVariables: {
      verificationUrl: 'https://remotedevai.com/verify?token=abc123',
    },
  },
  {
    name: 'password-reset',
    description: 'Password reset link',
    defaultVariables: {
      resetUrl: 'https://remotedevai.com/reset?token=xyz789',
    },
  },
  {
    name: 'subscription-created',
    description: 'New subscription confirmation',
    defaultVariables: {
      tier: 'PRO',
    },
  },
  {
    name: 'subscription-cancelled',
    description: 'Subscription cancellation',
    defaultVariables: {
      tier: 'PRO',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    },
  },
  {
    name: 'payment-success',
    description: 'Payment received confirmation',
    defaultVariables: {
      amount: '49.00',
      date: new Date().toLocaleDateString(),
    },
  },
  {
    name: 'payment-failed',
    description: 'Payment failure notification',
    defaultVariables: {},
  },
  {
    name: 'trial-ending',
    description: 'Trial ending reminder',
    defaultVariables: {
      daysLeft: 3,
    },
  },
  {
    name: 'agent-offline',
    description: 'Desktop agent offline notification',
    defaultVariables: {
      agentName: 'My MacBook Pro',
      lastSeen: new Date().toLocaleString(),
    },
  },
  {
    name: 'weekly-summary',
    description: 'Weekly activity summary',
    defaultVariables: {
      sessions: 12,
      projects: 3,
      totalTime: 24,
      recordings: 8,
    },
  },
  {
    name: 'feature-announcement',
    description: 'New feature announcement',
    defaultVariables: {
      featureName: 'AI Code Review',
      featureDescription: 'Get instant AI-powered code reviews to improve code quality and catch bugs early.',
    },
  },
];

export default function AdminEmailsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [variables, setVariables] = useState<string>('{}');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [queueStats, setQueueStats] = useState<any>(null);

  const currentTemplate = emailTemplates.find((t) => t.name === selectedTemplate);

  // Load default variables when template changes
  useEffect(() => {
    if (currentTemplate) {
      setVariables(JSON.stringify(currentTemplate.defaultVariables, null, 2));
    }
  }, [selectedTemplate, currentTemplate]);

  // Load queue stats
  useEffect(() => {
    loadQueueStats();
  }, []);

  const loadQueueStats = async () => {
    try {
      const response = await fetch('/api/email/queue/stats');
      const data = await response.json();
      if (data.success) {
        setQueueStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading queue stats:', error);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const parsedVariables = JSON.parse(variables);

      const response = await fetch('/api/email/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: selectedTemplate,
          variables: parsedVariables,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreviewHtml(data.html);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to preview email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid JSON or preview failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const parsedVariables = JSON.parse(variables);

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${currentTemplate?.description}`,
          template: selectedTemplate,
          variables: parsedVariables,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Test email sent to ${testEmail}!` });
        setTestEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid JSON or send failed' });
    } finally {
      setSending(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      const response = await fetch('/api/email/queue/retry', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Retried ${data.count} failed jobs` });
        loadQueueStats();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to retry jobs' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Template Manager</h1>
          <p className="text-gray-600">Preview, test, and manage email templates</p>
        </div>

        {/* Queue Stats */}
        {queueStats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Email Queue Statistics
              </h2>
              <button
                onClick={handleRetryFailed}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Retry Failed Jobs
              </button>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{queueStats.waiting}</div>
                <div className="text-sm text-gray-600">Waiting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{queueStats.active}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{queueStats.delayed}</div>
                <div className="text-sm text-gray-600">Delayed</div>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Template Selection & Variables */}
          <div className="col-span-4 space-y-6">
            {/* Template Selector */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Select Template
              </h2>
              <div className="space-y-2">
                {emailTemplates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => setSelectedTemplate(template.name)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTemplate === template.name
                        ? 'bg-blue-50 text-blue-900 border-2 border-blue-500'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm opacity-75">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Variable Editor */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Template Variables
              </h2>
              <textarea
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                className="w-full h-64 p-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter JSON variables..."
              />
              <button
                onClick={handlePreview}
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                {loading ? 'Loading...' : 'Preview Email'}
              </button>
            </div>

            {/* Send Test Email */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Test Email
              </h2>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendTest}
                disabled={sending || !testEmail}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h2>
              {previewHtml ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[800px]"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="h-[800px] flex items-center justify-center bg-gray-50 border border-gray-300 rounded-lg">
                  <div className="text-center text-gray-500">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Click "Preview Email" to see the template</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
