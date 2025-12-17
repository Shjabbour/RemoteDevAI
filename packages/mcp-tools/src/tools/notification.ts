/**
 * Notification tools for sending alerts and requesting feedback
 */

import notifier from 'node-notifier';
import {
  ToolResponse,
  SendNotificationParams,
  SendProgressParams,
  RequestFeedbackParams,
} from '../types.js';

interface PendingFeedback {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

const pendingFeedback = new Map<string, PendingFeedback>();

/**
 * Send push notification
 *
 * @example
 * await sendNotification({
 *   title: 'Build Complete',
 *   message: 'Your project has been built successfully',
 *   priority: 'normal',
 *   sound: true
 * });
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<ToolResponse<void>> {
  try {
    const { title, message, priority = 'normal', sound = true, actions } = params;

    await new Promise<void>((resolve, reject) => {
      notifier.notify(
        {
          title,
          message,
          // @ts-ignore
          sound: sound,
          wait: false,
          urgency: priority,
          actions: actions?.map(a => a.label),
        },
        (err, response, metadata) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    return {
      success: true,
      message: 'Notification sent',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
      message: 'Notification failed',
    };
  }
}

/**
 * Send progress update
 *
 * @example
 * await sendProgress({
 *   taskId: 'build-123',
 *   progress: 75,
 *   message: 'Building project...',
 *   status: 'running'
 * });
 */
export async function sendProgress(
  params: SendProgressParams
): Promise<ToolResponse<void>> {
  try {
    const { taskId, progress, message, status = 'running' } = params;

    const statusEmoji = {
      running: '⏳',
      completed: '✅',
      failed: '❌',
    };

    const emoji = statusEmoji[status];
    const progressBar = createProgressBar(progress);

    await sendNotification({
      title: `Task: ${taskId}`,
      message: `${emoji} ${progressBar} ${progress}%\n${message || ''}`,
      priority: status === 'failed' ? 'high' : 'normal',
      sound: status === 'completed' || status === 'failed',
    });

    return {
      success: true,
      message: 'Progress update sent',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send progress',
      message: 'Progress update failed',
    };
  }
}

/**
 * Create progress bar visualization
 */
function createProgressBar(progress: number, length: number = 20): string {
  const filled = Math.round((progress / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Request feedback from user
 *
 * @example
 * const response = await requestFeedback({
 *   question: 'Deploy to production?',
 *   options: ['Yes', 'No'],
 *   timeout: 30000
 * });
 */
export async function requestFeedback(
  params: RequestFeedbackParams
): Promise<ToolResponse<{ response: string; timestamp: Date }>> {
  try {
    const { question, options, timeout = 60000, requireResponse = false } = params;

    const feedbackId = `feedback-${Date.now()}`;

    const response = await new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingFeedback.delete(feedbackId);
        if (requireResponse) {
          reject(new Error('Feedback timeout'));
        } else {
          resolve('no-response');
        }
      }, timeout);

      pendingFeedback.set(feedbackId, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      // Send notification with options
      notifier.notify(
        {
          title: 'Feedback Required',
          message: question,
          wait: true,
          actions: options || ['OK', 'Cancel'],
        },
        (err, response, metadata) => {
          clearTimeout(timeoutId);
          pendingFeedback.delete(feedbackId);

          if (err) {
            reject(err);
          } else {
            resolve(metadata?.activationValue || response || 'dismissed');
          }
        }
      );
    });

    return {
      success: true,
      data: {
        response,
        timestamp: new Date(),
      },
      message: `Received feedback: ${response}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get feedback',
      message: 'Feedback request failed',
    };
  }
}

/**
 * Cancel pending feedback request
 *
 * @example
 * await cancelFeedbackRequest({ feedbackId: 'feedback-123' });
 */
export async function cancelFeedbackRequest(params: {
  feedbackId: string;
}): Promise<ToolResponse<void>> {
  try {
    const pending = pendingFeedback.get(params.feedbackId);

    if (!pending) {
      return {
        success: false,
        error: 'Feedback request not found',
        message: `No pending feedback with ID: ${params.feedbackId}`,
      };
    }

    clearTimeout(pending.timeout);
    pending.reject(new Error('Cancelled'));
    pendingFeedback.delete(params.feedbackId);

    return {
      success: true,
      message: 'Feedback request cancelled',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel feedback',
      message: 'Cancel failed',
    };
  }
}

/**
 * Send webhook notification
 *
 * @example
 * await sendWebhook({
 *   url: 'https://example.com/webhook',
 *   payload: { event: 'build.complete', status: 'success' }
 * });
 */
export async function sendWebhook(params: {
  url: string;
  payload: any;
  headers?: Record<string, string>;
}): Promise<ToolResponse<void>> {
  try {
    const { url, payload, headers = {} } = params;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    return {
      success: true,
      message: `Webhook sent to ${url}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send webhook',
      message: 'Webhook failed',
    };
  }
}

/**
 * Send batch notifications
 *
 * @example
 * await sendBatchNotifications({
 *   notifications: [
 *     { title: 'Task 1', message: 'Complete' },
 *     { title: 'Task 2', message: 'Failed' }
 *   ]
 * });
 */
export async function sendBatchNotifications(params: {
  notifications: SendNotificationParams[];
}): Promise<ToolResponse<{ sent: number; failed: number }>> {
  try {
    let sent = 0;
    let failed = 0;

    for (const notification of params.notifications) {
      const result = await sendNotification(notification);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return {
      success: true,
      data: { sent, failed },
      message: `Sent ${sent} notification(s), ${failed} failed`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send batch',
      message: 'Batch send failed',
    };
  }
}
