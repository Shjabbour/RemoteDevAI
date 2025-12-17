# Backup & Export System Guide

## Overview

The RemoteDevAI platform includes a comprehensive backup and data export system that allows users to:

- Create encrypted backups of their account data
- Export data in multiple formats (JSON, CSV, ZIP)
- Comply with GDPR data portability requirements
- Restore data from backups
- Schedule automatic daily backups (Pro/Enterprise users)

## Features

### 1. Backup Service

Located in `src/services/BackupService.ts`

#### Backup Types

- **Full Account Backup**: All projects, sessions, recordings, and settings
- **Project-Specific Backup**: Single project with all its sessions and recordings
- **Incremental Backup**: Only data changed since a specific date

#### Key Features

- **AES-256-GCM Encryption**: All backups can be encrypted with a user-provided key
- **30-Day Retention**: Backups automatically expire after 30 days
- **Automatic Cleanup**: Expired backups are automatically deleted
- **Compression**: Large backups are compressed to save storage

#### API Endpoints

```typescript
// Create full backup
POST /api/export/backup/full
{
  "encrypt": true,
  "includeRecordings": false
}

// Create project backup
POST /api/export/backup/project/:id
{
  "encrypt": true,
  "includeRecordings": false
}

// List backups
GET /api/export/backup/list?page=1&limit=50

// Download backup
GET /api/export/backup/:id/download?key=ENCRYPTION_KEY

// Delete backup
DELETE /api/export/backup/:id

// Get backup statistics
GET /api/export/backup/stats
```

### 2. Export Service

Located in `src/services/ExportService.ts`

#### Export Formats

1. **JSON**: Structured, machine-readable format
2. **CSV**: Spreadsheet-compatible format
3. **ZIP**: Complete archive with all files

#### Export Types

- **Full Account**: All user data
- **Project**: Specific project data
- **Sessions**: All session data
- **Recordings**: All recording metadata
- **GDPR**: Complete data package for GDPR compliance

#### API Endpoints

```typescript
// Create full export
POST /api/export/full
{
  "format": "JSON",
  "includeRecordings": false,
  "includeFiles": false
}

// Export specific project
POST /api/export/project/:id
{
  "format": "ZIP",
  "includeRecordings": true,
  "includeFiles": true
}

// Export recordings
POST /api/export/recordings
{
  "format": "CSV",
  "dateRange": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z"
  }
}

// Export sessions
POST /api/export/sessions
{
  "format": "JSON",
  "dateRange": {
    "from": "2024-01-01T00:00:00Z"
  },
  "includeRecordings": true
}

// GDPR export (always JSON)
POST /api/export/gdpr

// Get export job status
GET /api/export/status/:jobId

// Download export
GET /api/export/download/:jobId

// List export jobs
GET /api/export/list?page=1&limit=50

// Delete export job
DELETE /api/export/:jobId
```

### 3. Import Service

Located in `src/services/ImportService.ts`

#### Features

- **Validation**: Validates backup/export data before import
- **Conflict Resolution**: Three strategies for handling existing data
  - `SKIP`: Keep existing data, only import new items
  - `OVERWRITE`: Replace existing data with imported data
  - `MERGE`: Combine existing and imported data
- **Progress Tracking**: Real-time progress updates
- **Error Handling**: Detailed error reporting

#### API Endpoints

```typescript
// Validate import data
POST /api/import/validate
{
  "data": { /* backup/export data */ }
}

// Start import
POST /api/import/start
{
  "data": { /* backup/export data */ },
  "conflictResolution": "SKIP" // SKIP | OVERWRITE | MERGE
}

// Get import job status
GET /api/import/status/:jobId

// List import jobs
GET /api/import/list?page=1&limit=50

// Delete import job
DELETE /api/import/:jobId
```

### 4. Scheduled Backups

Located in `src/jobs/scheduledBackup.ts`

#### Automatic Backups

- **Frequency**: Daily at 2 AM UTC
- **Eligibility**: Pro and Enterprise tier users only
- **Features**:
  - Encrypted backups
  - 30-day retention
  - Automatic cleanup of old backups
  - Email notification (optional)

#### Configuration

Scheduled backups run automatically in production. To manually trigger:

```typescript
import { scheduledBackupJob } from './jobs/scheduledBackup';

// Start scheduled backups
scheduledBackupJob.start();

// Run backup immediately
scheduledBackupJob.runNow();

// Stop scheduled backups
scheduledBackupJob.stop();
```

### 5. Export Job Worker

Located in `src/jobs/exportJob.ts`

Processes export jobs asynchronously in the background.

## Frontend Integration

### Export Page

Located at `apps/web/src/app/dashboard/settings/export/page.tsx`

Features:
- Format selection (JSON, CSV, ZIP)
- Export type selection
- Options configuration
- Real-time progress tracking
- Download management
- Export history

### Import Page

Located at `apps/web/src/app/dashboard/settings/import/page.tsx`

Features:
- File upload
- Validation preview
- Conflict resolution selection
- Progress tracking
- Error reporting

## Database Schema

### Backup Model

```prisma
model Backup {
  id                String       @id @default(uuid())
  userId            String
  type              BackupType   // FULL, PROJECT, INCREMENTAL
  status            BackupStatus // CREATING, COMPLETED, FAILED
  encrypted         Boolean
  includeRecordings Boolean
  projectId         String?
  data              String?      @db.Text
  size              Int
  itemCount         Int
  encryptionKey     String?
  since             DateTime?
  error             String?
  expiresAt         DateTime
  createdAt         DateTime
  completedAt       DateTime?
}
```

