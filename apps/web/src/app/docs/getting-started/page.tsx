import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Getting Started',
  description: 'Learn how to get started with RemoteDevAI in minutes.',
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1>Getting Started with RemoteDevAI</h1>

            <p className="lead">
              RemoteDevAI lets you work on your development projects from anywhere using voice and video.
              This guide will help you get up and running in minutes.
            </p>

            <h2>What You&apos;ll Need</h2>
            <ul>
              <li>A development machine (Windows, macOS, or Linux)</li>
              <li>A smartphone (iOS or Android)</li>
              <li>A RemoteDevAI account (sign up for free)</li>
            </ul>

            <h2>Step 1: Create an Account</h2>
            <p>
              Visit <Link href="/pricing">our pricing page</Link> and click &quot;Get Started Free&quot; to create your account.
              You&apos;ll get a 14-day free trial with no credit card required.
            </p>

            <h2>Step 2: Install the Desktop Agent</h2>
            <p>
              The desktop agent runs on your development machine and handles screen streaming:
            </p>
            <ol>
              <li>Download the desktop agent for your platform</li>
              <li>Run the installer and follow the prompts</li>
              <li>Sign in with your RemoteDevAI account</li>
              <li>Grant necessary permissions (screen recording, accessibility)</li>
            </ol>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-6">
              <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Platform-Specific Instructions</p>
              <p className="text-sm text-blue-800 dark:text-blue-400 mb-0">
                For detailed installation instructions for your platform, see the{' '}
                <Link href="/docs/desktop-agent">Desktop Agent documentation</Link>.
              </p>
            </div>

            <h2>Step 3: Install the Mobile App</h2>
            <p>
              Download the RemoteDevAI mobile app from the App Store (iOS) or Google Play (Android):
            </p>
            <ol>
              <li>Search for &quot;RemoteDevAI&quot; in your app store</li>
              <li>Install and open the app</li>
              <li>Sign in with the same account you used for the desktop agent</li>
            </ol>

            <h2>Step 4: Pair Your Devices</h2>
            <p>
              Connect your mobile app to your desktop agent:
            </p>
            <ol>
              <li>Make sure both devices are on the same network (or have internet access)</li>
              <li>In the mobile app, tap &quot;Add Device&quot;</li>
              <li>Scan the QR code displayed in the desktop agent, or enter the pairing code</li>
              <li>Confirm the pairing on both devices</li>
            </ol>

            <h2>Step 5: Start Your First Session</h2>
            <p>
              Now you&apos;re ready to start coding remotely:
            </p>
            <ol>
              <li>Open your IDE or development environment on your desktop</li>
              <li>In the mobile app, tap &quot;Start Session&quot;</li>
              <li>You should now see your desktop screen on your phone</li>
              <li>Tap the microphone button to start talking to your AI assistant</li>
            </ol>

            <h2>Tips for Best Experience</h2>
            <ul>
              <li>Use headphones to prevent audio feedback</li>
              <li>Speak clearly and naturally - the AI understands conversational language</li>
              <li>Start with simple commands like &quot;Show me the main file&quot; or &quot;Open the terminal&quot;</li>
              <li>The AI can see your screen, so you can reference what&apos;s visible</li>
            </ul>

            <h2>Next Steps</h2>
            <p>
              Now that you&apos;re set up, explore these resources:
            </p>
            <ul>
              <li><Link href="/docs/desktop-agent">Desktop Agent Guide</Link> - Learn advanced configuration</li>
              <li><Link href="/docs/mobile-app">Mobile App Guide</Link> - Master mobile controls</li>
              <li><Link href="/docs/api">API Reference</Link> - Integrate with your workflow</li>
            </ul>

            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 my-6">
              <p className="font-semibold text-green-900 dark:text-green-300 mb-2">Need Help?</p>
              <p className="text-sm text-green-800 dark:text-green-400 mb-0">
                If you run into any issues, check our <Link href="/support">support page</Link> or{' '}
                <Link href="/contact">contact us</Link> directly.
              </p>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
