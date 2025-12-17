/**
 * useFileUpload Hook
 *
 * Custom React hook for managing file uploads with:
 * - Progress tracking
 * - Multipart upload for large files
 * - Error handling
 * - Retry logic
 * - Cancel support
 */

import { useState, useCallback, useRef } from 'react';
import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for multipart upload
const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // Use multipart for files >= 5MB

interface UploadState {
  fileId?: string;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
}

interface UploadOptions {
  projectId?: string;
  sessionId?: string;
  category?: string;
  isPublic?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());
  const cancelTokens = useRef<Map<string, CancelTokenSource>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Update upload state
   */
  const updateUpload = useCallback((fileKey: string, updates: Partial<UploadState>) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(fileKey) || {
        progress: 0,
        status: 'idle',
      };
      newMap.set(fileKey, { ...current, ...updates });
      return newMap;
    });
  }, []);

  /**
   * Simple upload for small files (< 5MB)
   */
  const simpleUpload = async (
    file: File,
    fileKey: string,
    options: UploadOptions = {}
  ): Promise<void> => {
    try {
      // Request presigned URL
      const presignResponse = await axios.post(
        `${API_URL}/upload/presign`,
        {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          projectId: options.projectId,
          sessionId: options.sessionId,
          category: options.category,
          isPublic: options.isPublic,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const { fileId, uploadUrl } = presignResponse.data.data;

      updateUpload(fileKey, { fileId, status: 'uploading', progress: 0 });

      // Create cancel token
      const cancelToken = axios.CancelToken.source();
      cancelTokens.current.set(fileKey, cancelToken);

      // Upload file to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        cancelToken: cancelToken.token,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          updateUpload(fileKey, { progress });
          options.onProgress?.(progress);
        },
      });

      // Mark upload as complete
      await axios.post(
        `${API_URL}/upload/${fileId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Wait for processing
      updateUpload(fileKey, { status: 'processing', progress: 100 });

      // Poll for status
      const result = await pollUploadStatus(fileId);

      updateUpload(fileKey, {
        status: 'completed',
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
      });

      options.onComplete?.(result);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        updateUpload(fileKey, { status: 'cancelled' });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        updateUpload(fileKey, { status: 'error', error: errorMessage });
        options.onError?.(errorMessage);
      }
    } finally {
      cancelTokens.current.delete(fileKey);
    }
  };

  /**
   * Multipart upload for large files (>= 5MB)
   */
  const multipartUpload = async (
    file: File,
    fileKey: string,
    options: UploadOptions = {}
  ): Promise<void> => {
    try {
      // Initialize multipart upload
      const initResponse = await axios.post(
        `${API_URL}/upload/multipart/init`,
        {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          projectId: options.projectId,
          sessionId: options.sessionId,
          category: options.category,
          isPublic: options.isPublic,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const { fileId, uploadId, partSize, partCount } = initResponse.data.data;

      updateUpload(fileKey, { fileId, status: 'uploading', progress: 0 });

      // Create abort controller
      const abortController = new AbortController();
      abortControllers.current.set(fileKey, abortController);

      // Upload parts
      const parts: Array<{ ETag: string; PartNumber: number }> = [];
      const uploadedParts = new Set<number>();

      for (let partNumber = 1; partNumber <= partCount; partNumber++) {
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const chunk = file.slice(start, end);

        // Get presigned URL for part
        const partResponse = await axios.post(
          `${API_URL}/upload/multipart/${fileId}/part`,
          { partNumber },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const { uploadUrl } = partResponse.data.data;

        // Upload part
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: chunk,
          signal: abortController.signal,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload part ${partNumber}`);
        }

        const etag = uploadResponse.headers.get('ETag');
        if (!etag) {
          throw new Error(`No ETag returned for part ${partNumber}`);
        }

        parts.push({
          ETag: etag.replace(/"/g, ''),
          PartNumber: partNumber,
        });

        uploadedParts.add(partNumber);

        // Update progress
        const progress = Math.round((uploadedParts.size / partCount) * 100);
        updateUpload(fileKey, { progress });
        options.onProgress?.(progress);
      }

      // Complete multipart upload
      await axios.post(
        `${API_URL}/upload/multipart/${fileId}/complete`,
        { parts },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Wait for processing
      updateUpload(fileKey, { status: 'processing', progress: 100 });

      // Poll for status
      const result = await pollUploadStatus(fileId);

      updateUpload(fileKey, {
        status: 'completed',
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
      });

      options.onComplete?.(result);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        updateUpload(fileKey, { status: 'cancelled' });

        // Abort multipart upload
        const state = uploads.get(fileKey);
        if (state?.fileId) {
          await axios.post(
            `${API_URL}/upload/multipart/${state.fileId}/abort`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          ).catch(() => {});
        }
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        updateUpload(fileKey, { status: 'error', error: errorMessage });
        options.onError?.(errorMessage);
      }
    } finally {
      abortControllers.current.delete(fileKey);
    }
  };

  /**
   * Poll upload status until complete
   */
  const pollUploadStatus = async (fileId: string, maxAttempts = 60): Promise<any> => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${API_URL}/upload/status/${fileId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const { status, url, thumbnailUrl } = response.data.data;

        if (status === 'READY') {
          return { status, url, thumbnailUrl };
        }

        if (status === 'FAILED') {
          throw new Error('File processing failed');
        }

        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Poll status error:', error);
        throw error;
      }
    }

    throw new Error('Upload processing timed out');
  };

  /**
   * Upload file
   */
  const uploadFile = useCallback(
    async (file: File, options: UploadOptions = {}): Promise<string> => {
      const fileKey = `${file.name}-${Date.now()}`;

      // Choose upload method based on file size
      if (file.size >= MULTIPART_THRESHOLD) {
        await multipartUpload(file, fileKey, options);
      } else {
        await simpleUpload(file, fileKey, options);
      }

      return fileKey;
    },
    []
  );

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (files: File[], options: UploadOptions = {}): Promise<string[]> => {
      const keys: string[] = [];

      for (const file of files) {
        const key = await uploadFile(file, options);
        keys.push(key);
      }

      return keys;
    },
    [uploadFile]
  );

  /**
   * Cancel upload
   */
  const cancelUpload = useCallback((fileKey: string) => {
    const cancelToken = cancelTokens.current.get(fileKey);
    if (cancelToken) {
      cancelToken.cancel('Upload cancelled by user');
    }

    const abortController = abortControllers.current.get(fileKey);
    if (abortController) {
      abortController.abort();
    }

    updateUpload(fileKey, { status: 'cancelled' });
  }, []);

  /**
   * Retry upload
   */
  const retryUpload = useCallback(
    async (fileKey: string, file: File, options: UploadOptions = {}): Promise<void> => {
      updateUpload(fileKey, { status: 'idle', progress: 0, error: undefined });
      await uploadFile(file, options);
    },
    [uploadFile]
  );

  /**
   * Clear upload
   */
  const clearUpload = useCallback((fileKey: string) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileKey);
      return newMap;
    });
  }, []);

  /**
   * Clear all uploads
   */
  const clearAllUploads = useCallback(() => {
    setUploads(new Map());
  }, []);

  return {
    uploads,
    uploadFile,
    uploadFiles,
    cancelUpload,
    retryUpload,
    clearUpload,
    clearAllUploads,
  };
}
