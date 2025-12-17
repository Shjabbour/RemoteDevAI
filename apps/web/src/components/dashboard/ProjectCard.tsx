import Link from 'next/link'
import { Folder, Clock, MoreVertical } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    path: string
    lastAccessed?: string
    sessionsCount: number
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card hover className="group">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <Folder className="w-6 h-6 text-white" />
          </div>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <MoreVertical className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
          {project.name}
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 truncate">
          {project.path}
        </p>

        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {project.lastAccessed ? formatDate(project.lastAccessed) : 'Never'}
          </div>
          <span>{project.sessionsCount} sessions</span>
        </div>
      </Card>
    </Link>
  )
}
