import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { BackupService } from './BackupService';

const prisma = new PrismaClient();

export interface ImportOptions {
  userId: string;
  data: any;
  conflictResolution?: 'SKIP' | 'OVERWRITE' | 'MERGE';
  validateOnly?: boolean;
}

export interface ImportJob {
  id: string;
  userId: string;
  status: 'PENDING' | 'VALIDATING' | 'IMPORTING' | 'COMPLETED' | 'FAILED';
  progress: number;
  totalItems: number;
  importedItems: number;
  skippedItems: number;
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    version: string;
    type: string;
    projectCount: number;
    sessionCount: number;
    recordingCount: number;
  };
  conflicts: {
    existingProjects: string[];
    existingSessions: string[];
  };
}

export class ImportService {
  /**
   * Validate backup/export data before import
   */
  static async validateImport(userId: string, data: any): Promise<ImportValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts = {
      existingProjects: [] as string[],
      existingSessions: [] as string[],
    };

    try {
      // Parse data if string
      const importData = typeof data === 'string' ? JSON.parse(data) : data;

      // Check version
      if (!importData.version) {
        errors.push('Missing version field');
      }

      // Check export date
      if (!importData.exportDate) {
        warnings.push('Missing export date');
      }

      // Validate structure
      const expectedFields = ['version', 'exportDate', 'type'];
      for (const field of expectedFields) {
        if (!importData[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Count items
      const projectCount = importData.projects?.length || 0;
      const sessionCount = importData.sessions?.length || 0;
      const recordingCount = importData.recordings?.length || 0;

      // Check for conflicts
      if (importData.projects) {
        for (const project of importData.projects) {
          const existing = await prisma.project.findFirst({
            where: {
              userId,
              name: project.name,
            },
          });

          if (existing) {
            conflicts.existingProjects.push(project.name);
            warnings.push(`Project "${project.name}" already exists`);
          }
        }
      }

      if (importData.sessions) {
        for (const session of importData.sessions) {
          if (session.id) {
            const existing = await prisma.session.findFirst({
              where: {
                id: session.id,
                userId,
              },
            });

            if (existing) {
              conflicts.existingSessions.push(session.id);
            }
          }
        }
      }

      // Validate user owns the data (if user data is included)
      if (importData.user && importData.user.id !== userId) {
        warnings.push('Import data belongs to a different user - IDs will be remapped');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
          version: importData.version || 'unknown',
          type: importData.type || 'unknown',
          projectCount,
          sessionCount,
          recordingCount,
        },
        conflicts,
      };
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        valid: false,
        errors,
        warnings,
        summary: {
          version: 'unknown',
          type: 'unknown',
          projectCount: 0,
          sessionCount: 0,
          recordingCount: 0,
        },
        conflicts,
      };
    }
  }

  /**
   * Create an import job
   */
  static async createImportJob(userId: string, data: any): Promise<ImportJob> {
    const jobId = uuidv4();

    // Validate first
    const validation = await this.validateImport(userId, data);

    if (!validation.valid) {
      throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
    }

    const totalItems = validation.summary.projectCount +
      validation.summary.sessionCount +
      validation.summary.recordingCount;

    const job = await prisma.importJob.create({
      data: {
        id: jobId,
        userId,
        status: 'PENDING',
        progress: 0,
        totalItems,
        importedItems: 0,
        skippedItems: 0,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        errors: [],
      },
    });

    return this.jobToResponse(job);
  }

