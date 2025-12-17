# Team Collaboration - Quick Start Guide

Get team collaboration up and running in RemoteDevAI in just a few steps.

## 5-Minute Setup

### Step 1: Database Migration (2 min)

```bash
cd apps/cloud

# Run the migration
npx prisma migrate dev --name add_team_collaboration

# Generate Prisma Client
npx prisma generate
```

### Step 2: Register API Routes (1 min)

Edit `apps/cloud/src/server.ts`:

```typescript
// Add this import at the top
import teamRoutes from './routes/teams.routes';

// Add this route registration (with other routes)
app.use('/api/teams', teamRoutes);
```

### Step 3: Build & Start (2 min)

```bash
# Backend
cd apps/cloud
npm install  # if needed
npm run dev

# Frontend (in another terminal)
cd apps/web
npm install  # if needed
npm run dev
```

### Step 4: Test It Out

1. **Navigate to Teams**: http://localhost:3000/dashboard/team
2. **Create a Team**: Click "Create Team" button
3. **Invite a Member**: Use the invite functionality
4. **Share a Project**: Add an existing project to the team

## API Quick Reference

### Create Team
```bash
curl -X POST http://localhost:3001/api/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team",
    "slug": "my-team",
    "description": "A great team"
  }'
```

### Invite Member
```bash
curl -X POST http://localhost:3001/api/teams/TEAM_ID/invitations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@example.com",
    "role": "MEMBER"
  }'
```

### Add Project to Team
```bash
curl -X POST http://localhost:3001/api/teams/TEAM_ID/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_ID",
    "accessLevel": "ALL_MEMBERS"
  }'
```

## File Checklist

Ensure these files exist:

**Backend:**
- ✅ `apps/cloud/prisma/schema.prisma` - Team models added
- ✅ `apps/cloud/src/services/TeamService.ts` - Created
- ✅ `apps/cloud/src/routes/teams.routes.ts` - Created
- ✅ `apps/cloud/src/middleware/team.middleware.ts` - Created
- ✅ `apps/cloud/src/services/ProjectService.ts` - Updated

**Frontend:**
- ✅ `apps/web/src/app/dashboard/team/page.tsx` - Created
- ⏳ `apps/web/src/components/team/TeamSwitcher.tsx` - To create
- ⏳ `apps/web/src/components/team/MemberList.tsx` - To create
- ⏳ `apps/web/src/components/team/InviteMemberModal.tsx` - To create
- ⏳ `apps/web/src/components/team/ActivityFeed.tsx` - To create

## Common Use Cases

### Use Case 1: Create Team & Invite Members

```typescript
// 1. Create team
const team = await fetch('/api/teams', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Engineering Team',
    slug: 'engineering',
    description: 'Core engineering team'
  })
});

// 2. Invite members
const members = ['alice@company.com', 'bob@company.com'];
for (const email of members) {
  await fetch(`/api/teams/${team.id}/invitations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role: 'MEMBER' })
  });
}
```

### Use Case 2: Share Project with Team

```typescript
// Add project to team
await fetch(`/api/teams/${teamId}/projects`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'my-project-id',
    accessLevel: 'ALL_MEMBERS'
  })
});

// Now all team members can access this project
```

### Use Case 3: Manage Member Roles

```typescript
// Promote member to admin
await fetch(`/api/teams/${teamId}/members/${userId}/role`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'ADMIN' })
});
```

## Role Permissions Quick Reference

| Action | OWNER | ADMIN | MEMBER | VIEWER |
|--------|-------|-------|--------|--------|
| View team | ✅ | ✅ | ✅ | ✅ |
| View members | ✅ | ✅ | ✅ | ✅ |
| View projects | ✅ | ✅ | ✅ | ✅* |
| Create project | ✅ | ✅ | ✅ | ❌ |
| Share project | ✅ | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| Edit team | ✅ | ✅ | ❌ | ❌ |
| Delete team | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |

*Based on project access level

## Troubleshooting

### Problem: Can't create team

**Check:**
1. User is authenticated
2. Slug is unique and valid (lowercase, hyphens only)
3. Database migration completed

**Solution:**
```bash
# Verify migration
npx prisma migrate status

# Check database
psql -d your_db -c "SELECT * FROM \"Team\";"
```

### Problem: Invitation not working

**Check:**
1. Email is valid
2. User has ADMIN or OWNER role
3. No pending invitation exists for that email

**Solution:**
```bash
# Check invitations
psql -d your_db -c "SELECT * FROM \"TeamInvitation\" WHERE \"teamId\" = 'YOUR_TEAM_ID';"
```

### Problem: Can't access team project

**Check:**
1. User is team member
2. Project is added to team
3. Access level matches user role

**Solution:**
```typescript
// Verify membership
const membership = await prisma.teamMember.findFirst({
  where: { teamId: 'TEAM_ID', userId: 'USER_ID' }
});
console.log('Membership:', membership);

// Verify project link
const teamProject = await prisma.teamProject.findFirst({
  where: { teamId: 'TEAM_ID', projectId: 'PROJECT_ID' }
});
console.log('Team Project:', teamProject);
```

## Next Steps

1. **Add Team Switcher**: Implement `TeamSwitcher.tsx` component in your navigation
2. **Create Team Pages**: Build out the member, project, and settings pages
3. **Enable Real-Time**: Add WebSocket events for live collaboration
4. **Customize Permissions**: Adjust role permissions based on your needs
5. **Add Analytics**: Track team usage and activity

## Additional Resources

- 📖 [Full Implementation Guide](./TEAM_COLLABORATION_IMPLEMENTATION.md)
- 🧩 [Component Templates](./TEAM_COMPONENTS_TEMPLATES.md)
- 🔄 [Migration Guide](./TEAM_MIGRATION_GUIDE.md)
- 🌐 [API Documentation](./docs/API.md) (update with team endpoints)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review implementation documentation
3. Check application logs
4. Verify database state

---

**Quick Checklist:**
- [ ] Database migrated
- [ ] Routes registered
- [ ] Server running
- [ ] Frontend running
- [ ] Can create team
- [ ] Can invite member
- [ ] Can share project
- [ ] Can view team activity

**Estimated Setup Time:** 5-10 minutes
**Last Updated:** 2025-12-16
