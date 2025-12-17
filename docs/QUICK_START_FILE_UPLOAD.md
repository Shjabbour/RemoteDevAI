# Quick Start: File Upload System

Get the file upload system running in 10 minutes!

## Prerequisites

- Node.js 18+
- PostgreSQL database
- AWS S3 bucket (or Cloudflare R2, MinIO)
- Redis (optional, for job queues)

## Step 1: Install Dependencies

```bash
# Backend
cd apps/cloud
npm install

# Frontend
cd apps/web
npm install

# Mobile (optional)
cd apps/mobile
npm install expo-image-picker expo-document-picker
```

## Step 2: Set Up S3 Bucket

### AWS S3

```bash
# Create bucket
aws s3api create-bucket \
  --bucket remotedevai-uploads \
  --region us-east-1

# Configure CORS
cat > cors.json << EOF
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}
EOF

aws s3api put-bucket-cors \
  --bucket remotedevai-uploads \
  --cors-configuration file://cors.json
```

### Cloudflare R2

```bash
# Using Wrangler CLI
wrangler r2 bucket create remotedevai-uploads

# Configure CORS in dashboard
# Dashboard > R2 > Bucket > Settings > CORS Policy
```

## Step 3: Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env and add:
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=remotedevai-uploads

# For R2:
# S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
# S3_FORCE_PATH_STYLE=true
```

## Step 4: Run Database Migration

```bash
cd apps/cloud
npx prisma migrate dev --name add_file_upload_system
npx prisma generate
```

## Step 5: Start Services

```bash
# Terminal 1: Backend API
cd apps/cloud
npm run dev

# Terminal 2: Frontend
cd apps/web
npm run dev

# Terminal 3: Job Processor (optional)
cd apps/cloud
npm run worker  # If you have a worker script
```

## Step 6: Test Upload

### Using API

```bash
# 1. Get presigned URL
curl -X POST http://localhost:3001/api/upload/presign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "mimeType": "image/jpeg",
    "size": 102400
  }'

# 2. Upload to S3 (use URL from response)
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg

# 3. Mark complete
curl -X POST http://localhost:3001/api/upload/FILE_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check status
curl -X GET http://localhost:3001/api/upload/status/FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Web UI

1. Navigate to http://localhost:3000
2. Go to project or session page
3. Click "Upload Files" button
4. Drag and drop or select files
5. Watch progress bar
6. View uploaded files in FileManager

### Using Mobile App

1. Open Expo app
2. Navigate to upload screen
3. Choose "Take Photo" or "Choose Image"
4. Select file
5. Upload automatically starts
6. View progress

## Step 7: Verify

Check that:
- Files appear in S3 bucket
- Database has File records
- Thumbnails are generated (for images)
- Storage quota is updated

```bash
# Check database
cd apps/cloud
npx prisma studio

# Navigate to:
# - File model (see uploaded files)
# - StorageQuota model (see updated quota)

# Check S3
aws s3 ls s3://remotedevai-uploads/users/ --recursive
```

## Common Issues

### "Quota exceeded" error

```bash
# Check user's quota
curl -X GET http://localhost:3001/api/upload/quota \
  -H "Authorization: Bearer YOUR_TOKEN"

# Solution: Delete old files or upgrade tier
```

### CORS errors in browser

```bash
# Verify CORS configuration
aws s3api get-bucket-cors --bucket remotedevai-uploads

# Solution: Update CORS policy to allow your origin
```

### Upload stuck at "Processing"

```bash
# Check if Sharp is installed
cd apps/cloud
npm ls sharp

# Reinstall if needed
npm install sharp

# For videos, check FFmpeg
ffmpeg -version
```

### "File too large" error

```bash
# Check tier limits in code:
# apps/cloud/src/utils/s3.ts

# Solution: Use multipart upload for files >= 5MB
```

## Next Steps

1. **Customize storage quotas** - Edit `FILE_CONFIG.sizeLimits` in `apps/cloud/src/utils/s3.ts`
2. **Add file types** - Update `FILE_CONFIG.allowedMimeTypes`
3. **Configure CDN** - Set up CloudFront/Cloudflare and update `CDN_URL`
4. **Enable virus scanning** - Integrate ClamAV or cloud service
5. **Set up job queue** - Configure BullMQ for background processing
6. **Monitor uploads** - Add analytics and error tracking

## Architecture Overview

```
Client (Web/Mobile)
    ↓
Request presigned URL from API
    ↓
Upload directly to S3
    ↓
Notify API upload complete
    ↓
API triggers processing job
    ↓
Job generates thumbnails, optimizes
    ↓
Update File record with URLs
    ↓
Client polls status until READY
```

## File Upload Flow

**Simple Upload (< 5MB):**
1. POST /api/upload/presign → Get URL
2. PUT to S3 URL → Upload file
3. POST /api/upload/:id/complete → Mark complete
4. GET /api/upload/status/:id → Poll status

**Multipart Upload (>= 5MB):**
1. POST /api/upload/multipart/init → Get upload ID
2. POST /api/upload/multipart/:id/part → Get part URLs
3. PUT to each part URL → Upload chunks
4. POST /api/upload/multipart/:id/complete → Finalize
5. GET /api/upload/status/:id → Poll status

## Performance Tips

1. **Use multipart** for files > 5MB
2. **Enable CDN** for frequently accessed files
3. **Compress images** before upload (client-side)
4. **Set expiry** for temporary files
5. **Clean up** failed uploads periodically

## Security Checklist

- [ ] S3 bucket is private (not public)
- [ ] CORS allows only your domains
- [ ] Presigned URLs expire (default 1 hour)
- [ ] File size limits enforced
- [ ] MIME type validation enabled
- [ ] Storage quotas enforced
- [ ] Authentication required for uploads
- [ ] Private files require auth for download

## Resources

- Full Documentation: [FILE_UPLOAD_SYSTEM.md](./FILE_UPLOAD_SYSTEM.md)
- API Reference: [API.md](./API.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Troubleshooting: See full docs above

## Support

Issues? Questions?
- GitHub: https://github.com/your-org/RemoteDevAI/issues
- Discord: https://discord.gg/remotedevai
- Email: support@remotedevai.com

---

**Ready to upload!** If you encounter any issues, check the full documentation or open an issue.
