'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import ProjectCard from '@/components/dashboard/ProjectCard'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

export default function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Mock data - replace with real API calls
  const projects = [
    {
      id: '1',
      name: 'E-commerce Platform',
      path: '/Users/dev/projects/ecommerce',
      lastAccessed: '2024-01-15',
      sessionsCount: 12,
    },
    {
      id: '2',
      name: 'Mobile App',
      path: '/Users/dev/projects/mobile-app',
      lastAccessed: '2024-01-14',
      sessionsCount: 8,
    },
    {
      id: '3',
      name: 'API Server',
      path: '/Users/dev/projects/api-server',
      lastAccessed: '2024-01-13',
      sessionsCount: 15,
    },
    {
      id: '4',
      name: 'Dashboard',
      path: '/Users/dev/projects/dashboard',
      lastAccessed: '2024-01-12',
      sessionsCount: 6,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Projects
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your development projects
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <form className="space-y-4">
          <Input
            label="Project Name"
            placeholder="My Awesome Project"
          />
          <Input
            label="Project Path"
            placeholder="/path/to/project"
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
