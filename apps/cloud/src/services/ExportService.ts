import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'stream';
import path from 'path';
import { StorageService } from './StorageService';

const prisma = new PrismaClient();

export interface ExportOptions {
  userId: string;
  format: 'JSON' | 'CSV' | 'ZIP';
  type: 'FULL' | 'PROJECT' | 'RECORDINGS' | 'SESSIONS' | 'GDPR';
  projectId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  includeRecordings?: boolean;
  includeFiles?: boolean;
}

export interface ExportJob {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  format: string;
  type: string;
  url?: string;
  size?: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ExportService {
  private static EXPORT_EXPIRY_HOURS = 24;

  /**
   * Create a new export job
   */
  static async createExportJob(options: ExportOptions): Promise<ExportJob> {
    const jobId = uuidv4();

    const job = await prisma.exportJob.create({
      data: {
        id: jobId,
        userId: options.userId,
        format: options.format,
        type: options.type,
        status: 'PENDING',
        progress: 0,
        options: options as any,
        expiresAt: new Date(Date.now() + this.EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    return this.jobToResponse(job);
  }

  /**
   * Export data to JSON format
   */
  static async exportToJSON(options: ExportOptions): Promise<any> {
    const data = await this.collectExportData(options);

    // Format as JSON
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      format: 'JSON',
      type: options.type,
      ...data,
    };

    return exportData;
  }

  /**
   * Export data to CSV format
   */
  static async exportToCSV(options: ExportOptions): Promise<string> {
    const data = await this.collectExportData(options);

    let csvData = '';

    // Export projects as CSV
    if (data.projects && data.projects.length > 0) {
      csvData += '# Projects\n';
      csvData += stringify(data.projects, {
        header: true,
        columns: ['id', 'name', 'description', 'isActive', 'createdAt', 'updatedAt'],
      });
      csvData += '\n';
    }

    // Export sessions as CSV
    if (data.sessions && data.sessions.length > 0) {
      csvData += '# Sessions\n';
      csvData += stringify(data.sessions, {
        header: true,
        columns: ['id', 'projectId', 'title', 'status', 'startedAt', 'endedAt', 'createdAt'],
      });
      csvData += '\n';
    }

    // Export recordings as CSV
    if (data.recordings && data.recordings.length > 0) {
      csvData += '# Recordings\n';
      csvData += stringify(data.recordings, {
        header: true,
        columns: ['id', 'sessionId', 'title', 'url', 'duration', 'status', 'recordedAt'],
      });
      csvData += '\n';
    }

    return csvData;
  }

  /**
   * Export data to ZIP format (includes files)
   */
  static async exportToZIP(options: ExportOptions): Promise<{ stream: Readable; size: number }> {
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    const data = await this.collectExportData(options);

    // Add metadata.json
    archive.append(JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      type: options.type,
      format: 'ZIP',
    }, null, 2), { name: 'metadata.json' });

    // Add user data if full export
    if (options.type === 'FULL' || options.type === 'GDPR') {
      archive.append(JSON.stringify(data.user, null, 2), { name: 'user.json' });

      if (data.subscription) {
        archive.append(JSON.stringify(data.subscription, null, 2), { name: 'subscription.json' });
      }
    }

    // Add projects
    if (data.projects && data.projects.length > 0) {
      for (const project of data.projects) {
        archive.append(
          JSON.stringify(project, null, 2),
          { name: `projects/${project.id}/project.json` }
        );
      }
    }

    // Add sessions
    if (data.sessions && data.sessions.length > 0) {
      const sessionsByProject: { [projectId: string]: any[] } = {};

      for (const session of data.sessions) {
        if (!sessionsByProject[session.projectId]) {
          sessionsByProject[session.projectId] = [];
        }
        sessionsByProject[session.projectId].push(session);
      }

      for (const [projectId, sessions] of Object.entries(sessionsByProject)) {
        archive.append(
          JSON.stringify(sessions, null, 2),
          { name: `projects/${projectId}/sessions.json` }
        );
      }
    }

    // Add recordings metadata
    if (data.recordings && data.recordings.length > 0) {
      archive.append(
        JSON.stringify(data.recordings, null, 2),
        { name: 'recordings/index.json' }
      );

      // Optionally download and include recording files
      if (options.includeFiles) {
        // Note: This would download large video files
        // Implementation depends on StorageService capabilities
        for (const recording of data.recordings) {
          // This is a placeholder - actual implementation would stream from S3
          archive.append(
            `Recording file: ${recording.url}`,
            { name: `recordings/${recording.id}.txt` }
          );
        }
      }
    }

    // Add API keys (redacted)
    if (data.apiKeys && data.apiKeys.length > 0) {
      archive.append(
        JSON.stringify(
          data.apiKeys.map(key => ({
            ...key,
            key: '[REDACTED]',
          })),
          null,
          2
        ),
        { name: 'apiKeys.json' }
      );
    }

    // Add settings
    archive.append(
      JSON.stringify(data.settings || {}, null, 2),
      { name: 'settings.json' }
    );

    await archive.finalize();

    return {
      stream: archive as unknown as Readable,
      size: archive.pointer(),
    };
  }

  /**
   * Export GDPR-compliant data package
   */
  static async exportGDPRData(userId: string): Promise<any> {
    return this.exportToJSON({
      userId,
      format: 'JSON',
      type: 'GDPR',
      includeRecordings: true,
      includeFiles: false,
    });
  }

  /**
   * Process export job
   */
  static async processExportJob(jobId: string): Promise<void> {
    const job = await prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Export job not found');
    }

    try {
      // Update status to processing
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          progress: 10,
        },
      });

