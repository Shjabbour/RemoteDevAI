'use client';

/**
 * FileUpload Component
 *
 * A comprehensive file upload component with:
 * - Drag and drop support
 * - File preview
 * - Upload progress tracking
 * - Multiple file support
 * - File type validation
 * - Size limit enforcement
 */

import React, { useState, useCallback, useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import {
  Upload,
  X,
  File,
  Image,
  Video,
  FileText,
  Archive,
  Code,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FileUploadProps {
  projectId?: string;
  sessionId?: string;
  category?: string;
  isPublic?: boolean;
  multiple?: boolean;
  maxSize?: number; // in bytes
  accept?: string; // MIME types or file extensions
  onUploadComplete?: (files: any[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

const FILE_ICONS = {
  IMAGE: Image,
  VIDEO: Video,
  DOCUMENT: FileText,
  CODE: Code,
  ARCHIVE: Archive,
  GENERAL: File,
};

export function FileUpload({
  projectId,
  sessionId,
  category,
  isPublic = false,
  multiple = false,
  maxSize,
  accept,
  onUploadComplete,
  onUploadError,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploads, uploadFile, cancelUpload, clearUpload } = useFileUpload();

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const filesArray = Array.from(selectedFiles);

      // Validate file size
      if (maxSize) {
        const oversizedFiles = filesArray.filter((file) => file.size > maxSize);
        if (oversizedFiles.length > 0) {
          onUploadError?.(
            `Some files exceed the maximum size of ${formatFileSize(maxSize)}`
          );
          return;
        }
      }

      // Add files to state
      if (multiple) {
        setFiles((prev) => [...prev, ...filesArray]);
      } else {
        setFiles(filesArray);
      }

      // Start upload
      filesArray.forEach((file) => {
        uploadFile(file, {
          projectId,
          sessionId,
          category,
          isPublic,
          onComplete: (result) => {
            onUploadComplete?.([result]);
          },
          onError: (error) => {
            onUploadError?.(error);
          },
        });
      });
    },
    [
      multiple,
      maxSize,
      projectId,
      sessionId,
      category,
      isPublic,
      uploadFile,
      onUploadComplete,
      onUploadError,
    ]
  );

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      handleFileSelect(droppedFiles);
    },
    [handleFileSelect]
  );

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
    },
    [handleFileSelect]
  );

  /**
   * Open file picker
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Remove file
   */
  const removeFile = useCallback(
    (index: number, fileKey?: string) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      if (fileKey) {
        cancelUpload(fileKey);
        clearUpload(fileKey);
      }
    },
    [cancelUpload, clearUpload]
  );

  /**
   * Get file icon
   */
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FILE_ICONS.IMAGE;
    if (mimeType.startsWith('video/')) return FILE_ICONS.VIDEO;
    if (mimeType.includes('pdf') || mimeType.includes('document'))
      return FILE_ICONS.DOCUMENT;
    if (mimeType.includes('zip') || mimeType.includes('tar'))
      return FILE_ICONS.ARCHIVE;
    if (mimeType.includes('javascript') || mimeType.includes('typescript'))
      return FILE_ICONS.CODE;
    return FILE_ICONS.GENERAL;
  };

  /**
   * Get upload status for file
   */
  const getUploadStatus = (file: File) => {
    const fileKey = Array.from(uploads.keys()).find((key) => key.startsWith(file.name));
    if (!fileKey) return null;
    return uploads.get(fileKey);
  };

  return (
    <div className={`file-upload ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop files here, or click to select
        </p>
        {maxSize && (
          <p className="mt-1 text-xs text-gray-500">
            Maximum file size: {formatFileSize(maxSize)}
          </p>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => {
            const status = getUploadStatus(file);
            const Icon = getFileIcon(file.type);
            const fileKey = Array.from(uploads.keys()).find((key) =>
              key.startsWith(file.name)
            );

            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
              >
                {/* File Icon */}
                <Icon className="h-8 w-8 text-gray-500 flex-shrink-0" />

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress Bar */}
                  {status && status.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {status.progress}%
                      </p>
                    </div>
                  )}

                  {/* Processing */}
                  {status && status.status === 'processing' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                      <p className="text-xs text-blue-600">Processing...</p>
                    </div>
                  )}

                  {/* Completed */}
                  {status && status.status === 'completed' && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <p className="text-xs text-green-600">Upload complete</p>
                    </div>
                  )}

                  {/* Error */}
                  {status && status.status === 'error' && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-600" />
                      <p className="text-xs text-red-600">{status.error}</p>
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(index, fileKey)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={status?.status === 'uploading'}
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
