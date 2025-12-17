# Team Collaboration Features - Implementation Guide

## Overview
This document outlines the comprehensive team collaboration features implemented for RemoteDevAI, enabling seamless multi-user collaboration with proper access control and real-time features.

## 1. Database Schema (Prisma)

### Models Added

#### Team
- **Location**: `apps/cloud/prisma/schema.prisma`
- **Purpose**: Represents a team/organization
- **Key Fields**:
  - `id`, `name`, `slug` (unique), `description`, `avatarUrl`
  - `ownerId` - Team owner (User relation)
  - `plan` - SubscriptionTier (FREE, PRO, TEAM, ENTERPRISE)
  - Stripe integration fields for team billing
- **Relations**:
  - `members` - TeamMember[]
  - `projects` - TeamProject[]
  - `invitations` - TeamInvitation[]
  - `activityLogs` - ActivityLog[]

#### TeamMember
- **Purpose**: Team membership with roles
- **Key Fields**:
  - `teamId`, `userId`
  - `role` - TeamRole (OWNER, ADMIN, MEMBER, VIEWER)
  - `joinedAt`, `invitedBy`
- **Unique constraint**: `[teamId, userId]`

#### TeamRole Enum
- **OWNER**: Full access, billing, can delete team
- **ADMIN**: Manage members, all projects
- **MEMBER**: Create/edit own projects, view team projects
- **VIEWER**: Read-only access

#### TeamInvitation
- **Purpose**: Pending team invitations
- **Key Fields**:
  - `email`, `role`, `token` (unique)
  - `status` - InvitationStatus (PENDING, ACCEPTED, EXPIRED, REVOKED)
  - `expiresAt`, `acceptedAt`, `revokedAt`
  - `invitedBy` - User ID who sent invitation

#### TeamProject
- **Purpose**: Links projects to teams
- **Key Fields**:
  - `teamId`, `projectId`
  - `accessLevel` - TeamProjectAccess (ALL_MEMBERS, ADMINS_ONLY, CUSTOM)
- **Unique constraint**: `[teamId, projectId]`

#### ActivityLog
- **Purpose**: Team activity feed
- **Key Fields**:
  - `teamId`, `userId`
  - `action` - member_added, project_created, role_changed, etc.
  - `resource`, `resourceId`, `metadata` (JSON)
  - `createdAt`

## 2. Backend Services

### TeamService
**File**: `apps/cloud/src/services/TeamService.ts`

#### Core Methods:
- `createTeam(ownerId, data)` - Create new team with owner as first member
- `getTeam(teamId, userId)` - Get team details (checks membership)
- `getUserTeams(userId)` - List all teams user belongs to
- `updateTeam(teamId, userId, data)` - Update team (requires OWNER/ADMIN)
- `deleteTeam(teamId, userId)` - Delete team (requires OWNER)

#### Member Management:
- `inviteMember(teamId, userId, {email, role})` - Send invitation (requires OWNER/ADMIN)
- `acceptInvitation(token, userId)` - Accept team invitation
- `revokeInvitation(invitationId, teamId, userId)` - Cancel invitation
- `getTeamInvitations(teamId, userId)` - List pending invitations
- `removeMember(teamId, userId, targetUserId)` - Remove member
- `updateMemberRole(teamId, userId, targetUserId, newRole)` - Change member role

#### Project Management:
- `addProjectToTeam(teamId, userId, projectId, accessLevel)` - Share project with team
- `removeProjectFromTeam(teamId, userId, projectId)` - Unshare project
- `getTeamProjects(teamId, userId)` - List team projects (respects access level)

#### Activity Tracking:
- `getTeamActivity(teamId, userId, limit)` - Get activity feed
- `logActivity(teamId, userId, action, resource, resourceId, metadata)` - Internal logger

#### Access Control:
- `requireRole(teamId, userId, roles?)` - Helper to check membership/role
- Automatic activity logging for all major actions

