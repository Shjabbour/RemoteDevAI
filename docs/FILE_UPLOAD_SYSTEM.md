# File Upload System Documentation

## Overview

RemoteDevAI includes a comprehensive file upload system built on AWS S3 (or S3-compatible storage like Cloudflare R2 or MinIO) with support for:

- Direct browser-to-S3 uploads via presigned URLs
- Multipart uploads for large files (chunked upload)
- Real-time upload progress tracking
- Automatic file processing (thumbnails, optimization)
- Storage quota management per subscription tier
- File management UI (grid/list view, search, sort, bulk actions)
- Mobile support with camera and gallery integration

## Architecture

```
┌─────────────┐
│   Client    │
│ (Web/Mobile)│
└──────┬──────┘
       │ 1. Request presigned URL
       ▼
┌─────────────┐
│  API Server │
│ (Express)   │
└──────┬──────┘
       │ 2. Generate presigned URL
       │ 3. Create File record
       ▼
┌─────────────┐     4. Return URL     ┌─────────────┐
│  S3 Service │◄────────────────────►│   Client    │
│   (Utils)   │                       │             │
└──────┬──────┘                       └──────┬──────┘
       │                                     │
       │ 5. Validate quota                   │ 6. Upload to S3
       │                                     │    (direct)
       ▼                                     ▼
┌─────────────┐                       ┌─────────────┐
│  Prisma DB  │                       │   AWS S3    │
│ (Postgres)  │                       │  / R2 / S3  │
└──────┬──────┘                       └──────┬──────┘
       │                                     │
       │ 7. Mark processing                  │
       ▼                                     │
┌─────────────┐     8. Process file          │
│ Job Processor│◄────────────────────────────┘
│  (BullMQ)   │
└──────┬──────┘
       │ 9. Generate thumbnail
       │ 10. Optimize image
       │ 11. Extract metadata
       ▼
┌─────────────┐
│   CDN       │
│ (Optional)  │
└─────────────┘
```

## Components

### Backend

#### 1. Prisma Schema (`apps/cloud/prisma/schema.prisma`)

**File Model:**
```prisma
model File {
  id          String    @id @default(uuid())
  userId      String
  projectId   String?
  sessionId   String?

  filename    String
  originalName String
  mimeType    String
  size        BigInt
  category    FileCategory

  s3Key       String    @unique
  s3Bucket    String
  s3Region    String?

  url         String?
  thumbnailUrl String?
  previewUrl  String?

  status      FileStatus
  uploadId    String?
  uploadProgress Float

  metadata    Json

  isPublic    Boolean
  virusScanned Boolean

  downloadCount Int
  lastAccessedAt DateTime?
  expiresAt   DateTime?

  uploadedAt  DateTime
  processedAt DateTime?
  createdAt   DateTime
  updatedAt   DateTime
}

enum FileStatus {
  UPLOADING
  PROCESSING
  READY
  FAILED
  DELETED
  ARCHIVED
}

enum FileCategory {
  GENERAL
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  CODE
  ARCHIVE
  RECORDING
  ATTACHMENT
}

model StorageQuota {
  id          String    @id @default(uuid())
  userId      String    @unique

  quotaLimit  BigInt
  quotaUsed   BigInt

  fileCountLimit Int?
  fileCount   Int

  bandwidthLimit BigInt?
  bandwidthUsed BigInt
  bandwidthResetAt DateTime?

  warningThreshold Float
  quotaWarningsSent Int
  lastWarningAt DateTime?
}
```

#### 2. S3 Utility Service (`apps/cloud/src/utils/s3.ts`)

Core S3 operations:
- `generatePresignedUploadUrl()` - Generate presigned URL for uploads
- `generatePresignedDownloadUrl()` - Generate presigned URL for downloads
- `createMultipartUpload()` - Initialize multipart upload
- `generatePresignedPartUrl()` - Generate URL for part upload
- `completeMultipartUpload()` - Complete multipart upload
- `abortMultipartUpload()` - Abort multipart upload
- `deleteFile()` - Delete file from S3
- `getFileMetadata()` - Get file metadata
- `getPublicUrl()` - Generate CDN URL

