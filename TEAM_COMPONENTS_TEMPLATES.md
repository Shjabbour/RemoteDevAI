# Team Collaboration - Component Templates

This file contains templates for the remaining team collaboration components. Copy and customize as needed.

## Frontend Components

### 1. TeamSwitcher Component

```tsx
// apps/web/src/components/team/TeamSwitcher.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function TeamSwitcher() {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const response = await fetch('/api/teams', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await response.json();
    setTeams(data.data);
  };

  const switchTo = (teamId: string | null) => {
    setCurrentTeam(teamId);
    if (teamId) {
      router.push(`/dashboard/team/${teamId}`);
    } else {
      router.push('/dashboard');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100"
      >
        <span>{currentTeam ? 'Team' : 'Personal'}</span>
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => switchTo(null)}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Personal Workspace
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            {teams.map((team: any) => (
              <button
                key={team.id}
                onClick={() => switchTo(team.id)}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. MemberList Component

```tsx
// apps/web/src/components/team/MemberList.tsx
'use client';

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
    lastSeenAt: string;
  };
}

export function MemberList({
  members,
  canManage,
  onRoleChange,
  onRemove
}: {
  members: Member[];
  canManage: boolean;
  onRoleChange?: (memberId: string, role: string) => void;
  onRemove?: (memberId: string) => void;
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>

        <ul className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center">
                {member.user.avatarUrl ? (
                  <img
                    src={member.user.avatarUrl}
                    alt={member.user.name || member.user.email}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {member.user.name || member.user.email}
                  </p>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                  member.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                  member.role === 'MEMBER' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {member.role.toLowerCase()}
                </span>

                {canManage && member.role !== 'OWNER' && (
                  <div className="flex space-x-2">
                    {onRoleChange && (
                      <select
                        value={member.role}
                        onChange={(e) => onRoleChange(member.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    )}
                    {onRemove && (
                      <button
                        onClick={() => onRemove(member.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### 3. InviteMemberModal Component

```tsx
// apps/web/src/components/team/InviteMemberModal.tsx
'use client';

import { useState } from 'react';

export function InviteMemberModal({
  teamId,
  onClose,
  onSuccess
}: {
  teamId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ADMIN">Admin - Can manage members and projects</option>
              <option value="MEMBER">Member - Can create and share projects</option>
              <option value="VIEWER">Viewer - Read-only access</option>
            </select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 4. ActivityFeed Component

```tsx
// apps/web/src/components/team/ActivityFeed.tsx
'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata: any;
  createdAt: string;
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
}

export function ActivityFeed({ teamId }: { teamId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [teamId]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/activity`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setActivities(data.data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    const icons: Record<string, string> = {
      team_created: '🎉',
      member_joined: '👋',
      member_invited: '✉️',
      member_removed: '👋',
      role_changed: '🔄',
      project_added: '📁',
      project_removed: '🗑️',
      team_updated: '✏️',
    };
    return icons[action] || '📝';
  };

  const getActivityMessage = (activity: Activity) => {
    const userName = activity.user.name || activity.user.email;
    const messages: Record<string, string> = {
      team_created: `${userName} created the team`,
      member_joined: `${userName} joined the team`,
      member_invited: `${userName} invited ${activity.metadata.email}`,
      member_removed: `${userName} removed a member`,
      role_changed: `${userName} changed a member's role to ${activity.metadata.newRole}`,
      project_added: `${userName} added project "${activity.metadata.projectName}"`,
      project_removed: `${userName} removed a project`,
      team_updated: `${userName} updated team settings`,
    };
    return messages[activity.action] || `${userName} performed an action`;
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <div className="text-gray-500">Loading activity...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>

        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, idx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {idx !== activities.length - 1 && (
                    <span
                      className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                        {getActivityIcon(activity.action)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {getActivityMessage(activity)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {getRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

## Backend Integration Examples

### 1. Register Team Routes in Server

```typescript
// apps/cloud/src/server.ts

import teamRoutes from './routes/teams.routes';

// ... existing code ...

app.use('/api/teams', teamRoutes);
```

### 2. WebSocket Integration for Real-Time Updates

```typescript
// apps/cloud/src/services/TeamService.ts

// Add to methods that should trigger real-time updates:

async inviteMember(teamId: string, userId: string, data: InviteMemberData) {
  // ... existing code ...

  const invitation = await prisma.teamInvitation.create({...});

  // Log activity
  await this.logActivity(...);

  // Emit WebSocket event
  const io = global.io; // Assuming io is set up globally
  if (io) {
    io.to(`team-${teamId}`).emit('team:member_invited', {
      teamId,
      invitation: {
        email: invitation.email,
        role: invitation.role,
      },
    });
  }

  return invitation;
}
```

### 3. Team-Aware API Service (Frontend)

```typescript
// apps/web/src/services/teamService.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const teamService = {
  // Teams
  getTeams: async () => {
    const res = await fetch(`${API_BASE}/teams`, { headers: getHeaders() });
    return res.json();
  },

  getTeam: async (teamId: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, { headers: getHeaders() });
    return res.json();
  },

  createTeam: async (data: any) => {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateTeam: async (teamId: string, data: any) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteTeam: async (teamId: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Members
  inviteMember: async (teamId: string, data: { email: string; role: string }) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/invitations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  removeMember: async (teamId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  updateMemberRole: async (teamId: string, userId: string, role: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  // Projects
  getTeamProjects: async (teamId: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/projects`, { headers: getHeaders() });
    return res.json();
  },

  addProjectToTeam: async (teamId: string, projectId: string, accessLevel?: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ projectId, accessLevel }),
    });
    return res.json();
  },

  removeProjectFromTeam: async (teamId: string, projectId: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Activity
  getTeamActivity: async (teamId: string, limit = 50) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/activity?limit=${limit}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Invitations
  acceptInvitation: async (token: string) => {
    const res = await fetch(`${API_BASE}/teams/join/${token}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },
};
```

## Mobile App Components (React Native)

### TeamList Component

```tsx
// apps/mobile/src/components/team/TeamList.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';

export function TeamList({ teams, onTeamPress }) {
  const renderTeam = ({ item: team }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => onTeamPress(team.id)}
    >
      <View style={styles.teamHeader}>
        {team.avatarUrl ? (
          <Image source={{ uri: team.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {team.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamSlug}>@{team.slug}</Text>
        </View>
      </View>

      {team.description && (
        <Text style={styles.description} numberOfLines={2}>
          {team.description}
        </Text>
      )}

      <View style={styles.stats}>
        <Text style={styles.stat}>{team._count.members} members</Text>
        <Text style={styles.stat}>{team._count.projects} projects</Text>
      </View>

      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{team.role}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={teams}
      renderItem={renderTeam}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // ... more styles
});
```

## Testing Examples

### Unit Test for TeamService

```typescript
// apps/cloud/src/services/__tests__/TeamService.test.ts

import { TeamService } from '../TeamService';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

describe('TeamService', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
  });

  describe('createTeam', () => {
    it('should create a team and add owner as first member', async () => {
      const mockTeam = {
        id: '123',
        name: 'Test Team',
        slug: 'test-team',
        ownerId: 'user-1',
      };

      (prisma.team.create as jest.Mock).mockResolvedValue(mockTeam);

      const result = await TeamService.createTeam('user-1', {
        name: 'Test Team',
        slug: 'test-team',
      });

      expect(result).toEqual(mockTeam);
      expect(prisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Team',
            slug: 'test-team',
            ownerId: 'user-1',
          }),
        })
      );
    });
  });
});
```

## Deployment Checklist

- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Update environment variables (if any)
- [ ] Register team routes in server.ts
- [ ] Build and test frontend
- [ ] Test invitation email flow
- [ ] Verify WebSocket events
- [ ] Test role permissions
- [ ] Load test with multiple teams
- [ ] Security audit
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Update documentation

---

**Note**: These are templates. Customize styling, error handling, and features based on your specific requirements.