### Updated ProjectService
**File**: `apps/cloud/src/services/ProjectService.ts`

#### Enhanced Methods:
- `getProjects(userId, options)` - Now includes `includeTeamProjects` and `teamId` options
  - Returns both owned and team projects
  - Respects team access levels
  - Includes team context (`teamId`, `teamName`, `isTeamProject`)

- `getProject(projectId, userId)` - Now checks team access
  - Includes `teamProjects` relation
  - Validates access through ownership OR team membership

- `checkProjectAccess(projectId, userId)` - New helper method
  - Returns boolean indicating if user can access project
  - Checks both ownership and team membership
  - Respects access levels (ALL_MEMBERS, ADMINS_ONLY)

## 3. API Routes

### Team Routes
**File**: `apps/cloud/src/routes/teams.routes.ts`

All routes require authentication via `authenticate` middleware.

#### Team Management:
- `POST /api/teams` - Create team
- `GET /api/teams` - List user's teams
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

#### Member Management:
- `POST /api/teams/:id/invitations` - Invite member
- `GET /api/teams/:id/invitations` - List invitations
- `DELETE /api/teams/:id/invitations/:invitationId` - Revoke invitation
- `POST /api/teams/join/:token` - Accept invitation
- `DELETE /api/teams/:id/members/:userId` - Remove member
- `PUT /api/teams/:id/members/:userId/role` - Update member role

#### Project Management:
- `GET /api/teams/:id/projects` - List team projects
- `POST /api/teams/:id/projects` - Add project to team
- `DELETE /api/teams/:id/projects/:projectId` - Remove project from team

#### Activity:
- `GET /api/teams/:id/activity` - Get team activity log

#### Validation Schemas (Zod):
All routes use Zod schemas for request validation:
- `createTeamSchema` - name, slug (regex), description, avatarUrl
- `updateTeamSchema` - optional fields
- `inviteMemberSchema` - email, TeamRole
- `updateRoleSchema` - role
- `addProjectSchema` - projectId, optional accessLevel

## 4. Middleware

### Team Middleware
**File**: `apps/cloud/src/middleware/team.middleware.ts`

#### Exports:
- `requireTeamMembership` - Verifies user is a team member
- `requireTeamRole(...roles)` - Requires specific role(s)
- `requireTeamOwner` - Shortcut for OWNER role
- `requireTeamAdmin` - Shortcut for OWNER or ADMIN
- `checkProjectTeamAccess` - Verifies project access through team

#### TeamAuthRequest Interface:
Extends `AuthRequest` with:
```typescript
team?: {
  id: string;
  role: TeamRole;
}
```

## 5. Frontend (Web App)

### Team Dashboard Pages
**Base Path**: `apps/web/src/app/dashboard/team/`

#### Main Team List Page
**File**: `apps/web/src/app/dashboard/team/page.tsx`

**Features**:
- Lists all teams user belongs to
- Shows team avatar, name, slug, description
- Displays member count, project count
- Shows user's role badge
- "Create Team" modal with:
  - Team name input
  - Auto-generated slug (editable)
  - Description textarea
  - Form validation

**Component Structure**:
- `TeamOverviewPage` - Main component
- `CreateTeamModal` - Team creation form

### Additional Pages to Create

#### Team Details Page
**File**: `apps/web/src/app/dashboard/team/[id]/page.tsx`
```typescript
// Features:
// - Team header with avatar, name, description
// - Quick stats (members, projects, activity)
// - Recent activity feed
// - Quick actions (settings, invite, etc.)
```

#### Members Page
**File**: `apps/web/src/app/dashboard/team/[id]/members/page.tsx`
```typescript
// Features:
// - Member list with avatars, names, emails
// - Role badges
// - Last seen timestamps
// - Role management dropdown (for OWNER/ADMIN)
// - Remove member button
// - Invite member button
// - Pending invitations list
```

