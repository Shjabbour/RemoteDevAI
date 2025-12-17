# RemoteDevAI Onboarding System

Comprehensive onboarding flow for new users with web and mobile support.

## Overview

This onboarding system guides new users through setting up their RemoteDevAI account with a smooth, interactive experience. It includes:

- ✅ Multi-step onboarding flow (5 steps + completion)
- ✅ Progress tracking and analytics
- ✅ Skip options for experienced users
- ✅ Platform-specific download guides
- ✅ Interactive tutorials
- ✅ Help system with contextual hints
- ✅ Keyboard shortcuts guide
- ✅ Mobile app onboarding

## Architecture

### Backend (Cloud Service)

#### Database Schema Updates

**File:** `apps/cloud/prisma/schema.prisma`

Added onboarding fields to User model:
```prisma
model User {
  // ... existing fields

  // Onboarding
  onboardingCompleted Boolean @default(false)
  onboardingStep      Int     @default(0)
  onboardingSkipped   Boolean @default(false)
  role                String? // developer, team lead, manager, etc.
}
```

**Migration Required:**
```bash
cd apps/cloud
npx prisma migrate dev --name add_onboarding_fields
```

#### Onboarding Service

**File:** `apps/cloud/src/services/OnboardingService.ts`

Features:
- Track onboarding progress
- Complete/skip steps
- Analytics tracking
- Get onboarding statistics (admin)

Methods:
- `getProgress(userId)` - Get user's onboarding state
- `completeStep(userId, payload)` - Mark step as complete
- `skipStep(userId, step)` - Skip optional step
- `skipOnboarding(userId)` - Skip entire onboarding
- `updateOnboarding(userId, payload)` - Update state
- `resetOnboarding(userId)` - Reset for re-onboarding
- `getStatistics(dateFrom, dateTo)` - Admin analytics

#### API Routes

**File:** `apps/cloud/src/routes/onboarding.routes.ts`

Endpoints:
```
GET    /api/onboarding/progress       - Get user progress
GET    /api/onboarding/steps          - Get all steps config
GET    /api/onboarding/steps/:step    - Get specific step
POST   /api/onboarding/complete-step  - Complete a step
POST   /api/onboarding/skip-step      - Skip a step
POST   /api/onboarding/skip           - Skip all onboarding
PATCH  /api/onboarding                - Update onboarding state
POST   /api/onboarding/reset          - Reset onboarding
GET    /api/onboarding/statistics     - Get statistics (admin)
```

**Don't forget to register routes in `apps/cloud/src/server.ts`:**
```typescript
import onboardingRoutes from './routes/onboarding.routes';
app.use('/api/onboarding', onboardingRoutes);
```

### Shared Types

**File:** `packages/shared/src/types/onboarding.ts`

Key types:
- `OnboardingStep` - Step enum (1-6)
- `UserRole` - User role types
- `OnboardingState` - Current state interface
- `OnboardingProgress` - Full progress response
- Step-specific data interfaces

**Don't forget to export in `packages/shared/src/index.ts`:**
```typescript
export * from './types/onboarding';
```

### Web Application

#### Onboarding Pages

**Layout:** `apps/web/src/app/onboarding/layout.tsx`
- Progress bar component
- Gradient background with animations
- Responsive design

**Main redirect:** `apps/web/src/app/onboarding/page.tsx`
- Redirects based on onboarding state
- Loads user metadata from Clerk

**Step 1:** `apps/web/src/app/onboarding/step-1/page.tsx`
- Profile setup
- Avatar upload
- Role selection
- Required fields: name, role

**Step 2:** `apps/web/src/app/onboarding/step-2/page.tsx`
- Download desktop agent
- Platform detection (Windows/Mac/Linux)
- Installation instructions
- Optional (can skip)

**Step 3:** `apps/web/src/app/onboarding/step-3/page.tsx`
- Connect desktop agent
- QR code display
- Manual code entry
- Connection status tracking
- Optional (can skip)

**Step 4:** `apps/web/src/app/onboarding/step-4/page.tsx`
- Create first project
- Project name and type
- GitHub import option
- Required