File validation:
- `isValidMimeType()` - Check if MIME type is allowed
- `getFileCategory()` - Determine file category from MIME type
- `isFileSizeValid()` - Check file size against tier limits

#### 3. Upload Service (`apps/cloud/src/services/UploadService.ts`)

Business logic for file uploads:
- `generatePresignedUpload()` - Simple upload flow
- `initializeMultipartUpload()` - Multipart upload flow
- `generatePartUploadUrl()` - Part URL generation
- `completeMultipartUpload()` - Complete multipart
- `markUploadComplete()` - Mark simple upload complete
- `getUploadStatus()` - Check upload status
- `deleteFile()` - Delete file
- `listFiles()` - List user's files
- `generateDownloadUrl()` - Generate download URL
- `getStorageQuota()` - Get user's quota

#### 4. Upload Middleware (`apps/cloud/src/middleware/upload.middleware.ts`)

Request validation:
- `validateFileType()` - Validate MIME type
- `validateFileSize()` - Validate file size against tier
- `validateUploadRequest()` - Validate request body
- `validateMultipartRequest()` - Validate multipart request
- `handleMulterError()` - Error handling

Multer configuration:
- `uploadSingle()` - Single file upload
- `uploadMultiple()` - Multiple file upload

#### 5. Upload Routes (`apps/cloud/src/routes/upload.routes.ts`)

REST API endpoints:

**Storage Quota:**
- `GET /api/upload/quota` - Get storage quota

**Simple Upload:**
- `POST /api/upload/presign` - Get presigned URL
- `POST /api/upload/:fileId/complete` - Mark upload complete

**Multipart Upload:**
- `POST /api/upload/multipart/init` - Initialize multipart
- `POST /api/upload/multipart/:fileId/part` - Get part URL
- `POST /api/upload/multipart/:fileId/complete` - Complete multipart
- `POST /api/upload/multipart/:fileId/abort` - Abort multipart

**File Management:**
- `GET /api/upload/status/:fileId` - Get upload status
- `GET /api/files` - List files
- `GET /api/files/:fileId/download` - Get download URL
- `DELETE /api/files/:fileId` - Delete file

**Health:**
- `GET /api/upload/health` - S3 health check

#### 6. File Processing Jobs

**Image Processor** (`apps/cloud/src/jobs/imageProcessor.ts`):
- Optimize images (compress, convert format)
- Generate thumbnails (150x150, 300x300, 600x600)
- Extract metadata (dimensions, EXIF)
- Uses Sharp library

**Video Processor** (`apps/cloud/src/jobs/videoProcessor.ts`):
- Extract video metadata
- Generate video thumbnails
- Requires FFmpeg (optional)

**Thumbnail Generator** (`apps/cloud/src/jobs/thumbnailGenerator.ts`):
- Dispatcher for processing based on file type
- Handles pending thumbnails queue

### Frontend

#### 1. useFileUpload Hook (`apps/web/src/hooks/useFileUpload.ts`)

React hook for file upload state management:

```typescript
const {
  uploads,           // Map of upload states
  uploadFile,        // Upload single file
  uploadFiles,       // Upload multiple files
  cancelUpload,      // Cancel upload
  retryUpload,       // Retry failed upload
  clearUpload,       // Clear upload from state
  clearAllUploads,   // Clear all uploads
} = useFileUpload();
```

**Features:**
- Automatic multipart for files >= 5MB
- Progress tracking
- Cancel support
- Retry logic
- Status polling

#### 2. FileUpload Component (`apps/web/src/components/FileUpload.tsx`)

React component for file uploads:

```tsx
<FileUpload
  projectId="project-id"
  sessionId="session-id"
  category="IMAGE"
  isPublic={false}
  multiple={true}
  maxSize={10 * 1024 * 1024}
  accept="image/*"
  onUploadComplete={(files) => console.log(files)}
  onUploadError={(error) => console.error(error)}
/>
```

**Features:**
- Drag and drop
- File preview
- Progress bar
- Multiple file support
- File type validation

