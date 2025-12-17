'use client';

/**
 * FileManager Component
 *
 * A comprehensive file management component with:
 * - File list view (grid/list toggle)
 * - Sort by name/date/size
 * - Search files
 * - Bulk actions (download, delete)
 * - File preview
 * - Pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  File,
  Image,
  Video,
  FileText,
  Archive,
  Code,
  Download,
  Trash2,
  Search,
  Grid,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  X,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  status: string;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  downloadCount: number;
}

interface FileManagerProps {
  projectId?: string;
  onFileSelect?: (file: FileItem) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortField = 'filename' | 'uploadedAt' | 'size';
type SortOrder = 'asc' | 'desc';

const FILE_ICONS = {
  IMAGE: Image,
  VIDEO: Video,
  DOCUMENT: FileText,
  CODE: Code,
  ARCHIVE: Archive,
  GENERAL: File,
};

export function FileManager({
  projectId,
  onFileSelect,
  className = '',
}: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const itemsPerPage = 20;

  /**
   * Fetch files
   */
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      if (projectId) {
        params.projectId = projectId;
      }

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      const response = await axios.get(`${API_URL}/upload`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setFiles(response.data.data.files);
      setTotalFiles(response.data.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedCategory, currentPage]);

  /**
   * Load files on mount and when filters change
   */
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  /**
   * Filter and sort files
   */
  useEffect(() => {
    let result = [...files];

    // Search filter
    if (searchQuery) {
      result = result.filter((file) =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'filename':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'uploadedAt':
          comparison =
            new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(result);
  }, [files, searchQuery, sortField, sortOrder]);

  /**
   * Toggle file selection
   */
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all files
   */
  const selectAll = useCallback(() => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    }
  }, [filteredFiles, selectedFiles]);

  /**
   * Download file
   */
  const downloadFile = useCallback(async (file: FileItem) => {
    try {
      const response = await axios.get(`${API_URL}/files/${file.id}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const downloadUrl = response.data.data.downloadUrl;

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download file');
    }
  }, []);

  /**
   * Delete file
   */
  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!confirm('Are you sure you want to delete this file?')) {
        return;
      }

      try {
        await axios.delete(`${API_URL}/files/${fileId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        // Refresh files
        fetchFiles();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete file');
      }
    },
    [fetchFiles]
  );

  /**
   * Bulk delete
   */
  const bulkDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedFiles).map((fileId) =>
          axios.delete(`${API_URL}/files/${fileId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          })
        )
      );

      setSelectedFiles(new Set());
      fetchFiles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete files');
    }
  }, [selectedFiles, fetchFiles]);

  /**
   * Get file icon
   */
  const getFileIcon = (category: string) => {
    return FILE_ICONS[category as keyof typeof FILE_ICONS] || FILE_ICONS.GENERAL;
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>{error}</p>
        <button
          onClick={fetchFiles}
          className="mt-2 text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`file-manager ${className}`}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="uploadedAt">Date</option>
              <option value="filename">Name</option>
              <option value="size">Size</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </button>

            {/* Bulk Actions */}
            {selectedFiles.size > 0 && (
              <button
                onClick={bulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedFiles.size})
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 rounded-full text-sm ${!selectedCategory ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
          {['IMAGE', 'VIDEO', 'DOCUMENT', 'CODE', 'ARCHIVE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm ${selectedCategory === cat ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* File Grid/List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center text-gray-500 p-8">
          <File className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No files found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.category);
            const isSelected = selectedFiles.has(file.id);

            return (
              <div
                key={file.id}
                className={`group relative bg-white border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}
                onClick={() => onFileSelect?.(file)}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(file.id);
                  }}
                  className="absolute top-2 left-2 h-4 w-4"
                />

                {/* Thumbnail or Icon */}
                <div className="aspect-square mb-2 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* File Info */}
                <p className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>

                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(file);
                    }}
                    className="p-1 bg-white rounded shadow hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file);
                    }}
                    className="p-1 bg-white rounded shadow hover:bg-gray-100"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                    className="p-1 bg-white rounded shadow hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.category);
            const isSelected = selectedFiles.has(file.id);

            return (
              <div
                key={file.id}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                onClick={() => onFileSelect?.(file)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(file.id);
                  }}
                  className="h-4 w-4"
                />

                <Icon className="h-8 w-8 text-gray-500 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file);
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                    className="p-2 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalFiles > itemsPerPage && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage * itemsPerPage >= totalFiles}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalFiles)}
                </span>{' '}
                of <span className="font-medium">{totalFiles}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage * itemsPerPage >= totalFiles}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">{previewFile.originalName}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {previewFile.category === 'IMAGE' && previewFile.url && (
                <img
                  src={previewFile.url}
                  alt={previewFile.originalName}
                  className="max-w-full h-auto mx-auto"
                />
              )}
              {previewFile.category === 'VIDEO' && previewFile.url && (
                <video controls className="max-w-full h-auto mx-auto">
                  <source src={previewFile.url} type={previewFile.mimeType} />
                </video>
              )}
              {previewFile.category !== 'IMAGE' && previewFile.category !== 'VIDEO' && (
                <div className="text-center text-gray-500 py-8">
                  <p>Preview not available for this file type</p>
                  <button
                    onClick={() => downloadFile(previewFile)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
