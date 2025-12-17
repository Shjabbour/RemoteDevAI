import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { WebhookService } from '../services/WebhookService';
import Redis from 'ioredis';

/**
 * Webhook Delivery Job Queue
 * Handles webhook delivery with retry logic using BullMQ
 */

// Redis connection configuration
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Job data interface
export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  eventType: string;
  attempt: number;
}

// Create webhook delivery queue
export const webhookDeliveryQueue = new Queue<WebhookDeliveryJobData>('webhook-delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute delay
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
  },
});

// Create queue events for monitoring
export const webhookDeliveryQueueEvents = new QueueEvents('webhook-delivery', {
  connection: redisConnection,
});

/**
 * Webhook delivery worker
 * Processes webhook delivery jobs
 */
export const webhookDeliveryWorker = new Worker<WebhookDeliveryJobData>(
  'webhook-delivery',
  async (job: Job<WebhookDeliveryJobData>) => {
    const { deliveryId, webhookId, eventType, attempt } = job.data;

    console.log(
      `Processing webhook delivery job ${job.id} - Delivery ID: ${deliveryId}, Attempt: ${attempt}`
    );

    try {
      // Deliver the webhook
      await WebhookService.deliverWebhook(deliveryId);

      console.log(`Successfully delivered webhook ${deliveryId}`);

      return {
        success: true,
        deliveryId,
        webhookId,
        eventType,
        attempt,
      };
    } catch (error: any) {
      console.error(`Failed to deliver webhook ${deliveryId}:`, error.message);

      // Re-throw to trigger retry
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process up to 10 webhooks concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  }
);

/**
 * Queue a webhook delivery job
 *
 * @param deliveryId - The webhook delivery ID
 * @param webhookId - The webhook ID
 * @param eventType - The event type
 * @param delay - Optional delay in milliseconds before processing
 */
export async function queueWebhookDelivery(
  deliveryId: string,
  webhookId: string,
  eventType: string,
  delay: number = 0
): Promise<void> {
  await webhookDeliveryQueue.add(
    'deliver-webhook',
    {
      deliveryId,
      webhookId,
      eventType,
      attempt: 1,
    },
    {
      delay,
      jobId: deliveryId, // Use delivery ID as job ID to prevent duplicates
    }
  );

  console.log(`Queued webhook delivery ${deliveryId} with delay ${delay}ms`);
}

/**
 * Retry a failed webhook delivery
 *
 * @param deliveryId - The webhook delivery ID
 * @param webhookId - The webhook ID
 * @param eventType - The event type
 * @param attempt - The retry attempt number
 * @param delaySeconds - Delay before retry in seconds
 */
export async function retryWebhookDelivery(
  deliveryId: string,
  webhookId: string,
  eventType: string,
  attempt: number,
  delaySeconds: number
): Promise<void> {
  const delayMs = delaySeconds * 1000;

  await webhookDeliveryQueue.add(
    'deliver-webhook',
    {
      deliveryId,
      webhookId,
      eventType,
      attempt,
    },
    {
      delay: delayMs,
      jobId: `${deliveryId}-retry-${attempt}`,
    }
  );

  console.log(`Queued webhook retry ${deliveryId} (attempt ${attempt}) with delay ${delaySeconds}s`);
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookDeliveryQueue.getWaitingCount(),
    webhookDeliveryQueue.getActiveCount(),
    webhookDeliveryQueue.getCompletedCount(),
    webhookDeliveryQueue.getFailedCount(),
    webhookDeliveryQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get failed jobs for a specific webhook
 */
export async function getFailedJobsForWebhook(webhookId: string) {
  const failed = await webhookDeliveryQueue.getFailed();

  return failed.filter((job) => job.data.webhookId === webhookId);
}

/**
 * Retry all failed jobs for a webhook
 */
export async function retryAllFailedJobs(webhookId?: string) {
  const failed = await webhookDeliveryQueue.getFailed();

  const jobsToRetry = webhookId
    ? failed.filter((job) => job.data.webhookId === webhookId)
    : failed;

  for (const job of jobsToRetry) {
    await job.retry();
  }

  return {
    retried: jobsToRetry.length,
  };
}

/**
 * Clear completed jobs older than specified age
 */
export async function cleanOldJobs(ageInSeconds: number = 86400) {
  await webhookDeliveryQueue.clean(ageInSeconds * 1000, 1000, 'completed');
  await webhookDeliveryQueue.clean(ageInSeconds * 1000 * 7, 1000, 'failed');

  return { success: true };
}

/**
 * Pause the webhook delivery queue
 */
export async function pauseQueue() {
  await webhookDeliveryQueue.pause();
  console.log('Webhook delivery queue paused');
}

/**
 * Resume the webhook delivery queue
 */
export async function resumeQueue() {
  await webhookDeliveryQueue.resume();
  console.log('Webhook delivery queue resumed');
}

/**
 * Close the webhook delivery queue and worker
 */
export async function closeWebhookQueue() {
  await webhookDeliveryWorker.close();
  await webhookDeliveryQueue.close();
  await webhookDeliveryQueueEvents.close();
  await redisConnection.quit();
  console.log('Webhook delivery queue closed');
}

// Event listeners for monitoring
webhookDeliveryWorker.on('completed', (job) => {
  console.log(`Webhook delivery job ${job.id} completed successfully`);
});

webhookDeliveryWorker.on('failed', (job, error) => {
  if (job) {
    console.error(`Webhook delivery job ${job.id} failed:`, error.message);
  }
});

webhookDeliveryWorker.on('error', (error) => {
  console.error('Webhook delivery worker error:', error);
});

webhookDeliveryQueueEvents.on('stalled', ({ jobId }) => {
  console.warn(`Webhook delivery job ${jobId} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing webhook delivery queue...');
  await closeWebhookQueue();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing webhook delivery queue...');
  await closeWebhookQueue();
});

export default {
  queue: webhookDeliveryQueue,
  worker: webhookDeliveryWorker,
  queueEvents: webhookDeliveryQueueEvents,
  queueWebhookDelivery,
  retryWebhookDelivery,
  getQueueStats,
  getFailedJobsForWebhook,
  retryAllFailedJobs,
  cleanOldJobs,
  pauseQueue,
  resumeQueue,
  closeWebhookQueue,
};