#### Projects Page
**File**: `apps/web/src/app/dashboard/team/[id]/projects/page.tsx`
```typescript
// Features:
// - Team project cards
// - Project owner info
// - Session counts
// - Access level indicators
// - Add project modal
// - Remove from team button (for ADMIN/OWNER)
```

#### Settings Page
**File**: `apps/web/src/app/dashboard/team/[id]/settings/page.tsx`
```typescript
// Features:
// - Team name, slug, description editing
// - Avatar upload
// - Danger zone (delete team)
// - Only accessible to OWNER/ADMIN
```

#### Billing Page
**File**: `apps/web/src/app/dashboard/team/[id]/billing/page.tsx`
```typescript
// Features:
// - Team subscription details
// - Per-seat pricing
// - Usage tracking per member
// - Payment method management
// - Billing history
// - Only accessible to OWNER
```

### Team Components to Create

#### TeamSwitcher
**File**: `apps/web/src/components/team/TeamSwitcher.tsx`
```typescript
// Dropdown component to switch between:
// - Personal workspace
// - Team workspaces
// Shows in top navigation
// Updates current context
```

#### MemberList
**File**: `apps/web/src/components/team/MemberList.tsx`
```typescript
// Reusable member list component
// - Avatar grid or list view
// - Role badges
// - Online indicators
// - Click to view profile
```

#### InviteMemberModal
**File**: `apps/web/src/components/team/InviteMemberModal.tsx`
```typescript
// Modal for inviting members
// - Email input (multiple)
// - Role selector dropdown
// - Send invitation button
// - Shows invitation link
```

#### RoleSelector
**File**: `apps/web/src/components/team/RoleSelector.tsx`
```typescript
// Dropdown for selecting member role
// - OWNER (disabled - can't assign)
// - ADMIN
// - MEMBER
// - VIEWER
// Shows role descriptions on hover
```

#### TeamAvatar
**File**: `apps/web/src/components/team/TeamAvatar.tsx`
```typescript
// Team avatar component
// - Shows uploaded image or initials
// - Configurable size
// - Click to upload (if has permission)
```

#### ActivityFeed
**File**: `apps/web/src/components/team/ActivityFeed.tsx`
```typescript
// Team activity feed component
// - Chronological list of activities
// - User avatars
// - Action descriptions
// - Resource links
// - Timestamps (relative)
// - Load more pagination
// - Real-time updates via WebSocket
```

## 6. Mobile App Features

### Team Components (React Native)
**Base Path**: `apps/mobile/src/components/team/`

#### TeamList.tsx
```typescript
// Mobile-optimized team list
// - Swipeable cards
// - Pull to refresh
// - Team switcher in header
```

#### TeamMemberList.tsx
```typescript
// Mobile member list
// - Simplified layout
// - Call/email actions
// - Role badges
```

#### TeamProjectList.tsx
```typescript
// Mobile team projects view
// - Project cards
// - Quick access to sessions
```

## 7. Real-Time Collaboration

### WebSocket Events
**Implementation**: Extend existing Socket.IO setup

#### Events to Emit (Server):
- `team:member_joined` - When member accepts invitation
- `team:member_left` - When member leaves/removed
- `team:role_changed` - When member role updated
- `team:project_added` - When project shared with team
- `team:project_removed` - When project unshared
- `team:activity` - New activity log entry

#### Presence Tracking:
- Track online team members
- Show who's viewing a project
- Real-time member status updates

#### Example Implementation:
```typescript
// In TeamService
await this.logActivity(...);
const io = req.app.get('io');
io.to(`team-${teamId}`).emit('team:activity', {
  teamId,
  activity: {...}
});
```

## 8. Permission System

### Role Hierarchy:
1. **OWNER**
   - All ADMIN permissions
   - Manage billing
   - Delete team
   - Transfer ownership (future)

2. **ADMIN**
   - All MEMBER permissions
   - Manage members (invite, remove, change roles)
   - Manage all team projects
   - View team settings

3. **MEMBER**
   - All VIEWER permissions
   - Create projects
   - Share own projects with team
   - Edit own projects

