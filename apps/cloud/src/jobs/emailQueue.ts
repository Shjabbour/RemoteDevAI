import { Queue, Worker, QueueEvents } from 'bullmq';
import { EmailOptions } from '../services/EmailService';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Create email queue
export const emailQueue = new Queue('email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 hours
      count: 1000, // keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
const queueEvents = new QueueEvents('email', {
  connection: redisConnection,
});

queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Email job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Email job ${jobId} failed:`, failedReason);
});

queueEvents.on('stalled', ({ jobId }) => {
  console.warn(`⚠️  Email job ${jobId} stalled`);
});

/**
 * Process email jobs
 * NOTE: This is imported and processed in the worker, not here
 */
export async function processEmailJob(job: any) {
  const { EmailService } = await import('../services/EmailService');
  const options: EmailOptions = job.data;

  console.log(`📧 Processing email job ${job.id} - Template: ${options.template} - To: ${options.to}`);

  const result = await EmailService.sendEmail(options);

  if (!result.success) {
    throw new Error(result.error || 'Failed to send email');
  }

  return result;
}

/**
 * Start email queue worker
 */
export function startEmailWorker() {
  const worker = new Worker('email', processEmailJob, {
    connection: redisConnection,
    concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5'),
    limiter: {
      max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '100'),
      duration: parseInt(process.env.EMAIL_RATE_LIMIT_DURATION || '60000'), // 100 emails per minute by default
    },
  });

  worker.on('completed', (job) => {
    console.log(`✅ Email worker completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Email worker failed job ${job?.id}:`, error);
  });

  worker.on('error', (error) => {
    console.error('Email worker error:', error);
  });

  console.log('✅ Email queue worker started');

  return worker;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
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
 * Pause the queue
 */
export async function pauseQueue() {
  await emailQueue.pause();
  console.log('Email queue paused');
}

/**
 * Resume the queue
 */
export async function resumeQueue() {
  await emailQueue.resume();
  console.log('Email queue resumed');
}

/**
 * Clear all jobs from the queue
 */
export async function clearQueue() {
  await emailQueue.drain();
  console.log('Email queue cleared');
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs() {
  const failedJobs = await emailQueue.getFailed();

  for (const job of failedJobs) {
    await job.retry();
  }

  console.log(`Retried ${failedJobs.length} failed jobs`);
  return failedJobs.length;
}

export default {
  emailQueue,
  startEmailWorker,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  clearQueue,
  retryFailedJobs,
};
