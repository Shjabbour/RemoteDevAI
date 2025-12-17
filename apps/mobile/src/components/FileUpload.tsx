/**
 * FileUpload Component (React Native / Expo)
 *
 * Mobile file upload component with:
 * - Camera integration
 * - Gallery/document picker
 * - Upload progress
 * - Background upload support
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, Image as ImageIcon, File, X, Upload } from 'lucide-react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FileUploadProps {
  projectId?: string;
  sessionId?: string;
  category?: string;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
}

interface UploadState {
  fileId?: string;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  uri?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export function FileUpload({
  projectId,
  sessionId,
  category,
  onUploadComplete,
  onUploadError,
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
  });

  /**
   * Request permissions
   */
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and gallery permissions are required to upload files.'
      );
      return false;
    }

    return true;
  };

  /**
   * Upload file to S3
   */
  const uploadToS3 = async (uri: string, fileName: string, mimeType: string, fileSize: number) => {
    try {
      setUploadState({
        ...uploadState,
        status: 'uploading',
        progress: 0,
        uri,
        fileName,
        fileType: mimeType,
        fileSize,
      });

      // Get presigned URL
      const presignResponse = await axios.post(
        `${API_URL}/upload/presign`,
        {
          filename: fileName,
          mimeType,
          size: fileSize,
          projectId,
          sessionId,
          category,
        },
        {
          headers: {
            Authorization: `Bearer ${await getAuthToken()}`,
          },
        }
      );

      const { fileId, uploadUrl } = presignResponse.data.data;

      setUploadState((prev) => ({ ...prev, fileId }));

      // Read file as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to S3
      await axios.put(uploadUrl, blob, {
        headers: {
          'Content-Type': mimeType,
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadState((prev) => ({ ...prev, progress }));
        },
      });

      // Mark upload as complete
      await axios.post(
        `${API_URL}/upload/${fileId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${await getAuthToken()}`,
          },
        }
      );

      // Wait for processing
      setUploadState((prev) => ({ ...prev, status: 'processing', progress: 100 }));

      // Poll for completion
      const result = await pollUploadStatus(fileId);

      setUploadState((prev) => ({
        ...prev,
        status: 'completed',
      }));

      onUploadComplete?.(result);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      setUploadState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
      onUploadError?.(errorMessage);
    }
  };

  /**
   * Poll upload status
   */
  const pollUploadStatus = async (fileId: string, maxAttempts = 30): Promise<any> => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${API_URL}/upload/status/${fileId}`, {
          headers: {
            Authorization: `Bearer ${await getAuthToken()}`,
          },
        });

        const { status, url, thumbnailUrl } = response.data.data;

        if (status === 'READY') {
          return { status, url, thumbnailUrl };
        }

        if (status === 'FAILED') {
          throw new Error('File processing failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        throw error;
      }
    }

    throw new Error('Upload processing timed out');
  };

  /**
   * Get auth token (from AsyncStorage or your auth provider)
   */
  const getAuthToken = async (): Promise<string> => {
    // TODO: Implement your auth token retrieval logic
    // Example: return await AsyncStorage.getItem('token');
    return '';
  };

  /**
   * Take photo with camera
   */
  const takePhoto = useCallback(async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
      const fileSize = asset.fileSize || 0;

      await uploadToS3(asset.uri, fileName, mimeType, fileSize);
    }
  }, [projectId, sessionId, category]);

  /**
   * Pick image from gallery
   */
  const pickImage = useCallback(async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
      const fileSize = asset.fileSize || 0;

      await uploadToS3(asset.uri, fileName, mimeType, fileSize);
    }
  }, [projectId, sessionId, category]);

  /**
   * Pick document
   */
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const fileName = result.name;
        const mimeType = result.mimeType || 'application/octet-stream';
        const fileSize = result.size || 0;

        await uploadToS3(result.uri, fileName, mimeType, fileSize);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  }, [projectId, sessionId, category]);

  /**
   * Cancel upload
   */
  const cancelUpload = useCallback(() => {
    setUploadState({
      progress: 0,
      status: 'idle',
    });
  }, []);

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

  return (
    <View style={styles.container}>
      {uploadState.status === 'idle' && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Camera size={24} color="#fff" />
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <ImageIcon size={24} color="#fff" />
            <Text style={styles.buttonText}>Choose Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={pickDocument}>
            <File size={24} color="#fff" />
            <Text style={styles.buttonText}>Choose File</Text>
          </TouchableOpacity>
        </View>
      )}

      {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
        <View style={styles.uploadingContainer}>
          {uploadState.uri && uploadState.fileType?.startsWith('image/') && (
            <Image source={{ uri: uploadState.uri }} style={styles.preview} />
          )}

          <View style={styles.uploadInfo}>
            <Text style={styles.fileName}>{uploadState.fileName}</Text>
            {uploadState.fileSize && (
              <Text style={styles.fileSize}>{formatFileSize(uploadState.fileSize)}</Text>
            )}

            {uploadState.status === 'uploading' && (
              <>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${uploadState.progress}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{uploadState.progress}%</Text>
              </>
            )}

            {uploadState.status === 'processing' && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={cancelUpload}>
              <X size={20} color="#EF4444" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {uploadState.status === 'completed' && (
        <View style={styles.completedContainer}>
          <Upload size={48} color="#10B981" />
          <Text style={styles.completedText}>Upload Complete!</Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setUploadState({ progress: 0, status: 'idle' })}
          >
            <Text style={styles.doneButtonText}>Upload Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {uploadState.status === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {uploadState.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setUploadState({ progress: 0, status: 'idle' })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingContainer: {
    gap: 12,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  uploadInfo: {
    gap: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 14,
  },
  completedContainer: {
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  doneButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
