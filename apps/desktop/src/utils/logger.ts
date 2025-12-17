import winston from 'winston';
import * as path from 'path';
import { config } from '../config';

// Create logger factory
export function createLogger(module: string): winston.Logger {
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
      let msg = `${timestamp} [${level.toUpperCase()}] [${module}] ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  );

  const logger = winston.createLogger({
    level: config.isDevelopment ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { module },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat),
      }),
      // File transport
      new winston.transports.File({
        filename: path.join(config.logsPath, 'app.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
      // Error file transport
      new winston.transports.File({
        filename: path.join(config.logsPath, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
    ],
  });

  return logger;
}

// Create default logger
export const logger = createLogger('app');