#### 3. FileManager Component (`apps/web/src/components/FileManager.tsx`)

File management interface:

```tsx
<FileManager
  projectId="project-id"
  onFileSelect={(file) => console.log(file)}
/>
```

**Features:**
- Grid/list view toggle
- Sort by name/date/size
- Search files
- Bulk delete
- File preview modal
- Pagination

#### 4. Mobile FileUpload (`apps/mobile/src/components/FileUpload.tsx`)

React Native component:

```tsx
<FileUpload
  projectId="project-id"
  onUploadComplete={(result) => console.log(result)}
  onUploadError={(error) => console.error(error)}
/>
```

**Features:**
- Camera integration
- Gallery picker
- Document picker
- Progress tracking
- Background upload support

## Setup Guide

### 1. Install Dependencies

```bash
# Backend
cd apps/cloud
npm install

# Already includes:
# - @aws-sdk/client-s3
# - @aws-sdk/s3-request-presigner
# - sharp
# - multer

# Frontend
cd apps/web
npm install axios

# Mobile
cd apps/mobile
npm install expo-image-picker expo-document-picker
```

### 2. Configure Environment Variables

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=remotedevai-uploads

# For Cloudflare R2 or MinIO
S3_ENDPOINT=https://your-endpoint.com
S3_FORCE_PATH_STYLE=true

# Optional CDN
CDN_URL=https://cdn.remotedevai.com

# File Processing
ENABLE_IMAGE_OPTIMIZATION=true
ENABLE_VIDEO_PROCESSING=true
ENABLE_THUMBNAIL_GENERATION=true
TEMP_DIR=/tmp
```

### 3. Run Database Migration

```bash
cd apps/cloud
npx prisma migrate dev --name add_file_upload_system
npx prisma generate
```

### 4. Create S3 Bucket

**AWS S3:**
```bash
aws s3api create-bucket \
  --bucket remotedevai-uploads \
  --region us-east-1

# Enable CORS
aws s3api put-bucket-cors \
  --bucket remotedevai-uploads \
  --cors-configuration file://cors.json
```

**cors.json:**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

**Cloudflare R2:**
```bash
# Use Cloudflare dashboard or Wrangler CLI
wrangler r2 bucket create remotedevai-uploads
```

### 5. Configure IAM Permissions

**S3 Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketCors",
        "s3:PutBucketCors"
      ],
      "Resource": [
        "arn:aws:s3:::remotedevai-uploads",
        "arn:aws:s3:::remotedevai-uploads/*"
      ]
    }
  ]
}
```

### 6. Set Up CDN (Optional)

**CloudFront:**
1. Create distribution pointing to S3 bucket
2. Set CDN_URL in environment
3. Update CORS settings

**Cloudflare:**
1. Configure custom domain for R2 bucket
2. Enable caching rules
3. Set CDN_URL

## Usage Examples

### Backend API

**Request presigned upload URL:**
```bash
curl -X POST http://localhost:3001/api/upload/presign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "image.jpg",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "projectId": "project-123",
    "isPublic": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "file-uuid",
    "uploadUrl": "https://s3.amazonaws.com/...",
    "s3Key": "users/user-123/projects/project-123/1234567890-uuid-image.jpg",
    "expiresIn": 3600
  }
}
```

**Upload file to S3:**
```bash
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @image.jpg
```

**Mark upload complete:**
```bash
curl -X POST http://localhost:3001/api/upload/FILE_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check upload status:**
```bash
curl -X GET http://localhost:3001/api/upload/status/FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend (React)

```tsx
import { FileUpload } from '@/components/FileUpload';

function MyPage() {
  return (
    <FileUpload
      projectId="project-123"
      category="IMAGE"
      multiple={true}
      maxSize={10 * 1024 * 1024}
      accept="image/*"
      onUploadComplete={(files) => {
        console.log('Uploaded:', files);
      }}
      onUploadError={(error) => {
        console.error('Error:', error);
      }}
    />
  );
}
```

### Mobile (React Native)

