import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mobile App Guide',
  description: 'Learn how to use the RemoteDevAI mobile app to code from anywhere.',
}

export default function MobileAppPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/docs" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1>Mobile App Guide</h1>
            <p className="lead">
              Control your development environment from anywhere using the RemoteDevAI mobile app.
            </p>

            <h2>Installation</h2>
            <h3>iOS</h3>
            <ol>
              <li>Open the App Store</li>
              <li>Search for &quot;RemoteDevAI&quot;</li>
              <li>Tap &quot;Get&quot; to install</li>
              <li>Open the app and sign in</li>
            </ol>

            <h3>Android</h3>
            <ol>
              <li>Open Google Play Store</li>
              <li>Search for &quot;RemoteDevAI&quot;</li>
              <li>Tap &quot;Install&quot;</li>
              <li>Open the app and sign in</li>
            </ol>

            <h2>Features</h2>
            <h3>Voice Commands</h3>
            <p>Talk naturally to your AI assistant. Examples:</p>
            <ul>
              <li>&quot;Open the authentication module&quot;</li>
              <li>&quot;Show me where we handle user login&quot;</li>
              <li>&quot;Run the tests&quot;</li>
              <li>&quot;What does this function do?&quot;</li>
            </ul>

            <h3>Video Controls</h3>
            <ul>
              <li><strong>Zoom:</strong> Pinch to zoom in/out</li>
              <li><strong>Pan:</strong> Drag to move around</li>
              <li><strong>Quality:</strong> Tap settings to adjust video quality</li>
            </ul>

            <h3>Recording</h3>
            <p>All sessions are automatically recorded. Access them from:</p>
            <ul>
              <li>The &quot;Recordings&quot; tab in the mobile app</li>
              <li>The web dashboard</li>
              <li>Recordings are kept based on your plan</li>
            </ul>

            <h2>Tips</h2>
            <ul>
              <li>Use headphones to prevent echo and feedback</li>
              <li>Speak clearly and at a normal pace</li>
              <li>The AI can see your screen - reference what&apos;s visible</li>
              <li>For better video quality, use WiFi instead of cellular</li>
            </ul>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
