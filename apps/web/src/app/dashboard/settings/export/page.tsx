'use client'

import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Archive, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ExportJob {
  id: string
  format: 'JSON' | 'CSV' | 'ZIP'
  type: 'FULL' | 'PROJECT' | 'RECORDINGS' | 'SESSIONS' | 'GDPR'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  size?: number
  createdAt: string
  completedAt?: string
  error?: string
}

export default function ExportPage() {
  const [selectedFormat, setSelectedFormat] = useState<'JSON' | 'CSV' | 'ZIP'>('JSON')
  const [selectedType, setSelectedType] = useState<'FULL' | 'RECORDINGS' | 'SESSIONS'>('FULL')
  const [includeRecordings, setIncludeRecordings] = useState(false)
  const [includeFiles, setIncludeFiles] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [jobs, setJobs] = useState<ExportJob[]>([])

  const formats = [
    {
      id: 'JSON',
      name: 'JSON',
      description: 'Structured data format',
      icon: FileJson,
      color: 'blue',
    },
    {
      id: 'CSV',
      name: 'CSV',
      description: 'Spreadsheet compatible',
      icon: FileSpreadsheet,
      color: 'green',
    },
    {
      id: 'ZIP',
      name: 'ZIP Archive',
      description: 'Includes all files',
      icon: Archive,
      color: 'purple',
    },
  ]

  const exportTypes = [
    {
      id: 'FULL',
      name: 'Full Account Export',
      description: 'All projects, sessions, and recordings',
    },
    {
      id: 'RECORDINGS',
      name: 'Recordings Only',
      description: 'Export all your recordings',
    },
    {
      id: 'SESSIONS',
      name: 'Sessions Only',
      description: 'Export all session data',
    },
  ]

  const handleCreateExport = async () => {
    setIsCreating(true)

    try {
      const response = await fetch('/api/export/full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: selectedFormat,
          includeRecordings,
          includeFiles,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Add job to list
        setJobs([result.data, ...jobs])

        // Poll for status
        pollJobStatus(result.data.id)
      } else {
        alert('Failed to create export: ' + result.message)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to create export')
    } finally {
      setIsCreating(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/export/status/${jobId}`)
        const result = await response.json()

        if (result.success) {
          const updatedJob = result.data

          // Update job in list
          setJobs(prev =>
            prev.map(job => (job.id === jobId ? updatedJob : job))
          )

          // Stop polling if completed or failed
          if (updatedJob.status === 'COMPLETED' || updatedJob.status === 'FAILED') {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error('Failed to get job status:', error)
        clearInterval(interval)
      }
    }, 2000)
  }

  const handleDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/export/download/${jobId}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export-${jobId}.${selectedFormat.toLowerCase()}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download export')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download export')
    }
  }

  const handleGDPRExport = async () => {
    setIsCreating(true)

    try {
      const response = await fetch('/api/export/gdpr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setJobs([result.data, ...jobs])
        pollJobStatus(result.data.id)
      } else {
        alert('Failed to create GDPR export: ' + result.message)
      }
    } catch (error) {
      console.error('GDPR export error:', error)
      alert('Failed to create GDPR export')
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'PROCESSING':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Export & Backup
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Export your data or create encrypted backups
        </p>
      </div>

      {/* GDPR Export */}
      <Card>
        <CardHeader>
          <CardTitle>GDPR Data Export</CardTitle>
          <CardDescription>
            Download all your personal data in a machine-readable format (JSON)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGDPRExport}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Request GDPR Export
          </Button>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Export</CardTitle>
          <CardDescription>
            Choose format and options for your data export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {formats.map((format) => {
                const Icon = format.icon
                const isSelected = selectedFormat === format.id

                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id as any)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    <Icon
                      className={`w-8 h-8 mb-2 ${
                        isSelected
                          ? 'text-primary-500'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <div className="font-medium text-slate-900 dark:text-white">
                      {format.name}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {format.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
              What to Export
            </label>
            <div className="space-y-2">
              {exportTypes.map((type) => (
                <label
                  key={type.id}
                  className="flex items-start p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={type.id}
                    checked={selectedType === type.id}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {type.name}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {type.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeRecordings}
                onChange={(e) => setIncludeRecordings(e.target.checked)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  Include Recordings
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Include recording metadata in export
                </div>
              </div>
            </label>

            {selectedFormat === 'ZIP' && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeFiles}
                  onChange={(e) => setIncludeFiles(e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    Include Recording Files
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Download actual video files (may be large)
                  </div>
                </div>
              </label>
            )}
          </div>

          <Button
            onClick={handleCreateExport}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {isCreating ? 'Creating Export...' : 'Create Export'}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Your recent exports and backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No exports yet. Create your first export above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {job.type} Export ({job.format})
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(job.createdAt).toLocaleString()}
                        {job.size && ` • ${formatBytes(job.size)}`}
                      </div>
                      {job.status === 'PROCESSING' && (
                        <div className="mt-2">
                          <div className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {job.error && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {job.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {job.status === 'COMPLETED' && (
                    <Button
                      size="sm"
                      onClick={() => handleDownload(job.id)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-white mb-1">
                About Exports
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Exports are available for download for 24 hours</li>
                <li>Pro and Enterprise users get automatic daily backups</li>
                <li>Encrypted backups can be restored at any time</li>
                <li>GDPR exports include all your personal data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
