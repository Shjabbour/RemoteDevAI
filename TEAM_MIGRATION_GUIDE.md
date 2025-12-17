# Team Collaboration - Database Migration Guide

## Prerequisites

- PostgreSQL database running
- Prisma CLI installed
- Backup of existing database

## Migration Steps

### 1. Backup Current Database

```bash
# Create a backup before migration
pg_dump -U your_username -d remotedevai > backup_$(date +%Y%m%d_%H%M%S).sql

# Or if using Docker
docker exec your_postgres_container pg_dump -U postgres remotedevai > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Review Schema Changes

The following models have been added/modified:

#### New Models:
- `Team`
- `TeamMember`
- `TeamInvitation`
- `TeamProject`
- `ActivityLog`

#### Modified Models:
- `User` - Added team relations:
  - `ownedTeams Team[]`
  - `teamMemberships TeamMember[]`
  - `activityLogs ActivityLog[]`

- `Project` - Added team relation:
  - `teamProjects TeamProject[]`

#### New Enums:
- `TeamRole` (OWNER, ADMIN, MEMBER, VIEWER)
- `InvitationStatus` (PENDING, ACCEPTED, EXPIRED, REVOKED)
- `TeamProjectAccess` (ALL_MEMBERS, ADMINS_ONLY, CUSTOM)

#### Updated Enums:
- `SubscriptionTier` - Added `TEAM` tier

### 3. Create Migration

```bash
cd apps/cloud

# Generate migration
npx prisma migrate dev --name add_team_collaboration

# This will:
# 1. Create a new migration file
# 2. Apply the migration to your database
# 3. Generate new Prisma Client
```

### 4. Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View generated migration SQL
cat prisma/migrations/[timestamp]_add_team_collaboration/migration.sql
```

### 5. Generate Prisma Client

```bash
# Generate updated Prisma Client with team types
npx prisma generate
```

### 6. Test Database Connection

```bash
# Test database connection
npx prisma db execute --stdin < /dev/null
```

## Migration SQL Preview

The migration will create the following tables:

```sql
-- Team table
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "plan" "SubscriptionTier" NOT NULL DEFAULT 'PRO',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- TeamMember table
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- TeamInvitation table
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- TeamProject table
CREATE TABLE "TeamProject" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "accessLevel" "TeamProjectAccess" NOT NULL DEFAULT 'ALL_MEMBERS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamProject_pkey" PRIMARY KEY ("id")
);

-- ActivityLog table
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE UNIQUE INDEX "Team_stripeCustomerId_key" ON "Team"("stripeCustomerId");
CREATE UNIQUE INDEX "Team_stripeSubscriptionId_key" ON "Team"("stripeSubscriptionId");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "TeamInvitation_token_key" ON "TeamInvitation"("token");
CREATE UNIQUE INDEX "TeamProject_teamId_projectId_key" ON "TeamProject"("teamId", "projectId");

-- Indexes
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");
CREATE INDEX "Team_slug_idx" ON "Team"("slug");
CREATE INDEX "Team_createdAt_idx" ON "Team"("createdAt");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX "TeamMember_role_idx" ON "TeamMember"("role");
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");
CREATE INDEX "TeamInvitation_email_idx" ON "TeamInvitation"("email");
CREATE INDEX "TeamInvitation_token_idx" ON "TeamInvitation"("token");
CREATE INDEX "TeamInvitation_status_idx" ON "TeamInvitation"("status");
CREATE INDEX "TeamInvitation_expiresAt_idx" ON "TeamInvitation"("expiresAt");
CREATE INDEX "TeamProject_teamId_idx" ON "TeamProject"("teamId");
CREATE INDEX "TeamProject_projectId_idx" ON "TeamProject"("projectId");
CREATE INDEX "ActivityLog_teamId_createdAt_idx" ON "ActivityLog"("teamId", "createdAt");
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- Foreign keys
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamProject" ADD CONSTRAINT "TeamProject_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamProject" ADD CONSTRAINT "TeamProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enums
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "TeamProjectAccess" AS ENUM ('ALL_MEMBERS', 'ADMINS_ONLY', 'CUSTOM');

-- Update SubscriptionTier enum
ALTER TYPE "SubscriptionTier" ADD VALUE 'TEAM';
```

