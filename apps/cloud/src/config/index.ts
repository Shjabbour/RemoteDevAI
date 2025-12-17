import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  apiUrl: z.string().url().default('http://localhost:3000'),

  // Database
  databaseUrl: z.string().min(1),

  // Redis (for rate limiting and caching)
  redisUrl: z.string().default('redis://localhost:6379'),

  // JWT
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('7d'),

  // Clerk (optional)
  clerkPublishableKey: z.string().optional(),
  clerkSecretKey: z.string().optional(),
  clerkWebhookSecret: z.string().optional(),

  // Stripe
  stripeSecretKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),

  // Stripe Price IDs
  stripePrice: z.object({
    proMonthly: z.string().optional(),
    proYearly: z.string().optional(),
    enterpriseMonthly: z.string().optional(),
    enterpriseYearly: z.string().optional(),
  }),

  // S3/R2
  s3: z.object({
    endpoint: z.string().url().optional(),
    bucketName: z.string().optional(),
    region: z.string().default('auto'),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    publicUrl: z.string().url().optional(),
  }),

  // CORS
  corsOrigin: z.string().default('http://localhost:5173'),

  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().default(900000), // 15 minutes
    maxRequests: z.coerce.number().default(100),
  }),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // WebSocket
  socketCorsOrigin: z.string().default('http://localhost:5173'),

  // Email (optional)
  smtp: z.object({
    host: z.string().optional(),
    port: z.coerce.number().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    from: z.string().optional(),
  }),

  // Push Notifications (optional)
  push: z.object({
    vapidPublicKey: z.string().optional(),
    vapidPrivateKey: z.string().optional(),
    vapidSubject: z.string().optional(),
  }),

  // Sentry (optional)
  sentryDsn: z.string().optional(),

  // Feature Flags
  features: z.object({
    enableSubscriptions: z.coerce.boolean().default(true),
    enableRecordings: z.coerce.boolean().default(true),
    enableClerkAuth: z.coerce.boolean().default(false),
  }),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    apiUrl: process.env.API_URL,

    databaseUrl: process.env.DATABASE_URL,

    redisUrl: process.env.REDIS_URL,

    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,

    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
    clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,

    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    stripePrice: {
      proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      proYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
      enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    },

    s3: {
      endpoint: process.env.S3_ENDPOINT,
      bucketName: process.env.S3_BUCKET_NAME,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      publicUrl: process.env.S3_PUBLIC_URL,
    },

    corsOrigin: process.env.CORS_ORIGIN,

    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    },

    logLevel: process.env.LOG_LEVEL,
    socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN,

    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM,
    },

    push: {
      vapidPublicKey: process.env.PUSH_VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.PUSH_VAPID_PRIVATE_KEY,
      vapidSubject: process.env.PUSH_VAPID_SUBJECT,
    },

    sentryDsn: process.env.SENTRY_DSN,

    features: {
      enableSubscriptions: process.env.ENABLE_SUBSCRIPTIONS,
      enableRecordings: process.env.ENABLE_RECORDINGS,
      enableClerkAuth: process.env.ENABLE_CLERK_AUTH,
    },
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration. Please check your .env file.');
    }
    throw error;
  }
}

export const config = loadConfig();

export default config;