**Step 5:** `apps/web/src/app/onboarding/step-5/page.tsx`
- Interactive tutorial
- Feature demonstrations
- Pro tips
- Optional (can skip)

**Complete:** `apps/web/src/app/onboarding/complete/page.tsx`
- Success celebration
- Confetti animation
- Summary cards
- Quick tips
- CTA to dashboard

#### Onboarding Components

**ProgressBar:** `apps/web/src/components/onboarding/ProgressBar.tsx`
- Visual progress indicator
- Step labels
- Animated transitions

**StepCard:** `apps/web/src/components/onboarding/StepCard.tsx`
- Consistent layout wrapper
- Step number display
- Estimated time
- Help links

**PlatformDownload:** `apps/web/src/components/onboarding/PlatformDownload.tsx`
- Platform-specific download links
- Architecture selection (x64, ARM, etc.)
- Version information

**QRCodeConnect:** `apps/web/src/components/onboarding/QRCodeConnect.tsx`
- QR code generation (placeholder - needs real QR library)
- Connection code display
- Scan instructions

**InteractiveTour:** `apps/web/src/components/onboarding/InteractiveTour.tsx`
- Video demo placeholder
- Feature highlights

### Mobile Application

#### Onboarding Flow

**Layout:** `apps/mobile/app/onboarding/_layout.tsx`
- Stack navigation
- Slide transitions

**Step 1:** `apps/mobile/app/onboarding/step-1.tsx`
- Profile setup
- Name input
- Role selection

**Step 2:** `apps/mobile/app/onboarding/step-2.tsx`
- Enable notifications
- Permission request
- Benefits explanation

**Step 3:** `apps/mobile/app/onboarding/step-3.tsx`
- Connect to desktop
- Code entry
- Connection instructions

**Step 4:** `apps/mobile/app/onboarding/step-4.tsx`
- Voice input tutorial
- Feature demonstrations
- Test voice input

**Complete:** `apps/mobile/app/onboarding/complete.tsx`
- Success screen
- Feature cards
- Quick tips
- CTA to dashboard

### Help & Support Components

#### Tooltip Component

**File:** `apps/web/src/components/ui/Tooltip.tsx`

Features:
- Hover/focus triggered tooltips
- Multiple positions (top, bottom, left, right)
- Customizable delay
- Portal rendering for correct z-index

Usage:
```tsx
<Tooltip content="This is a helpful tip" position="top">
  <button>Hover me</button>
</Tooltip>
```

#### Hint Component

**File:** `apps/web/src/components/ui/Hint.tsx`

Features:
- First-time user hints
- Dismissible with localStorage
- Auto-show after delay
- Position control

Usage:
```tsx
<Hint
  id="voice-command-hint"
  title="Try Voice Commands!"
  content="Press Cmd+M or click the mic to use voice input"
  position="bottom-right"
  showAfter={2000}
/>
```

#### Help Panel

**File:** `apps/web/src/components/Help.tsx`

Features:
- Contextual help based on current page
- Search functionality
- Common questions FAQs
- Quick links to docs and support
- Fixed floating help button

Usage:
```tsx
// Add to main layout
<Help />
```

#### Keyboard Shortcuts Guide

**File:** `apps/web/src/components/KeyboardShortcuts.tsx`

Features:
- Complete shortcuts reference
- Search shortcuts
- OS detection (Mac/Windows)
- Cmd+K to open
- Custom event support

Usage:
```tsx
// Add to main layout
<KeyboardShortcuts />
```

Categories:
- General (Cmd+K, Cmd+S, etc.)
- Voice & Recording (Cmd+M, Cmd+R)
- Navigation (Cmd+1-4)
- Sessions (Cmd+N, Cmd+E)
- Editor (Cmd+F, Cmd+Z)

## Setup Instructions

### 1. Database Migration

```bash
cd apps/cloud
npx prisma migrate dev --name add_onboarding_fields
npx prisma generate
```

### 2. Register API Routes