### ExportJob Model

```prisma
model ExportJob {
  id           String       @id @default(uuid())
  userId       String
  format       ExportFormat // JSON, CSV, ZIP
  type         ExportType   // FULL, PROJECT, RECORDINGS, SESSIONS, GDPR
  status       ExportStatus // PENDING, PROCESSING, COMPLETED, FAILED
  progress     Int
  options      Json
  data         String?      @db.Text
  fileName     String?
  contentType  String?
  size         Int?
  downloadedAt DateTime?
  error        String?
  expiresAt    DateTime
  createdAt    DateTime
  completedAt  DateTime?
}
```

### ImportJob Model

```prisma
model ImportJob {
  id            String       @id @default(uuid())
  userId        String
  status        ImportStatus // PENDING, VALIDATING, IMPORTING, COMPLETED, FAILED
  progress      Int
  data          String?      @db.Text
  totalItems    Int
  importedItems Int
  skippedItems  Int
  errors        String[]
  createdAt     DateTime
  completedAt   DateTime?
}
```

## Security Considerations

### Encryption

- Backups use AES-256-GCM encryption
- Encryption keys are generated randomly
- Keys are provided to users and NOT stored on server
- Users must save encryption keys to decrypt backups

### API Keys

- API keys are NEVER included in exports/backups
- They are marked as `[REDACTED]` in export data

### Access Control

- Users can only export/backup their own data
- All endpoints require authentication
- Rate limiting applied to prevent abuse

## GDPR Compliance

### Data Portability (Article 20)

The GDPR export provides all user data in a machine-readable format (JSON):

```typescript
POST /api/export/gdpr
```

Returns:
- User profile information
- All projects and sessions
- Recording metadata
- API keys (redacted)
- Desktop agent information
- Settings and preferences

### Data Retention

- Exports expire after 24 hours
- Backups expire after 30 days
- Automatic cleanup of expired data

## Usage Examples

### Create Encrypted Full Backup

```bash
curl -X POST https://api.remotedevai.com/api/export/backup/full \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encrypt": true,
    "includeRecordings": false
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "backup-id",
    "userId": "user-id",
    "type": "FULL",
    "size": 1024000,
    "itemCount": 150,
    "encrypted": true,
    "status": "COMPLETED",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-14T10:30:00Z"
  },
  "message": "Full backup created successfully"
}
```

**Important**: Save the encryption key returned in the initial response!

### Download Encrypted Backup

```bash
curl -X GET "https://api.remotedevai.com/api/export/backup/backup-id/download?key=ENCRYPTION_KEY" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o backup.json
```

### Create JSON Export

```bash
curl -X POST https://api.remotedevai.com/api/export/full \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "JSON",
    "includeRecordings": true,
    "includeFiles": false
  }'
```

### Check Export Status

```bash
curl -X GET https://api.remotedevai.com/api/export/status/job-id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "job-id",
    "userId": "user-id",
    "status": "PROCESSING",
    "progress": 45,
    "format": "JSON",
    "type": "FULL",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Import Data

```bash
# 1. Validate import data
curl -X POST https://api.remotedevai.com/api/import/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json

# 2. Start import
curl -X POST https://api.remotedevai.com/api/import/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": { /* backup data */ },
    "conflictResolution": "SKIP"
  }'
```

## Troubleshooting

### Export Job Stuck in PROCESSING

Exports are processed asynchronously. Large exports may take several minutes. Check the progress field:

```bash
GET /api/export/status/:jobId
```

If stuck for more than 10 minutes, contact support.

### Import Validation Errors

Common validation errors:

1. **Invalid version**: Export/backup format version mismatch
2. **Missing required fields**: Corrupted backup file
3. **Project conflicts**: Projects with same name already exist

Solution: Check the `errors` array in validation response for details.

### Backup Decryption Failed

- Ensure you're using the correct encryption key
- Key must be provided as query parameter: `?key=ENCRYPTION_KEY`
- Keys are case-sensitive

### Export Download Failed

Exports expire after 24 hours. Create a new export if expired.

## Performance Considerations

### Large Exports

For accounts with large amounts of data:

1. Use `includeFiles: false` to exclude large video files
2. Export specific projects instead of full account
3. Use date ranges to limit data

### Scheduled Backups

Automatic backups run at 2 AM UTC to minimize impact:

- Pro users: Backups without recordings
- Enterprise users: Full backups with recordings

## Monitoring

### Export Job Metrics

Track export job performance:

```typescript
// Get all jobs for monitoring
GET /api/export/list?limit=100

// Check for failed jobs
const failedJobs = jobs.filter(j => j.status === 'FAILED');
```

### Backup Statistics

```typescript
GET /api/export/backup/stats

Response:
{
  "totalBackups": 45,
  "totalSize": 15728640,
  "latestBackup": {
    "id": "latest-backup-id",
    "type": "FULL",
    "createdAt": "2024-01-15T02:00:00Z"
  }
}
```

## Future Enhancements

- [ ] Support for incremental exports
- [ ] Selective data export (choose specific projects/sessions)
- [ ] Import preview before committing
- [ ] Backup to external cloud storage (S3, Google Drive)
- [ ] Webhooks for export/import completion
- [ ] Multiple backup schedules
- [ ] Backup versioning and restore points

## Support

For issues or questions:

1. Check the API documentation
2. Review error messages in job status
3. Contact support with job ID and error details

---

**Last Updated**: 2024-12-16
**Version**: 1.0.0
