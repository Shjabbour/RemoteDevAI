import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Folder, Clock, Video } from 'lucide-react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Props = {
  params: { id: string }
}

export default function ProjectDetailPage({ params }: Props) {
  // Mock data - replace with real API call
  const project = {
    id: params.id,
    name: 'E-commerce Platform',
    path: '/Users/dev/projects/ecommerce',
    created: '2024-01-01',
    lastAccessed: '2024-01-15',
    sessionsCount: 12,
    recordingsCount: 24,
  }

  const recentSessions = [
    { id: '1', date: '2024-01-15', duration: 3600 },
    { id: '2', date: '2024-01-14', duration: 2400 },
    { id: '3', date: '2024-01-13', duration: 1800 },
  ]

  if (!project) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <Folder className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {project.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{project.path}</p>
          </div>
        </div>
        <Button>Start Session</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sessions</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {project.sessionsCount}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Recordings</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {project.recordingsCount}
                </p>
              </div>
              <Video className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Last Accessed</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {new Date(project.lastAccessed).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Session on {new Date(session.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Duration: {Math.floor(session.duration / 60)} minutes
                  </p>
                </div>
                <Link href={`/dashboard/recordings/${session.id}`}>
                  <Button variant="outline" size="sm">
                    View Recording
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
