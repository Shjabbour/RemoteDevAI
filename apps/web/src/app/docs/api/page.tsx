import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'Integrate RemoteDevAI into your workflow with our REST API and WebSocket API.',
}

export default function APIPage() {
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
            <h1>API Reference</h1>
            <p className="lead">
              Integrate RemoteDevAI into your workflow with our REST API and WebSocket API.
            </p>

            <h2>Authentication</h2>
            <p>All API requests require an API key. Include it in the Authorization header:</p>
            <pre><code>{`Authorization: Bearer YOUR_API_KEY`}</code></pre>

            <h2>Base URL</h2>
            <pre><code>https://api.remotedevai.com/v1</code></pre>

            <h2>REST API</h2>

            <h3>Projects</h3>
            <h4>List Projects</h4>
            <pre><code>{`GET /projects

Response:
{
  "projects": [
    {
      "id": "proj_123",
      "name": "My Project",
      "path": "/path/to/project",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}</code></pre>

            <h4>Create Project</h4>
            <pre><code>{`POST /projects
{
  "name": "New Project",
  "path": "/path/to/project"
}

Response:
{
  "id": "proj_123",
  "name": "New Project",
  "path": "/path/to/project",
  "created_at": "2024-01-01T00:00:00Z"
}`}</code></pre>

            <h3>Sessions</h3>
            <h4>Start Session</h4>
            <pre><code>{`POST /sessions
{
  "project_id": "proj_123"
}

Response:
{
  "id": "sess_456",
  "project_id": "proj_123",
  "status": "active",
  "stream_url": "wss://stream.remotedevai.com/sess_456",
  "started_at": "2024-01-01T00:00:00Z"
}`}</code></pre>

            <h4>End Session</h4>
            <pre><code>{`DELETE /sessions/:id

Response:
{
  "id": "sess_456",
  "status": "ended",
  "duration": 3600,
  "ended_at": "2024-01-01T01:00:00Z"
}`}</code></pre>

            <h3>Recordings</h3>
            <h4>List Recordings</h4>
            <pre><code>{`GET /recordings

Response:
{
  "recordings": [
    {
      "id": "rec_789",
      "session_id": "sess_456",
      "duration": 3600,
      "size": 123456789,
      "url": "https://cdn.remotedevai.com/rec_789.mp4",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}</code></pre>

            <h2>WebSocket API</h2>
            <p>Connect to the WebSocket API for real-time events:</p>
            <pre><code>{`wss://api.remotedevai.com/v1/ws?token=YOUR_API_KEY

// Subscribe to events
{
  "type": "subscribe",
  "events": ["session.started", "session.ended", "message.received"]
}

// Event format
{
  "type": "session.started",
  "data": {
    "session_id": "sess_456",
    "project_id": "proj_123",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}`}</code></pre>

            <h2>Rate Limits</h2>
            <ul>
              <li><strong>Free:</strong> 100 requests/hour</li>
              <li><strong>Pro:</strong> 1,000 requests/hour</li>
              <li><strong>Team:</strong> 10,000 requests/hour</li>
            </ul>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