      const options = job.options as any as ExportOptions;
      let exportData: any;
      let fileName: string;
      let contentType: string;

      // Generate export based on format
      switch (options.format) {
        case 'JSON':
          exportData = await this.exportToJSON(options);
          fileName = `export-${job.id}.json`;
          contentType = 'application/json';

          await prisma.exportJob.update({
            where: { id: jobId },
            data: { progress: 50 },
          });

          break;

        case 'CSV':
          exportData = await this.exportToCSV(options);
          fileName = `export-${job.id}.csv`;
          contentType = 'text/csv';

          await prisma.exportJob.update({
            where: { id: jobId },
            data: { progress: 50 },
          });

          break;

        case 'ZIP':
          const zipResult = await this.exportToZIP(options);
          // For ZIP, we need to handle stream differently
          // This is simplified - in production, you'd stream to S3
          fileName = `export-${job.id}.zip`;
          contentType = 'application/zip';

          await prisma.exportJob.update({
            where: { id: jobId },
            data: { progress: 50 },
          });

          // Convert stream to buffer for storage (simplified)
          const chunks: Buffer[] = [];
          for await (const chunk of zipResult.stream) {
            chunks.push(Buffer.from(chunk));
          }
          exportData = Buffer.concat(chunks);
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Update progress
      await prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 75 },
      });

      // Store export data
      const dataString = typeof exportData === 'string'
        ? exportData
        : exportData instanceof Buffer
          ? exportData.toString('base64')
          : JSON.stringify(exportData);

      const size = Buffer.byteLength(dataString, 'utf8');

      // Update job with results
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          data: dataString,
          fileName,
          contentType,
          size,
          completedAt: new Date(),
        },
      });

      // Send notification to user (if NotificationService is available)
      // await NotificationService.sendEmail(...)
    } catch (error) {
      // Mark job as failed
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Get export job status
   */
  static async getExportJob(jobId: string, userId: string): Promise<ExportJob> {
    const job = await prisma.exportJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Export job not found');
    }

    return this.jobToResponse(job);
  }

  /**
   * Download export data
   */
  static async downloadExport(jobId: string, userId: string): Promise<{
    data: any;
    fileName: string;
    contentType: string;
  }> {
    const job = await prisma.exportJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Export job not found');
    }

    if (job.status !== 'COMPLETED') {
      throw new Error('Export is not ready for download');
    }

    // Mark as downloaded
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        downloadedAt: new Date(),
      },
    });

    return {
      data: job.data,
      fileName: job.fileName || `export-${jobId}.json`,
      contentType: job.contentType || 'application/json',
    };
  }

  /**
   * List export jobs for a user
   */
  static async listExportJobs(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.exportJob.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          format: true,
          type: true,
          status: true,
          progress: true,
          size: true,
          createdAt: true,
          completedAt: true,
          downloadedAt: true,
          expiresAt: true,
          error: true,
        },
      }),
      prisma.exportJob.count({ where: { userId } }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete export job
   */
  static async deleteExportJob(jobId: string, userId: string) {
    const job = await prisma.exportJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Export job not found');
    }

    await prisma.exportJob.delete({
      where: { id: jobId },
    });

    return { success: true };
  }

  /**
   * Clean up expired exports
   */
  static async cleanupExpiredExports() {
    const deleted = await prisma.exportJob.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return { deletedCount: deleted.count };
  }

  /**
   * Collect data for export based on options
   */
  private static async collectExportData(options: ExportOptions): Promise<any> {
    const { userId, type, projectId, dateRange, includeRecordings } = options;

    const result: any = {};

    // Build date filter
    const dateFilter = dateRange
      ? {
          createdAt: {
            ...(dateRange.from && { gte: dateRange.from }),
            ...(dateRange.to && { lte: dateRange.to }),
          },
        }
      : {};

    switch (type) {
      case 'FULL':
      case 'GDPR':
        // User data
        result.user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            subscriptionTier: true,
            createdAt: true,
            updatedAt: true,
            lastSeenAt: true,
          },
        });

        // Subscription
        result.subscription = await prisma.subscription.findUnique({
          where: { userId },
        });

        // Projects
        result.projects = await prisma.project.findMany({
          where: { userId, ...dateFilter },
        });

        // Sessions
        result.sessions = await prisma.session.findMany({
          where: { userId, ...dateFilter },
        });

        // Recordings
        if (includeRecordings) {
          result.recordings = await prisma.recording.findMany({
            where: {
              session: {
                userId,
              },
              ...dateFilter,
            },
          });
        }

        // API Keys
        result.apiKeys = await prisma.apiKey.findMany({
          where: { userId },
        });

        // Desktop Agents
        result.desktopAgents = await prisma.desktopAgent.findMany({
          where: { userId },
        });

        result.settings = {
          exportDate: new Date().toISOString(),
          type,
          includeRecordings,
        };

        break;

      case 'PROJECT':
        if (!projectId) {
          throw new Error('Project ID required for project export');
        }

        // Verify ownership
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            userId,
          },
        });

        if (!project) {
          throw new Error('Project not found');
        }

        result.projects = [project];

        result.sessions = await prisma.session.findMany({
          where: { projectId, ...dateFilter },
        });

        if (includeRecordings) {
          result.recordings = await prisma.recording.findMany({
            where: {
              session: {
                projectId,
              },
              ...dateFilter,
            },
          });
        }

        break;

      case 'SESSIONS':
        result.sessions = await prisma.session.findMany({
          where: { userId, ...dateFilter },
        });

        if (includeRecordings) {
          result.recordings = await prisma.recording.findMany({
            where: {
              session: {
                userId,
              },
              ...dateFilter,
            },
          });
        }

        break;

      case 'RECORDINGS':
        result.recordings = await prisma.recording.findMany({
          where: {
            session: {
              userId,
            },
            ...dateFilter,
          },
        });

        break;

      default:
        throw new Error(`Unsupported export type: ${type}`);
    }

    return result;
  }

  /**
   * Convert database job to response format
   */
  private static jobToResponse(job: any): ExportJob {
    return {
      id: job.id,
      userId: job.userId,
      status: job.status,
      progress: job.progress,
      format: job.format,
      type: job.type,
      url: job.url,
      size: job.size,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

export default ExportService;