Update `apps/cloud/src/server.ts`:
```typescript
import onboardingRoutes from './routes/onboarding.routes';

// ... after other routes
app.use('/api/onboarding', onboardingRoutes);
```

### 3. Update Shared Package

Rebuild the shared package:
```bash
cd packages/shared
npm run build
```

### 4. Install Dependencies (if needed)

For web app:
```bash
cd apps/web
npm install
```

For mobile app:
```bash
cd apps/mobile
npm install
```

### 5. Environment Variables

No new environment variables required, but ensure these exist:
```env
# apps/cloud/.env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=...

# apps/web/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# apps/mobile/.env
EXPO_PUBLIC_API_URL=...
```

## Usage

### Web Onboarding Flow

1. User signs up via Clerk
2. Redirect to `/onboarding`
3. Complete steps 1-5
4. Mark onboarding complete
5. Redirect to `/dashboard`

### Check Onboarding Status

```typescript
// In any component
const { user } = useUser();
const isOnboarded = user?.publicMetadata?.onboardingCompleted;

if (!isOnboarded) {
  router.push('/onboarding');
}
```

### Track Custom Onboarding Events

```typescript
await fetch('/api/onboarding/complete-step', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    step: 1,
    data: {
      // Custom data for analytics
      source: 'mobile',
      features_enabled: ['voice', 'recording'],
    },
  }),
});
```

### Skip Onboarding

```typescript
await fetch('/api/onboarding/skip', {
  method: 'POST',
});
```

## Customization

### Add New Onboarding Step

1. Update `ONBOARDING_STEPS` in `OnboardingService.ts`
2. Create new page in `apps/web/src/app/onboarding/step-X/`
3. Update `STEP_LABELS` in `ProgressBar.tsx`
4. Add mobile equivalent if needed

### Customize Step Content

Each step is self-contained. Edit the respective page file:
- Profile data: `step-1/page.tsx`
- Download links: `PlatformDownload.tsx`
- Tutorial content: `step-5/page.tsx`

### Add Platform-Specific Features

Update `PlatformDownload.tsx` with actual download URLs:
```typescript
const DOWNLOAD_LINKS = {
  windows: {
    x64: 'https://your-cdn.com/RemoteDevAI-Setup-x64.exe',
    // ...
  },
};
```

### Modify Help Content

Update `HELP_CONTENT` in `Help.tsx`:
```typescript
const HELP_CONTENT: Record<string, Array<{ question: string; answer: string }>> = {
  '/your-page': [
    {
      question: 'How do I...?',
      answer: 'You can...',
    },
  ],
};
```

## Analytics & Tracking

### Onboarding Metrics

Get statistics via API:
```typescript
const response = await fetch('/api/onboarding/statistics?dateFrom=2025-01-01');
const stats = await response.json();

// Returns:
// {
//   totalStarted: 1000,
//   totalCompleted: 850,
//   totalAbandoned: 50,
//   stepCompletion: { 1: 950, 2: 900, ... },
//   stepSkipped: { 2: 100, 3: 150, ... },
//   completionRate: 85.0
// }
```

### Events Tracked

- `onboarding_step_completed` - User completes a step
- `onboarding_step_skipped` - User skips an optional step
- `onboarding_abandoned` - User skips entire onboarding

Events are stored in `AnalyticsEvent` table with full metadata.

## Best Practices

### For Onboarding Flow

1. **Keep it short** - 5 steps max, most optional
2. **Show progress** - Always visible progress bar
3. **Allow skipping** - Don't force optional steps
4. **Mobile-friendly** - Responsive design
5. **Track everything** - Analytics for optimization

### For Help System

1. **Contextual hints** - Show hints based on user location
2. **Dismissible** - Users can hide hints permanently
3. **Search functionality** - Easy to find help
4. **Up-to-date** - Keep help content current

### For Keyboard Shortcuts

1. **OS detection** - Show correct keys (Cmd vs Ctrl)
2. **Discoverability** - Mention in help/docs
3. **Consistency** - Follow platform conventions
4. **Visual feedback** - Show when shortcuts are used

