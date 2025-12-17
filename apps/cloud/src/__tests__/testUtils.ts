/**
 * Test utilities for cloud app
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a mock Express request
 */
export function createMockRequest(overrides?: Partial<Request>): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ...overrides
  };
}

/**
 * Creates a mock Express response
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  };
  return res;
}

/**
 * Creates a mock Express next function
 */
export function createMockNext(): NextFunction {
  return jest.fn();
}

/**
 * Creates a mock user object
 */
export function createMockUser(overrides?: any) {
  return {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a mock project object
 */
export function createMockProject(overrides?: any) {
  return {
    id: uuidv4(),
    name: 'Test Project',
    description: 'Test project description',
    userId: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a mock session object
 */
export function createMockSession(overrides?: any) {
  return {
    id: uuidv4(),
    projectId: uuidv4(),
    userId: uuidv4(),
    status: 'active',
    startedAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a mock JWT token payload
 */
export function createMockTokenPayload(overrides?: any) {
  return {
    userId: uuidv4(),
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };
}