```tsx
import { FileUpload } from '@/components/FileUpload';

function MyScreen() {
  return (
    <FileUpload
      projectId="project-123"
      onUploadComplete={(result) => {
        console.log('Uploaded:', result);
      }}
    />
  );
}
```

## Storage Quotas

| Tier       | Per File | Total Storage | Bandwidth |
|------------|----------|---------------|-----------|
| FREE       | 10 MB    | 500 MB        | 5 GB/mo   |
| PRO        | 100 MB   | 50 GB         | 100 GB/mo |
| ENTERPRISE | 500 MB   | 500 GB        | 1 TB/mo   |

Quotas are enforced at upload time. Users receive warnings at 80% usage.

## Allowed File Types

**Images:** JPG, PNG, GIF, WebP, SVG
**Videos:** MP4, WebM, MOV, AVI
**Audio:** MP3, WAV, OGG, WebM
**Documents:** PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
**Code:** JS, TS, HTML, CSS, JSON, XML
**Archives:** ZIP, TAR, GZ, 7Z

## Performance Considerations

### Multipart Upload

Files >= 5MB automatically use multipart upload:
- Chunk size: 5MB
- Concurrent parts: Browser dependent
- Supports resume on failure
- Better for slow/unstable connections

### Image Optimization

Images are automatically optimized:
- JPEG: Quality 85%, progressive
- PNG: Compression level 9, progressive
- WebP: Quality 85%
- Thumbnails: 300x300, quality 80%

### Video Processing

Video processing is optional (requires FFmpeg):
- Extract metadata (duration, resolution, codec)
- Generate thumbnail from frame at 1 second
- Transcoding not implemented (use external service)

## Security

1. **Presigned URLs** - Time-limited, scoped access
2. **CORS validation** - Restrict origins
3. **File type validation** - MIME type checking
4. **Size limits** - Per-tier enforcement
5. **Virus scanning** - Optional (ClamAV or cloud service)
6. **Private files** - Require authentication for download
7. **Storage isolation** - Files organized by user/project
8. **Quota enforcement** - Prevent abuse

## Monitoring

Track these metrics:
- Upload success rate
- Average upload time
- Storage usage per user
- Bandwidth consumption
- Processing queue length
- Failed uploads (with reasons)

## Troubleshooting

### Upload fails with "quota exceeded"
- Check user's storage quota
- Clean up old files
- Upgrade subscription tier

### Upload fails with "file too large"
- Check tier limits
- Use multipart upload for large files
- Compress file before upload

### CORS errors
- Verify S3 bucket CORS configuration
- Check `ALLOWED_ORIGINS` environment variable
- Ensure presigned URL hasn't expired

### Processing stuck
- Check job queue health
- Verify FFmpeg installation (for videos)
- Check Sharp installation (for images)
- Review error logs

### Slow uploads
- Check network connection
- Use multipart for large files
- Consider CDN for downloads
- Optimize file size before upload

## Best Practices

1. **Use presigned URLs** - Avoid proxying uploads through API server
2. **Implement chunking** - For files > 5MB
3. **Show progress** - Provide visual feedback
4. **Handle errors** - Implement retry logic
5. **Validate client-side** - Check size/type before upload
6. **Clean up failed uploads** - Delete incomplete multipart uploads
7. **Use CDN** - For frequently accessed files
8. **Optimize images** - Before and after upload
9. **Set expiry** - For temporary files
10. **Monitor quotas** - Alert users before limit

## Future Enhancements

- [ ] Video transcoding (AWS MediaConvert integration)
- [ ] PDF preview generation
- [ ] Code syntax highlighting for previews
- [ ] Duplicate file detection
- [ ] File versioning
- [ ] Shared file links with expiry
- [ ] Collaborative file editing
- [ ] Advanced virus scanning
- [ ] File compression before upload
- [ ] Background sync for mobile
- [ ] Offline mode support
- [ ] File encryption at rest
- [ ] Watermarking for images

## API Reference

See [API.md](./API.md) for complete API documentation.

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/RemoteDevAI/issues
- Email: support@remotedevai.com
- Documentation: https://docs.remotedevai.com
