import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Desktop Agent Guide',
  description: 'Learn how to install and configure the RemoteDevAI desktop agent.',
}

export default function DesktopAgentPage() {
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
            <h1>Desktop Agent Guide</h1>
            <p className="lead">
              The desktop agent runs on your development machine and enables screen streaming and remote control.
            </p>

            <h2>Installation</h2>
            <h3>Windows</h3>
            <ol>
              <li>Download <code>RemoteDevAI-Setup.exe</code></li>
              <li>Run the installer with administrator privileges</li>
              <li>Follow the installation wizard</li>
              <li>Launch RemoteDevAI from the Start menu</li>
            </ol>

            <h3>macOS</h3>
            <ol>
              <li>Download <code>RemoteDevAI.dmg</code></li>
              <li>Open the DMG and drag RemoteDevAI to Applications</li>
              <li>Launch RemoteDevAI (you may need to allow it in Security & Privacy settings)</li>
              <li>Grant Screen Recording and Accessibility permissions when prompted</li>
            </ol>

            <h3>Linux</h3>
            <pre><code>{`# Ubuntu/Debian
wget https://releases.remotedevai.com/linux/remotedevai.deb
sudo dpkg -i remotedevai.deb

# Fedora/RHEL
wget https://releases.remotedevai.com/linux/remotedevai.rpm
sudo rpm -i remotedevai.rpm`}</code></pre>

            <h2>Configuration</h2>
            <h3>Settings</h3>
            <ul>
              <li><strong>Video Quality:</strong> Choose between 720p, 1080p, or 4K</li>
              <li><strong>Frame Rate:</strong> 15, 30, or 60 FPS</li>
              <li><strong>Audio Quality:</strong> Standard or High</li>
              <li><strong>Auto-start:</strong> Launch agent on system startup</li>
            </ul>

            <h3>Project Configuration</h3>
            <p>Add projects to make them easily accessible:</p>
            <ol>
              <li>Click &quot;Add Project&quot; in the desktop agent</li>
              <li>Select your project directory</li>
              <li>Give it a name and optional description</li>
              <li>The AI can now navigate to this project by name</li>
            </ol>

            <h2>Troubleshooting</h2>
            <h3>Screen not streaming</h3>
            <ul>
              <li>Check screen recording permissions</li>
              <li>Restart the desktop agent</li>
              <li>Verify firewall isn&apos;t blocking the agent</li>
            </ul>

            <h3>High CPU usage</h3>
            <ul>
              <li>Lower video quality or frame rate</li>
              <li>Close unnecessary applications</li>
              <li>Check for background processes</li>
            </ul>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
