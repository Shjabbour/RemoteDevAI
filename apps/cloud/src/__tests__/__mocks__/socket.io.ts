/**
 * Mock Socket.IO for testing
 */

export const mockSocket = {
  id: 'mock-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  disconnect: jest.fn(),
  handshake: {
    auth: {},
    headers: {},
    query: {}
  },
  rooms: new Set(['mock-socket-id']),
  data: {}
};

export const mockIo = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  on: jest.fn(),
  of: jest.fn().mockReturnThis(),
  use: jest.fn(),
  sockets: {
    emit: jest.fn(),
    sockets: new Map()
  }
};

export const Server = jest.fn(() => mockIo);

export default {
  Server,
  mockSocket,
  mockIo
};
