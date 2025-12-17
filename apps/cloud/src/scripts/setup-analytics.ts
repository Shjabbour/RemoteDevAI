/**
 * Setup Analytics Script
 *
 * This script:
 * 1. Creates default user preferences for existing users
 * 2. Initializes user stats for existing users
 * 3. Validates the analytics setup
 *
 * Run with: npx tsx src/scripts/setup-analytics.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupAnalytics() {
  console.log('Starting analytics setup...\n');

  try {
    // 1. Get all users without preferences
    console.log('1. Creating default user preferences...');
    const usersWithoutPrefs = await prisma.user.findMany({
      where: {
        preferences: null,
      },
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`Found ${usersWithoutPrefs.length} users without preferences`);

    for (const user of usersWithoutPrefs) {
      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          analyticsEnabled: true,
          trackingEnabled: true,
          errorReportingEnabled: true,
          anonymizeData: false,
          shareUsageData: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      });
      console.log(`  Created preferences for user: ${user.email}`);
    }

    // 2. Initialize user stats for users without stats
    console.log('\n2. Initializing user stats...');
    const usersWithoutStats = await prisma.user.findMany({
      where: {
        userStats: null,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`Found ${usersWithoutStats.length} users without stats`);

    for (const user of usersWithoutStats) {
      // Get user's actual stats from database
      const [projectCount, sessionCount] = await Promise.all([
        prisma.project.count({
          where: { userId: user.id },
        }),
        prisma.session.count({
          where: { userId: user.id },
        }),
      ]);

      await prisma.userStats.create({
        data: {
          userId: user.id,
          totalProjects: projectCount,
          totalSessions: sessionCount,
          totalLogins: 0,
          totalApiRequests: 0,
          totalSessionTime: 0,
          avgSessionTime: 0,
          totalStorageUsed: BigInt(0),
          activeDays: 0,
          recordingsCreated: 0,
          agentsConnected: 0,
        },
      });
      console.log(`  Created stats for user: ${user.email}`);
    }

    // 3. Validate setup
    console.log('\n3. Validating setup...');

    const [
      totalUsers,
      usersWithPrefs,
      usersWithStats,
      totalAnalyticsEvents,
      totalDailyStats,
      totalErrorLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userPreferences.count(),
      prisma.userStats.count(),
      prisma.analyticsEvent.count(),
      prisma.dailyStats.count(),
      prisma.errorLog.count(),
    ]);

    console.log('\nSetup Summary:');
    console.log('━'.repeat(50));
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Users with Preferences: ${usersWithPrefs}`);
    console.log(`Users with Stats: ${usersWithStats}`);
    console.log(`Analytics Events: ${totalAnalyticsEvents}`);
    console.log(`Daily Stats Records: ${totalDailyStats}`);
    console.log(`Error Logs: ${totalErrorLogs}`);
    console.log('━'.repeat(50));

    if (usersWithPrefs !== totalUsers) {
      console.warn('\n⚠️  Warning: Not all users have preferences!');
    }

    if (usersWithStats !== totalUsers) {
      console.warn('\n⚠️  Warning: Not all users have stats!');
    }

    console.log('\n✅ Analytics setup completed successfully!');

    // 4. Show next steps
    console.log('\nNext Steps:');
    console.log('1. Start the monitoring stack:');
    console.log('   cd infra/monitoring && docker-compose -f docker-compose.monitoring.yml up -d');
    console.log('\n2. Verify metrics endpoint:');
    console.log('   curl http://localhost:3000/metrics');
    console.log('\n3. Access Grafana:');
    console.log('   http://localhost:3001 (admin/admin)');
    console.log('\n4. Access Prometheus:');
    console.log('   http://localhost:9090');
    console.log('\n5. Test analytics endpoints:');
    console.log('   curl http://localhost:3000/api/analytics/overview');
  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setupAnalytics();