4. **VIEWER**
   - View team projects (based on access level)
   - View team members
   - View team activity

### Project Access Levels:
- **ALL_MEMBERS**: All team members can access
- **ADMINS_ONLY**: Only admins and owner
- **CUSTOM**: Future - granular per-member permissions

## 9. Migration & Deployment

### Database Migration:
```bash
cd apps/cloud
npx prisma migrate dev --name add_team_collaboration
npx prisma generate
```

### Environment Variables:
No new environment variables required. Uses existing Prisma and authentication setup.

### Registering Routes:
In `apps/cloud/src/server.ts`:
```typescript
import teamRoutes from './routes/teams.routes';

app.use('/api/teams', teamRoutes);
```

### Frontend API Client:
Create `apps/web/src/services/teamService.ts`:
```typescript
export const teamService = {
  getTeams: () => api.get('/teams'),
  getTeam: (id) => api.get(`/teams/${id}`),
  createTeam: (data) => api.post('/teams', data),
  updateTeam: (id, data) => api.put(`/teams/${id}`, data),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  // ... other methods
};
```

## 10. Testing Checklist

### Unit Tests:
- [ ] TeamService methods
- [ ] ProjectService team access methods
- [ ] Middleware permission checks

### Integration Tests:
- [ ] Team creation flow
- [ ] Member invitation flow
- [ ] Project sharing flow
- [ ] Role changes
- [ ] Access control enforcement

### E2E Tests:
- [ ] Create team and invite member
- [ ] Share project with team
- [ ] Remove member
- [ ] Delete team

## 11. Security Considerations

### Implemented:
- ✅ Role-based access control
- ✅ Token-based invitations with expiry
- ✅ Ownership verification on all mutations
- ✅ Team membership verification
- ✅ Cascade deletes (Prisma schema)
- ✅ Activity logging for audit trail

### Recommendations:
- Add rate limiting on invitation endpoints
- Implement webhook signature verification for Stripe
- Add CSRF protection
- Implement 2FA for team owners
- Add IP whitelist option for enterprise teams

## 12. Future Enhancements

### Planned Features:
1. **Custom project permissions** - Per-member access control
2. **Team templates** - Pre-configured team structures
3. **Guest access** - Limited time access for external collaborators
4. **Team analytics** - Usage dashboards per team
5. **Slack/Discord integration** - Activity notifications
6. **Live cursors** - See who's editing what in real-time
7. **Team file storage** - Shared resources
8. **SSO/SAML** - Enterprise authentication
9. **Audit log export** - Compliance features
10. **Team API keys** - Shared API access

## 13. Documentation

### User Documentation:
Create docs/user/TEAMS.md with:
- How to create a team
- Inviting members
- Managing permissions
- Sharing projects
- Best practices

### API Documentation:
Update docs/API.md with:
- All team endpoints
- Request/response examples
- Error codes
- Rate limits

## 14. Summary

### Files Created:
1. `apps/cloud/prisma/schema.prisma` - Updated with team models
2. `apps/cloud/src/services/TeamService.ts` - Team management logic
3. `apps/cloud/src/routes/teams.routes.ts` - Team API endpoints
4. `apps/cloud/src/middleware/team.middleware.ts` - Team authorization
5. `apps/cloud/src/services/ProjectService.ts` - Updated with team support
6. `apps/web/src/app/dashboard/team/page.tsx` - Team overview UI

### Files to Create:
- Additional frontend pages (members, projects, settings, billing)
- Team UI components (switcher, invite modal, activity feed, etc.)
- Mobile app components
- API service clients
- Tests

### Next Steps:
1. Run database migration
2. Register team routes in server.ts
3. Create remaining frontend pages
4. Implement WebSocket events
5. Add team switcher to navigation
6. Test invitation flow end-to-end
7. Update user documentation
8. Deploy to staging for testing

---

**Implementation Status**: Core backend features complete. Frontend foundation started. Ready for testing and iteration.