## Troubleshooting

### Onboarding doesn't redirect

Check Clerk metadata sync:
```typescript
// Ensure onboarding completion updates Clerk
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    onboardingCompleted: true,
  },
});
```

### Progress bar not updating

Verify step number is passed correctly:
```typescript
// In layout.tsx
const match = pathname?.match(/step-(\d+)/);
if (match) {
  setCurrentStep(parseInt(match[1]));
}
```

### QR code not displaying

Install a QR code library:
```bash
npm install qrcode.react
```

Update `QRCodeConnect.tsx` to use it:
```typescript
import QRCode from 'qrcode.react';

<QRCode value={connectionCode} size={256} />
```

### Help panel conflicts with z-index

Ensure help button and panel have higher z-index:
```tsx
className="z-40"  // Help button
className="z-50"  // Help panel
```

## Future Enhancements

### Planned Features

1. **Interactive Code Playground** - Let users try AI commands
2. **Video Tutorials** - Embedded tutorial videos
3. **Gamification** - Badges for completing steps
4. **Personalization** - Customize flow based on role
5. **A/B Testing** - Test different onboarding flows
6. **Multi-language** - i18n support
7. **Onboarding Templates** - Different flows for different user types
8. **Progress Sync** - Continue onboarding across devices

### Integration Opportunities

1. **Customer.io / Intercom** - Automated email follow-ups
2. **Mixpanel / Amplitude** - Advanced analytics
3. **Pendo / Appcues** - In-app guidance
4. **Zendesk** - Support ticket integration

## API Reference

See full API documentation in `/docs/API.md`

Quick reference:
- All routes require authentication via Clerk
- Use `req.auth.userId` to get current user
- Return format: `{ success: boolean, data?: any, message?: string }`

## Files Created

### Backend
- `apps/cloud/src/services/OnboardingService.ts`
- `apps/cloud/src/routes/onboarding.routes.ts`
- `apps/cloud/prisma/schema.prisma` (updated)

### Shared
- `packages/shared/src/types/onboarding.ts`

### Web App
- `apps/web/src/app/onboarding/layout.tsx`
- `apps/web/src/app/onboarding/page.tsx`
- `apps/web/src/app/onboarding/step-1/page.tsx`
- `apps/web/src/app/onboarding/step-2/page.tsx`
- `apps/web/src/app/onboarding/step-3/page.tsx`
- `apps/web/src/app/onboarding/step-4/page.tsx`
- `apps/web/src/app/onboarding/step-5/page.tsx`
- `apps/web/src/app/onboarding/complete/page.tsx`
- `apps/web/src/components/onboarding/ProgressBar.tsx`
- `apps/web/src/components/onboarding/StepCard.tsx`
- `apps/web/src/components/onboarding/PlatformDownload.tsx`
- `apps/web/src/components/onboarding/QRCodeConnect.tsx`
- `apps/web/src/components/onboarding/InteractiveTour.tsx`
- `apps/web/src/components/ui/Tooltip.tsx`
- `apps/web/src/components/ui/Hint.tsx`
- `apps/web/src/components/Help.tsx`
- `apps/web/src/components/KeyboardShortcuts.tsx`

### Mobile App
- `apps/mobile/app/onboarding/_layout.tsx`
- `apps/mobile/app/onboarding/step-1.tsx`
- `apps/mobile/app/onboarding/step-2.tsx`
- `apps/mobile/app/onboarding/step-3.tsx`
- `apps/mobile/app/onboarding/step-4.tsx`
- `apps/mobile/app/onboarding/complete.tsx`

## Contributing

When adding new onboarding features:

1. Update this documentation
2. Add analytics tracking
3. Test mobile and web flows
4. Update help content
5. Add keyboard shortcuts if applicable

## Support

Questions? Check:
- `/docs/onboarding-guide.md` - Detailed user guide
- `/docs/API.md` - API reference
- GitHub Issues - Bug reports
- Discord - Community support

---

**Built with love for RemoteDevAI** 🚀
