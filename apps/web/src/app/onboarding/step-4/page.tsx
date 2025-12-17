'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Github, Plus } from 'lucide-react';
import StepCard from '@/components/onboarding/StepCard';

export default function Step4Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');

  const handleCreate = async () => {
    if (!projectName || !projectType) return;

    setLoading(true);
    try {
      // Create project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, type: projectType }),
      });

      const data = await response.json();

      await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 4,
          data: { projectId: data.data?.id, projectName, created: true },
        }),
      });

      router.push('/onboarding/step-5');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await fetch('/api/onboarding/skip-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 4 }),
      });
      router.push('/onboarding/step-5');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const PROJECT_TYPES = [
    { value: 'web', label: 'Web Application', icon: '🌐' },
    { value: 'mobile', label: 'Mobile App', icon: '📱' },
    { value: 'backend', label: 'Backend API', icon: '⚡' },
    { value: 'fullstack', label: 'Full Stack', icon: '🚀' },
    { value: 'other', label: 'Other', icon: '📦' },
  ];

  return (
    <StepCard
      title="Create Your First Project"
      description="Set up a project to organize your AI coding sessions"
      step={4}
      estimatedTime={3}
    >
      <div className="space-y-6">
        {/* Project Name */}
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
            Project Name *
          </label>
          <input
            id="projectName"
            type="text"
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="My Awesome Project"
          />
        </div>

        {/* Project Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Project Type *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PROJECT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setProjectType(type.value)}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    projectType === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* GitHub Import (Optional) */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Github className="w-5 h-5 mr-2" />
            Import from GitHub (Optional)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Connect your GitHub repository to sync code and track changes
          </p>
          <button className="text-sm text-blue-600 hover:underline font-medium">
            Connect GitHub Repository
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            I'll do this later
          </button>

          <button
            onClick={handleCreate}
            disabled={loading || !projectName || !projectType}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{loading ? 'Creating...' : 'Create Project'}</span>
          </button>
        </div>
      </div>
    </StepCard>
  );
}