  /**
   * Process import job
   */
  static async processImportJob(
    jobId: string,
    options: { conflictResolution?: 'SKIP' | 'OVERWRITE' | 'MERGE' } = {}
  ): Promise<void> {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    const { conflictResolution = 'SKIP' } = options;
    const errors: string[] = [];

    try {
      // Update status to validating
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'VALIDATING',
          progress: 10,
        },
      });

      // Parse data
      const importData = typeof job.data === 'string' ? JSON.parse(job.data as string) : job.data;

      // Validate
      const validation = await this.validateImport(job.userId, importData);

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Update status to importing
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'IMPORTING',
          progress: 20,
        },
      });

      let importedItems = 0;
      let skippedItems = 0;

      // Import projects
      if (importData.projects && importData.projects.length > 0) {
        const projectResult = await this.importProjects(
          job.userId,
          importData.projects,
          conflictResolution
        );

        importedItems += projectResult.imported;
        skippedItems += projectResult.skipped;
        errors.push(...projectResult.errors);

        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            progress: 40,
            importedItems,
            skippedItems,
          },
        });
      }

      // Import sessions
      if (importData.sessions && importData.sessions.length > 0) {
        const sessionResult = await this.importSessions(
          job.userId,
          importData.sessions,
          conflictResolution
        );

        importedItems += sessionResult.imported;
        skippedItems += sessionResult.skipped;
        errors.push(...sessionResult.errors);

        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            progress: 70,
            importedItems,
            skippedItems,
          },
        });
      }

      // Import recordings metadata (not actual files)
      if (importData.recordings && importData.recordings.length > 0) {
        const recordingResult = await this.importRecordings(
          job.userId,
          importData.recordings,
          conflictResolution
        );

        importedItems += recordingResult.imported;
        skippedItems += recordingResult.skipped;
        errors.push(...recordingResult.errors);

        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            progress: 90,
            importedItems,
            skippedItems,
          },
        });
      }

      // Complete job
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          importedItems,
          skippedItems,
          errors,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      // Mark job as failed
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        },
      });

      throw error;
    }
  }

  /**
   * Import projects
   */
  private static async importProjects(
    userId: string,
    projects: any[],
    conflictResolution: 'SKIP' | 'OVERWRITE' | 'MERGE'
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const project of projects) {
      try {
        // Check if project already exists
        const existing = await prisma.project.findFirst({
          where: {
            userId,
            name: project.name,
          },
        });

        if (existing) {
          if (conflictResolution === 'SKIP') {
            skipped++;
            continue;
          } else if (conflictResolution === 'OVERWRITE') {
            // Update existing project
            await prisma.project.update({
              where: { id: existing.id },
              data: {
                description: project.description,
                settings: project.settings || {},
                isActive: project.isActive ?? true,
                isArchived: project.isArchived ?? false,
              },
            });
            imported++;
          } else if (conflictResolution === 'MERGE') {
            // Merge settings
            await prisma.project.update({
              where: { id: existing.id },
              data: {
                description: project.description || existing.description,
                settings: {
                  ...(existing.settings as any),
                  ...(project.settings || {}),
                },
              },
            });
            imported++;
          }
        } else {
          // Create new project
          await prisma.project.create({
            data: {
              userId,
              name: project.name,
              description: project.description,
              settings: project.settings || {},
              isActive: project.isActive ?? true,
              isArchived: project.isArchived ?? false,
            },
          });
          imported++;
        }
      } catch (error) {
        errors.push(`Failed to import project "${project.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Import sessions
   */
  private static async importSessions(
    userId: string,
    sessions: any[],
    conflictResolution: 'SKIP' | 'OVERWRITE' | 'MERGE'
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const session of sessions) {
      try {
        // Find or create project
        let project = await prisma.project.findFirst({
          where: {
            userId,
            id: session.projectId,
          },
        });

        if (!project) {
          // Project doesn't exist, skip session
          errors.push(`Session "${session.id}" references non-existent project "${session.projectId}"`);
          skipped++;
          continue;
        }

        // Check if session exists
        const existing = await prisma.session.findFirst({
          where: {
            id: session.id,
            userId,
          },
        });

        if (existing) {
          if (conflictResolution === 'SKIP') {
            skipped++;
            continue;
          } else if (conflictResolution === 'OVERWRITE') {
            // Update existing session
            await prisma.session.update({
              where: { id: existing.id },
              data: {
                title: session.title,
                summary: session.summary,
                messages: session.messages || [],
                status: session.status || 'COMPLETED',
                endedAt: session.endedAt ? new Date(session.endedAt) : null,
              },
            });
            imported++;
          } else if (conflictResolution === 'MERGE') {
            // Merge messages
            await prisma.session.update({
              where: { id: existing.id },
              data: {
                title: session.title || existing.title,
                summary: session.summary || existing.summary,
                messages: [
                  ...(existing.messages as any[] || []),
                  ...(session.messages || []),
                ],
              },
            });
            imported++;
          }
        } else {
          // Create new session
          await prisma.session.create({
            data: {
              userId,
              projectId: project.id,
              title: session.title,
              summary: session.summary,
              messages: session.messages || [],
              status: session.status || 'COMPLETED',
              startedAt: session.startedAt ? new Date(session.startedAt) : new Date(),
              endedAt: session.endedAt ? new Date(session.endedAt) : null,
            },
          });
          imported++;
        }
      } catch (error) {
        errors.push(`Failed to import session "${session.id}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Import recordings metadata
   */
  private static async importRecordings(
    userId: string,
    recordings: any[],
    conflictResolution: 'SKIP' | 'OVERWRITE' | 'MERGE'
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const recording of recordings) {
      try {
        // Verify session exists
        const session = await prisma.session.findFirst({
          where: {
            id: recording.sessionId,
            userId,
          },
        });

        if (!session) {
          errors.push(`Recording "${recording.id}" references non-existent session "${recording.sessionId}"`);
          skipped++;
          continue;
        }

        // Check if recording exists
        const existing = await prisma.recording.findFirst({
          where: {
            id: recording.id,
          },
        });

        if (existing) {
          if (conflictResolution === 'SKIP') {
            skipped++;
            continue;
          } else if (conflictResolution === 'OVERWRITE') {
            // Update existing recording metadata
            await prisma.recording.update({
              where: { id: existing.id },
              data: {
                title: recording.title,
                url: recording.url,
                thumbnailUrl: recording.thumbnailUrl,
                duration: recording.duration,
                fileSize: recording.fileSize,
                mimeType: recording.mimeType || 'video/webm',
              },
            });
            imported++;
          }
        } else {
          // Create new recording metadata
          await prisma.recording.create({
            data: {
              sessionId: session.id,
              title: recording.title,
              url: recording.url,
              thumbnailUrl: recording.thumbnailUrl,
              duration: recording.duration,
              fileSize: recording.fileSize,
              mimeType: recording.mimeType || 'video/webm',
              status: 'READY',
              recordedAt: recording.recordedAt ? new Date(recording.recordedAt) : new Date(),
            },
          });
          imported++;
        }
      } catch (error) {
        errors.push(`Failed to import recording "${recording.id}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Get import job status
   */
  static async getImportJob(jobId: string, userId: string): Promise<ImportJob> {
    const job = await prisma.importJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    return this.jobToResponse(job);
  }

  /**
   * List import jobs
   */
  static async listImportJobs(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.importJob.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          progress: true,
          totalItems: true,
          importedItems: true,
          skippedItems: true,
          errors: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.importJob.count({ where: { userId } }),
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
   * Delete import job
   */
  static async deleteImportJob(jobId: string, userId: string) {
    const job = await prisma.importJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    await prisma.importJob.delete({
      where: { id: jobId },
    });

    return { success: true };
  }

  /**
   * Convert database job to response format
   */
  private static jobToResponse(job: any): ImportJob {
    return {
      id: job.id,
      userId: job.userId,
      status: job.status,
      progress: job.progress,
      totalItems: job.totalItems,
      importedItems: job.importedItems,
      skippedItems: job.skippedItems,
      errors: job.errors || [],
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

export default ImportService;
