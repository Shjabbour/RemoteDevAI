import crypto from 'crypto';

/**
 * Webhook Signature Utilities
 * Handles HMAC-SHA256 signature generation and verification for webhooks
 */

export interface WebhookPayload {
  id: string;
  type: string;
  created: string;
  data: any;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * @param payload - The webhook payload to sign
 * @param secret - The webhook secret key
 * @returns Signature string (hex encoded)
 *
 * Example:
 * const signature = generateWebhookSignature(payload, webhookSecret);
 */
export function generateWebhookSignature(
  payload: WebhookPayload | string,
  secret: string
): string {
  const payloadString = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload);

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

/**
 * Verify webhook signature
 *
 * @param payload - The webhook payload
 * @param signature - The signature to verify
 * @param secret - The webhook secret key
 * @returns True if signature is valid, false otherwise
 *
 * Example:
 * const isValid = verifyWebhookSignature(payload, receivedSignature, webhookSecret);
 */
export function verifyWebhookSignature(
  payload: WebhookPayload | string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Generate webhook signature with timestamp
 * This prevents replay attacks by including a timestamp in the signature
 *
 * @param payload - The webhook payload
 * @param secret - The webhook secret key
 * @param timestamp - Unix timestamp (optional, defaults to current time)
 * @returns Object containing signature and timestamp
 *
 * Example:
 * const { signature, timestamp } = generateSignatureWithTimestamp(payload, secret);
 */
export function generateSignatureWithTimestamp(
  payload: WebhookPayload | string,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload);

  // Create signature from timestamp + payload
  const signedPayload = `${ts}.${payloadString}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);

  return {
    signature: hmac.digest('hex'),
    timestamp: ts,
  };
}

/**
 * Verify webhook signature with timestamp
 * Validates both signature and timestamp to prevent replay attacks
 *
 * @param payload - The webhook payload
 * @param signature - The signature to verify
 * @param timestamp - Unix timestamp from the webhook
 * @param secret - The webhook secret key
 * @param toleranceSeconds - Maximum age of webhook in seconds (default: 300 = 5 minutes)
 * @returns True if signature is valid and timestamp is within tolerance
 *
 * Example:
 * const isValid = verifySignatureWithTimestamp(payload, signature, timestamp, secret);
 */
export function verifySignatureWithTimestamp(
  payload: WebhookPayload | string,
  signature: string,
  timestamp: number,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  // Check timestamp is not too old
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const age = currentTimestamp - timestamp;

  if (age > toleranceSeconds) {
    return false; // Webhook is too old
  }

  // Check timestamp is not in the future (with small tolerance for clock skew)
  if (timestamp > currentTimestamp + 60) {
    return false; // Timestamp is in the future
  }

  const payloadString = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload);

  // Verify signature
  const signedPayload = `${timestamp}.${payloadString}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const expectedSignature = hmac.digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    // Buffer lengths don't match
    return false;
  }
}

/**
 * Generate a secure webhook secret
 *
 * @param length - Length of the secret in bytes (default: 32)
 * @returns Random hex string
 *
 * Example:
 * const secret = generateWebhookSecret();
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create webhook headers for delivery
 *
 * @param payload - The webhook payload
 * @param secret - The webhook secret key
 * @param customHeaders - Additional custom headers
 * @returns Headers object
 *
 * Example:
 * const headers = createWebhookHeaders(payload, secret, { 'X-Custom': 'value' });
 */
export function createWebhookHeaders(
  payload: WebhookPayload,
  secret: string,
  customHeaders: Record<string, string> = {}
): Record<string, string> {
  const { signature, timestamp } = generateSignatureWithTimestamp(payload, secret);

  return {
    'Content-Type': 'application/json',
    'User-Agent': 'RemoteDevAI-Webhooks/1.0',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': timestamp.toString(),
    'X-Webhook-ID': payload.id,
    'X-Webhook-Event': payload.type,
    ...customHeaders,
  };
}

/**
 * Verify incoming webhook request
 * Extracts and verifies signature from request headers
 *
 * @param headers - Request headers object
 * @param body - Request body (string or object)
 * @param secret - The webhook secret key
 * @returns True if webhook is valid
 *
 * Example:
 * const isValid = verifyIncomingWebhook(req.headers, req.body, secret);
 */
export function verifyIncomingWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: any,
  secret: string
): boolean {
  const signature = headers['x-webhook-signature'] as string;
  const timestamp = headers['x-webhook-timestamp'] as string;

  if (!signature || !timestamp) {
    return false;
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return false;
  }

  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

  return verifySignatureWithTimestamp(
    bodyString,
    signature,
    timestampNum,
    secret
  );
}

/**
 * Format webhook event ID
 * Creates a unique event ID with prefix
 *
 * @param prefix - Event prefix (default: 'evt')
 * @returns Unique event ID
 *
 * Example:
 * const eventId = formatWebhookEventId(); // evt_1a2b3c4d...
 */
export function formatWebhookEventId(prefix: string = 'evt'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}
