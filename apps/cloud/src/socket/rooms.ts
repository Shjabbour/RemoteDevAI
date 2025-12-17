import { Socket } from 'socket.io';

/**
 * Join user's personal room
 */
export const joinUserRoom = (socket: Socket, userId: string) => {
  const roomName = `user:${userId}`;
  socket.join(roomName);
  return roomName;
};

/**
 * Leave user's personal room
 */
export const leaveUserRoom = (socket: Socket, userId: string) => {
  const roomName = `user:${userId}`;
  socket.leave(roomName);
  return roomName;
};

/**
 * Join a project room
 */
export const joinProjectRoom = (socket: Socket, projectId: string) => {
  const roomName = `project:${projectId}`;
  socket.join(roomName);
  return roomName;
};

/**
 * Leave a project room
 */
export const leaveProjectRoom = (socket: Socket, projectId: string) => {
  const roomName = `project:${projectId}`;
  socket.leave(roomName);
  return roomName;
};

/**
 * Join a session room
 */
export const joinSessionRoom = (socket: Socket, sessionId: string) => {
  const roomName = `session:${sessionId}`;
  socket.join(roomName);
  return roomName;
};

/**
 * Leave a session room
 */
export const leaveSessionRoom = (socket: Socket, sessionId: string) => {
  const roomName = `session:${sessionId}`;
  socket.leave(roomName);
  return roomName;
};

/**
 * Join an agent room
 */
export const joinAgentRoom = (socket: Socket, agentId: string) => {
  const roomName = `agent:${agentId}`;
  socket.join(roomName);
  return roomName;
};

/**
 * Leave an agent room
 */
export const leaveAgentRoom = (socket: Socket, agentId: string) => {
  const roomName = `agent:${agentId}`;
  socket.leave(roomName);
  return roomName;
};

/**
 * Get room name for user
 */
export const getUserRoomName = (userId: string) => `user:${userId}`;

/**
 * Get room name for project
 */
export const getProjectRoomName = (projectId: string) => `project:${projectId}`;

/**
 * Get room name for session
 */
export const getSessionRoomName = (sessionId: string) => `session:${sessionId}`;

/**
 * Get room name for agent
 */
export const getAgentRoomName = (agentId: string) => `agent:${agentId}`;

export default {
  joinUserRoom,
  leaveUserRoom,
  joinProjectRoom,
  leaveProjectRoom,
  joinSessionRoom,
  leaveSessionRoom,
  joinAgentRoom,
  leaveAgentRoom,
  getUserRoomName,
  getProjectRoomName,
  getSessionRoomName,
  getAgentRoomName,
};
