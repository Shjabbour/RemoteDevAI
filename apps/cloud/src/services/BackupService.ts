import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface BackupOptions {
  userId: string;
  type: 'FULL' | 'PROJECT' | 'INCREMENTAL';
  projectId?: string;
  includeRecordings?: boolean;
  encrypt?: boolean;
  since?: Date;
}

export interface BackupMetadata {
  id: string;
  userId: string;
  type: string;
  size: number;
  itemCount: number;
  createdAt: Date;
  expiresAt: Date;
  encrypted: boolean;
  status: 'CREATING' | 'COMPLETED' | 'FAILED';
}

export class BackupService {
  private static ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static ENCRYPTION_KEY_LENGTH = 32;
  private static BACKUP_RETENTION_DAYS = 30;

  /**
   * Create a full account backup
   */
  static async createFullBackup(
    userId: string,
    options: { encrypt?: boolean; includeRecordings?: boolean } = {}
  ): Promise<BackupMetadata> {
    const backupId = uuidv4();

    try {
      // Create backup record
      const backup = await prisma.backup.create({
        data: {
          id: backupId,
          userId,
          type: 'FULL',
          status: 'CREATING',
          encrypted: options.encrypt || false,
          includeRecordings: options.includeRecordings || false,
          expiresAt: new Date(Date.now() + this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      // Collect all user data
      const [user, projects, sessions, recordings, apiKeys] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            subscription: true,
          },
        }),
        prisma.project.findMany({
          where: { userId },
          include: {
            sessions: {
              include: {
                recordings: options.includeRecordings,
              },
            },
          },
        }),
        prisma.session.findMany({
          where: { userId },
        }),
        options.includeRecordings
          ? prisma.recording.findMany({
              where: {
                session: {
                  userId,
                },
              },
            })
          : Promise.resolve([]),
        prisma.apiKey.findMany({
          where: { userId },
        }),
      ]);

      // Build backup data structure
      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'FULL',
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          avatarUrl: user?.avatarUrl,
          subscriptionTier: user?.subscriptionTier,
          createdAt: user?.createdAt,
        },
        subscription: user?.subscription,
        projects,
        sessions,
        recordings: options.includeRecordings ? recordings : [],
        apiKeys: apiKeys.map(key => ({
          ...key,
          key: '[REDACTED]', // Never include actual API keys in backup
        })),
        settings: {
          includeRecordings: options.includeRecordings,
        },
      };

      // Serialize data
      let dataString = JSON.stringify(backupData, null, 2);
      const size = Buffer.byteLength(dataString, 'utf8');

      // Encrypt if requested
      let encryptionKey: string | undefined;
      if (options.encrypt) {
        const result = this.encryptData(dataString);
        dataString = result.encrypted;
        encryptionKey = result.key;
      }

      // Update backup record
      const updatedBackup = await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED',
          data: dataString,
          size,
          itemCount: projects.length + sessions.length + (options.includeRecordings ? recordings.length : 0),
          encryptionKey: encryptionKey,
          completedAt: new Date(),
        },
      });

      return {
        id: updatedBackup.id,
        userId: updatedBackup.userId,
        type: updatedBackup.type,
        size: updatedBackup.size,
        itemCount: updatedBackup.itemCount,
        createdAt: updatedBackup.createdAt,
        expiresAt: updatedBackup.expiresAt,
        encrypted: updatedBackup.encrypted,
        status: updatedBackup.status as 'CREATING' | 'COMPLETED' | 'FAILED',
      };
    } catch (error) {
      // Mark backup as failed
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Create a project-specific backup
   */
  static async createProjectBackup(
    userId: string,
    projectId: string,
    options: { encrypt?: boolean; includeRecordings?: boolean } = {}
  ): Promise<BackupMetadata> {
    const backupId = uuidv4();

    try {
      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Create backup record
      const backup = await prisma.backup.create({
        data: {
          id: backupId,
          userId,
          type: 'PROJECT',
          status: 'CREATING',
          encrypted: options.encrypt || false,
          includeRecordings: options.includeRecordings || false,
          projectId,
          expiresAt: new Date(Date.now() + this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      // Collect project data
      const [projectData, sessions, recordings] = await Promise.all([
        prisma.project.findUnique({
          where: { id: projectId },
        }),
        prisma.session.findMany({
          where: { projectId },
        }),
        options.includeRecordings
          ? prisma.recording.findMany({
              where: {
                session: {
                  projectId,
                },
              },
            })
          : Promise.resolve([]),
      ]);

      // Build backup data
      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'PROJECT',
        project: projectData,
        sessions,
        recordings: options.includeRecordings ? recordings : [],
      };

      // Serialize data
      let dataString = JSON.stringify(backupData, null, 2);
      const size = Buffer.byteLength(dataString, 'utf8');

      // Encrypt if requested
      let encryptionKey: string | undefined;
      if (options.encrypt) {
        const result = this.encryptData(dataString);
        dataString = result.encrypted;
        encryptionKey = result.key;
      }

      // Update backup record
      const updatedBackup = await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED',
          data: dataString,
          size,
          itemCount: sessions.length + (options.includeRecordings ? recordings.length : 0),
          encryptionKey: encryptionKey,
          completedAt: new Date(),
        },
      });

      return {
        id: updatedBackup.id,
        userId: updatedBackup.userId,
        type: updatedBackup.type,
        size: updatedBackup.size,
        itemCount: updatedBackup.itemCount,
        createdAt: updatedBackup.createdAt,
        expiresAt: updatedBackup.expiresAt,
        encrypted: updatedBackup.encrypted,
        status: updatedBackup.status as 'CREATING' | 'COMPLETED' | 'FAILED',
      };
    } catch (error) {
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Create an incremental backup (only data changed since last backup)
   */
  static async createIncrementalBackup(
    userId: string,
    since: Date,
    options: { encrypt?: boolean; includeRecordings?: boolean } = {}
  ): Promise<BackupMetadata> {
    const backupId = uuidv4();

    try {
      // Create backup record
      const backup = await prisma.backup.create({
        data: {
          id: backupId,
          userId,
          type: 'INCREMENTAL',
          status: 'CREATING',
          encrypted: options.encrypt || false,
          includeRecordings: options.includeRecordings || false,
          since,
          expiresAt: new Date(Date.now() + this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      // Collect changed data
      const [projects, sessions, recordings] = await Promise.all([
        prisma.project.findMany({
          where: {
            userId,
            updatedAt: {
              gte: since,
            },
          },
        }),
        prisma.session.findMany({
          where: {
            userId,
            updatedAt: {
              gte: since,
            },
          },
        }),
        options.includeRecordings
          ? prisma.recording.findMany({
              where: {
                session: {
                  userId,
                },
                updatedAt: {
                  gte: since,
                },
              },
            })
          : Promise.resolve([]),
      ]);

      // Build backup data
      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'INCREMENTAL',
        since: since.toISOString(),
        projects,
        sessions,
        recordings: options.includeRecordings ? recordings : [],
      };

      // Serialize data
      let dataString = JSON.stringify(backupData, null, 2);
      const size = Buffer.byteLength(dataString, 'utf8');

      // Encrypt if requested
      let encryptionKey: string | undefined;
      if (options.encrypt) {
        const result = this.encryptData(dataString);
        dataString = result.encrypted;
        encryptionKey = result.key;
      }

      // Update backup record
      const updatedBackup = await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED',
          data: dataString,
          size,
          itemCount: projects.length + sessions.length + (options.includeRecordings ? recordings.length : 0),
          encryptionKey: encryptionKey,
          completedAt: new Date(),
        },
      });

      return {
        id: updatedBackup.id,
        userId: updatedBackup.userId,
        type: updatedBackup.type,
        size: updatedBackup.size,
        itemCount: updatedBackup.itemCount,
        createdAt: updatedBackup.createdAt,
        expiresAt: updatedBackup.expiresAt,
        encrypted: updatedBackup.encrypted,
        status: updatedBackup.status as 'CREATING' | 'COMPLETED' | 'FAILED',
      };
    } catch (error) {
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Get backup by ID
   */
  static async getBackup(backupId: string, userId: string) {
    const backup = await prisma.backup.findFirst({
      where: {
        id: backupId,
        userId,
      },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    return backup;
  }

  /**
   * List all backups for a user
   */
  static async listBackups(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [backups, total] = await Promise.all([
      prisma.backup.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          size: true,
          itemCount: true,
          encrypted: true,
          includeRecordings: true,
          createdAt: true,
          completedAt: true,
          expiresAt: true,
          error: true,
        },
      }),
      prisma.backup.count({ where: { userId } }),
    ]);

    return {
      backups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Download backup data
   */
  static async downloadBackup(backupId: string, userId: string, encryptionKey?: string) {
    const backup = await this.getBackup(backupId, userId);

    if (backup.status !== 'COMPLETED') {
      throw new Error('Backup is not ready for download');
    }

    let data = backup.data;

    // Decrypt if encrypted
    if (backup.encrypted) {
      if (!encryptionKey) {
        throw new Error('Encryption key required for encrypted backup');
      }

      data = this.decryptData(data as string, encryptionKey);
    }

    return {
      data,
      metadata: {
        id: backup.id,
        type: backup.type,
        size: backup.size,
        itemCount: backup.itemCount,
        createdAt: backup.createdAt,
        encrypted: backup.encrypted,
      },
    };
  }

  /**
   * Delete a backup
   */
  static async deleteBackup(backupId: string, userId: string) {
    const backup = await this.getBackup(backupId, userId);

    await prisma.backup.delete({
      where: { id: backup.id },
    });

    return { success: true };
  }

  /**
   * Clean up expired backups
   */
  static async cleanupExpiredBackups() {
    const deleted = await prisma.backup.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return { deletedCount: deleted.count };
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private static encryptData(data: string): { encrypted: string; key: string } {
    // Generate encryption key
    const key = crypto.randomBytes(this.ENCRYPTION_KEY_LENGTH);
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + auth tag + encrypted data
    const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;

    return {
      encrypted: combined,
      key: key.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private static decryptData(encryptedData: string, keyHex: string): string {
    // Parse combined data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = Buffer.from(keyHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get backup statistics for a user
   */
  static async getBackupStatistics(userId: string) {
    const [totalBackups, totalSize, latestBackup] = await Promise.all([
      prisma.backup.count({ where: { userId } }),
      prisma.backup.aggregate({
        where: { userId },
        _sum: { size: true },
      }),
      prisma.backup.findFirst({
        where: { userId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalBackups,
      totalSize: totalSize._sum.size || 0,
      latestBackup: latestBackup
        ? {
            id: latestBackup.id,
            type: latestBackup.type,
            createdAt: latestBackup.createdAt,
          }
        : null,
    };
  }
}

export default BackupService;
