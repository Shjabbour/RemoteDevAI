#!/bin/bash

# Notification System Setup Script
# This script helps set up the notification system for RemoteDevAI

set -e

echo "================================================"
echo "RemoteDevAI Notification System Setup"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the root of the RemoteDevAI project${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Database Migration${NC}"
echo "Running Prisma migrations..."
cd apps/cloud
npx prisma migrate dev --name add_notifications
npx prisma generate
cd ../..
echo -e "${GREEN}✓ Database migration complete${NC}"
echo ""

echo -e "${YELLOW}Step 2: Install Dependencies${NC}"
echo "Installing required packages..."

# Cloud dependencies
echo "Installing cloud dependencies..."
cd apps/cloud
npm install web-push expo-server-sdk node-cron
cd ../..

# Web dependencies
echo "Installing web dependencies..."
cd apps/web
npm install date-fns
cd ../..

# Mobile dependencies
echo "Installing mobile dependencies..."
cd apps/mobile
npx expo install expo-notifications
cd ../..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Generate VAPID Keys${NC}"
echo "Generating VAPID keys for Web Push..."
cd apps/cloud
VAPID_OUTPUT=$(npx web-push generate-vapid-keys)
echo ""
echo "$VAPID_OUTPUT"
echo ""
echo -e "${YELLOW}Add these to your .env file:${NC}"
echo "$VAPID_OUTPUT" | sed 's/Public Key/VAPID_PUBLIC_KEY/' | sed 's/Private Key/VAPID_PRIVATE_KEY/'
echo "VAPID_SUBJECT=mailto:admin@remotedevai.com"
cd ../..
echo ""

echo -e "${YELLOW}Step 4: Create Service Worker${NC}"
if [ ! -f "apps/web/public/sw.js" ]; then
    echo "Creating service worker..."
    cat > apps/web/public/sw.js << 'EOF'
self.addEventListener('push', (event) => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/notification-icon.png',
      badge: data.badge || '/icons/badge-icon.png',
      data: data.data,
      silent: data.silent,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
EOF
    echo -e "${GREEN}✓ Service worker created${NC}"
else
    echo -e "${YELLOW}Service worker already exists, skipping${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Update Server Configuration${NC}"
echo "Please manually add the following to apps/cloud/src/server.ts:"
echo ""
echo -e "${YELLOW}"
cat << 'EOF'
import notificationRoutes from './routes/notifications.routes';
import { NotificationDispatcher } from './services/NotificationDispatcher';

// Add after other route registrations
app.use('/api/notifications', notificationRoutes);

// Initialize NotificationDispatcher with Socket.IO
NotificationDispatcher.initialize(io);

// Update socket connection handler
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;

  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected to notifications`);
  }

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
});
EOF
echo -e "${NC}"
echo ""

echo -e "${YELLOW}Step 6: Add Notification Center to Layout${NC}"
echo "Please manually add NotificationCenter to your web app layout:"
echo ""
echo -e "${YELLOW}"
cat << 'EOF'
import { NotificationCenter } from '@/components/NotificationCenter';
import { useSocket } from '@/hooks/useSocket';

function DashboardLayout() {
  const { socket } = useSocket(token);

  return (
    <nav>
      {/* Other nav items */}
      <NotificationCenter socket={socket} />
    </nav>
  );
}
EOF
echo -e "${NC}"
echo ""

echo -e "${YELLOW}Step 7: Set Up Cron Jobs (Optional)${NC}"
echo "For email digests, add cron jobs to your server:"
echo ""
echo -e "${YELLOW}"
cat << 'EOF'
import cron from 'node-cron';
import { NotificationDispatcher } from './services/NotificationDispatcher';

// Hourly digest (every hour)
cron.schedule('0 * * * *', async () => {
  await NotificationDispatcher.sendDigestEmails('HOURLY');
});

// Daily digest (9 AM every day)
cron.schedule('0 9 * * *', async () => {
  await NotificationDispatcher.sendDigestEmails('DAILY');
});

// Weekly digest (9 AM every Monday)
cron.schedule('0 9 * * 1', async () => {
  await NotificationDispatcher.sendDigestEmails('WEEKLY');
});

// Cleanup expired notifications (2 AM daily)
cron.schedule('0 2 * * *', async () => {
  const count = await NotificationDispatcher.cleanupExpiredNotifications();
  console.log(`Cleaned up ${count} expired notifications`);
});
EOF
echo -e "${NC}"
echo ""

echo "================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Add VAPID keys to your .env file"
echo "2. Update server.ts with notification routes and Socket.IO integration"
echo "3. Add NotificationCenter to your web app layout"
echo "4. (Optional) Set up cron jobs for email digests"
echo "5. Run: npm run dev"
echo "6. Test notifications at: /dashboard/settings/notifications"
echo ""
echo "Documentation:"
echo "- Setup Guide: docs/NOTIFICATIONS_SETUP.md"
echo "- Implementation Guide: docs/NOTIFICATION_IMPLEMENTATION_GUIDE.md"
echo "- System README: NOTIFICATION_SYSTEM_README.md"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
