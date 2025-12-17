import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { BackupService } from '../services/BackupService';
import { ExportService } from '../services/ExportService';

const prisma = new PrismaClient();

/**
 * Scheduled backup job for automatic daily backups
 */
export class ScheduledBackupJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start scheduled backups
   * Runs daily at 2 AM UTC
   */
  start() {
    if (this.cronJob) {
      console.log('Scheduled backup job is already running');
      return;
    }

    // Run daily at 2 AM UTC
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      console.log('Starting scheduled backup job...');

      try {
        await this.runBackups();
        console.log('Scheduled backup job completed successfully');
      } catch (error) {
        console.error('Scheduled backup job failed:', error);
      }
    });

    console.log('Scheduled backup job started (runs daily at 2 AM UTC)');
  }

  /**
   * Stop scheduled backups
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Scheduled backup job stopped');
    }
  }

  /**
   * Run backups for all eligible users
   */
  private async runBackups() {
    // Get all users with Pro or Enterprise subscriptions
    const users = await prisma.user.findMany({
      where: {
        subscriptionTier: {
          in: ['PRO', 'ENTERPRISE'],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
      },
    });

    console.log(`Found ${users.length} users eligible for automatic backups`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        // Check when last backup was created
        const lastBackup = await prisma.backup.findFirst({
          where: {
            userId: user.id,
            type: 'FULL',
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Skip if backup was created in the last 20 hours
        // (to avoid running backup if manual backup was recently created)
        if (lastBackup) {
          const hoursSinceLastBackup = (Date.now() - lastBackup.createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastBackup < 20) {
            console.log(`Skipping backup for user ${user.id} - recent backup exists`);
            continue;
          }
        }

        // Create encrypted backup
        console.log(`Creating backup for user ${user.id} (${user.email})...`);

        const backup = await BackupService.createFullBackup(user.id, {
          encrypt: true,
          includeRecordings: user.subscriptionTier === 'ENTERPRISE', // Only include recordings for Enterprise
        });

        console.log(`Backup created successfully for user ${user.id} - ID: ${backup.id}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to create backup for user ${user.id}:`, error);
        failCount++;
      }
    }

    console.log(`Backup job completed: ${successCount} successful, ${failCount} failed`);

    // Clean up old backups
    await this.cleanupOldBackups();

    // Clean up expired exports
    await this.cleanupExpiredExports();
  }

  /**
   * Clean up old backups (keep only last 30 days)
   */
  private async cleanupOldBackups() {
    try {
      console.log('Cleaning up expired backups...');

      const result = await BackupService.cleanupExpiredBackups();

      console.log(`Deleted ${result.deletedCount} expired backups`);
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Clean up expired export jobs
   */
  private async cleanupExpiredExports() {
    try {
      console.log('Cleaning up expired exports...');

      const result = await ExportService.cleanupExpiredExports();

      console.log(`Deleted ${result.deletedCount} expired exports`);
    } catch (error) {
      console.error('Failed to cleanup expired exports:', error);
    }
  }

  /**
   * Run backup job immediately (for testing)
   */
  async runNow() {
    console.log('Running scheduled backup job manually...');
    await this.runBackups();
  }
}

// Create singleton instance
export const scheduledBackupJob = new ScheduledBackupJob();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  scheduledBackupJob.start();
}

export default scheduledBackupJob;
