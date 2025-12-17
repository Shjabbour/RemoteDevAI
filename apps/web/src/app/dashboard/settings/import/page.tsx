'use client'

import { useState } from 'react'
import { Upload, CheckCircle, XCircle, Clock, AlertTriangle, FileJson } from 'lucide-react'
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ImportValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    version: string
    type: string
    projectCount: number
    sessionCount: number
    recordingCount: number
  }
  conflicts: {
    existingProjects: string[]
    existingSessions: string[]
  }
}

interface ImportJob {
  id: string
  status: 'PENDING' | 'VALIDATING' | 'IMPORTING' | 'COMPLETED' | 'FAILED'
  progress: number
  totalItems: number
  importedItems: number
  skippedItems: number
  errors: string[]
  createdAt: string
  completedAt?: string
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<any>(null)
  const [validation, setValidation] = useState<ImportValidation | null>(null)
  const [conflictResolution, setConflictResolution] = useState<'SKIP' | 'OVERWRITE' | 'MERGE'>('SKIP')
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importJob, setImportJob] = useState<ImportJob | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setValidation(null)
    setImportJob(null)

    // Read file content
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = JSON.parse(event.target?.result as string)
        setFileContent(content)

        // Auto-validate
        await validateFile(content)
      } catch (error) {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(selectedFile)
  }

  const validateFile = async (content: any) => {
    setIsValidating(true)

    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: content }),
      })

      const result = await response.json()

      if (result.success) {
        setValidation(result.data)
      } else {
        alert('Validation failed: ' + result.message)
      }
    } catch (error) {
      console.error('Validation error:', error)
      alert('Failed to validate file')
    } finally {
      setIsValidating(false)
    }
  }

  const handleImport = async () => {
    if (!fileContent) {
      alert('No file selected')
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch('/api/import/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: fileContent,
          conflictResolution,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setImportJob(result.data)

        // Poll for status
        pollJobStatus(result.data.id)
      } else {
        alert('Failed to start import: ' + result.message)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to start import')
    } finally {
      setIsImporting(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/import/status/${jobId}`)
        const result = await response.json()

        if (result.success) {
          setImportJob(result.data)

          // Stop polling if completed or failed
          if (result.data.status === 'COMPLETED' || result.data.status === 'FAILED') {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error('Failed to get job status:', error)
        clearInterval(interval)
      }
    }, 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'IMPORTING':
      case 'VALIDATING':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Import Data
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Restore data from a backup or export file
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Backup File</CardTitle>
          <CardDescription>
            Select a JSON export or backup file to import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8">
              <div className="text-center">
                <FileJson className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <div className="mb-4">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {file && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>

            {isValidating && (
              <div className="text-center py-4">
                <Clock className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Validating file...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle>
              {validation.valid ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Validation Passed
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  Validation Failed
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">
                Import Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Version</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {validation.summary.version}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Type</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {validation.summary.type}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Projects</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {validation.summary.projectCount}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Sessions</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {validation.summary.sessionCount}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Recordings</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {validation.summary.recordingCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div>
                <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  Errors
                </h3>
                <div className="space-y-2">
                  {validation.errors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div>
                <h3 className="font-medium text-orange-600 dark:text-orange-400 mb-2">
                  Warnings
                </h3>
                <div className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                    >
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-orange-700 dark:text-orange-300">{warning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicts */}
            {(validation.conflicts.existingProjects.length > 0 ||
              validation.conflicts.existingSessions.length > 0) && (
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">
                  Conflict Resolution
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Some items already exist. Choose how to handle conflicts:
                </p>
                <div className="space-y-2">
                  <label className="flex items-start p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="conflictResolution"
                      value="SKIP"
                      checked={conflictResolution === 'SKIP'}
                      onChange={(e) => setConflictResolution(e.target.value as any)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Skip existing items
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Keep existing data, only import new items
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="conflictResolution"
                      value="OVERWRITE"
                      checked={conflictResolution === 'OVERWRITE'}
                      onChange={(e) => setConflictResolution(e.target.value as any)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Overwrite existing items
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Replace existing data with imported data
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="conflictResolution"
                      value="MERGE"
                      checked={conflictResolution === 'MERGE'}
                      onChange={(e) => setConflictResolution(e.target.value as any)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Merge data
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Combine existing and imported data where possible
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Import Button */}
            {validation.valid && (
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? 'Starting Import...' : 'Start Import'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {importJob && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(importJob.status)}
                Import Progress
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Status</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {importJob.status}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${importJob.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Items</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {importJob.totalItems}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Imported</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importJob.importedItems}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Skipped</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {importJob.skippedItems}
                </div>
              </div>
            </div>

            {importJob.errors.length > 0 && (
              <div>
                <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  Import Errors
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importJob.errors.map((error, index) => (
                    <div
                      key={index}
                      className="text-sm text-red-700 dark:text-red-300 p-2 bg-red-50 dark:bg-red-900/20 rounded"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importJob.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-green-700 dark:text-green-300">
                  Import completed successfully!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