## Rollback Plan

If something goes wrong, you can rollback:

```bash
# Reset database to last migration
npx prisma migrate reset

# Or restore from backup
psql -U your_username -d remotedevai < backup_file.sql
```

## Post-Migration Verification

### 1. Verify Tables Created

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Team', 'TeamMember', 'TeamInvitation', 'TeamProject', 'ActivityLog');
```

### 2. Verify Indexes

```sql
-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('Team', 'TeamMember', 'TeamInvitation', 'TeamProject', 'ActivityLog');
```

### 3. Verify Foreign Keys

```sql
-- Check foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('Team', 'TeamMember', 'TeamInvitation', 'TeamProject', 'ActivityLog');
```

### 4. Test Data Insertion

```sql
-- Test creating a team (will be done via API, but you can test manually)
INSERT INTO "Team" (id, name, slug, "ownerId", plan, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'Test Team',
    'test-team',
    (SELECT id FROM "User" LIMIT 1),
    'TEAM',
    NOW(),
    NOW()
);

-- Verify insertion
SELECT * FROM "Team" WHERE slug = 'test-team';

-- Clean up test data
DELETE FROM "Team" WHERE slug = 'test-team';
```

## Production Migration

For production deployment:

```bash
# 1. Set production database URL
export DATABASE_URL="postgresql://user:password@host:5432/dbname"

# 2. Deploy migration (without creating new migration)
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Restart application servers
pm2 restart all  # or your process manager

# 5. Verify application health
curl https://your-api.com/health
```

## Monitoring

After migration, monitor for:

1. **Application Errors**
   - Check logs for Prisma-related errors
   - Monitor API error rates

2. **Database Performance**
   - Query execution times
   - Index usage
   - Table sizes

3. **User Experience**
   - Team creation success rate
   - Invitation acceptance rate
   - Project sharing functionality

## Common Issues & Solutions

### Issue: Migration fails with "type already exists"

```bash
# Solution: The enum may have been created in a previous attempt
# Drop the enum and retry
psql -d your_database -c "DROP TYPE IF EXISTS \"TeamRole\" CASCADE;"
npx prisma migrate dev
```

### Issue: Foreign key constraint fails

```bash
# Solution: Ensure all referenced tables exist
# Check User and Project tables have the required columns
psql -d your_database -c "SELECT id FROM \"User\" LIMIT 1;"
psql -d your_database -c "SELECT id FROM \"Project\" LIMIT 1;"
```

### Issue: Prisma Client generation fails

```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install
npx prisma generate
```

## Data Seeding (Optional)

If you want to seed some test teams:

```typescript
// prisma/seed-teams.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get first user
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log('No users found. Create a user first.');
    return;
  }

  // Create demo team
  const team = await prisma.team.create({
    data: {
      name: 'Demo Team',
      slug: 'demo-team',
      description: 'A demo team for testing',
      ownerId: user.id,
      plan: 'TEAM',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log('Created demo team:', team);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seeding:
```bash
npx ts-node prisma/seed-teams.ts
```

## Success Criteria

Migration is successful when:

- [ ] All tables created without errors
- [ ] All indexes created
- [ ] Foreign key constraints established
- [ ] Enums created/updated
- [ ] Prisma Client generated successfully
- [ ] Application starts without errors
- [ ] Can create a team via API
- [ ] Can invite a member
- [ ] Can add project to team
- [ ] Activity logs are created
- [ ] No existing data lost

## Support

If you encounter issues:

1. Check Prisma documentation: https://www.prisma.io/docs
2. Review error logs carefully
3. Restore from backup if needed
4. Contact development team

---

**Last Updated**: 2025-12-16
**Migration Version**: 1.0.0
**Estimated Duration**: 5-10 minutes
