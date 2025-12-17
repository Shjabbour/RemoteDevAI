# RemoteDevAI Mobile App Guide

Complete guide for using the RemoteDevAI mobile app on iOS and Android.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
- [Getting Started](#getting-started)
- [Voice Input](#voice-input)
- [Project Management](#project-management)
- [Video Playback](#video-playback)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)

## Overview

The RemoteDevAI mobile app enables voice-first development, allowing you to:
- Write code using voice commands
- Manage projects on-the-go
- Review generated code
- Watch AI-generated development videos
- Collaborate in real-time

### Platform Support

- **iOS**: iOS 14.0 or higher
- **Android**: Android 8.0 (API level 26) or higher

## Installation

### iOS

1. Open the App Store
2. Search for "RemoteDevAI"
3. Tap "Get" to download
4. Open the app once installed

**Alternative**: Download from [remotedevai.com/ios](https://remotedevai.com/ios)

### Android

1. Open Google Play Store
2. Search for "RemoteDevAI"
3. Tap "Install"
4. Open the app once installed

**Alternative**: Download from [remotedevai.com/android](https://remotedevai.com/android)

## Features

### 1. Voice-First Development

Speak naturally to write code:
- "Create a React login component"
- "Add error handling to my API"
- "Debug the authentication issue"
- "Deploy to staging"

### 2. Project Management

- Browse all your projects
- Create new projects from templates
- View project statistics
- Search and filter projects

### 3. Code Preview

- Syntax-highlighted code viewer
- File tree navigation
- Quick edits and annotations
- Share code snippets

### 4. Real-Time Collaboration

- See live updates from team members
- Real-time notifications
- Chat with your team
- Review changes instantly

### 5. AI Agent Monitoring

- Track agent execution progress
- View agent results
- Cancel running tasks
- Review task history

### 6. Video Generation

- Watch AI-generated development videos
- See code being written in real-time
- Understand complex implementations
- Share videos with team

## Getting Started

### First Launch

1. **Sign In**
   - Tap "Get Started"
   - Sign in with email/password
   - Or use OAuth (Google, GitHub, Apple)

2. **Grant Permissions**
   - **Microphone**: Required for voice input
   - **Notifications**: Recommended for real-time updates
   - **Storage**: For offline project caching

3. **Complete Profile**
   - Add your name
   - Optional: Organization name
   - Choose avatar

4. **Explore Tutorial**
   - Interactive walkthrough
   - Try voice commands
   - Create first project

### Main Screen Layout

```
┌──────────────────────────────────┐
│  RemoteDevAI         [Profile]   │ ← Header
├──────────────────────────────────┤
│  [Projects] [Tasks] [Analytics]  │ ← Tabs
├──────────────────────────────────┤
│                                  │
│     Project List / Content       │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
├──────────────────────────────────┤
│     [Microphone Button]          │ ← Voice Input
└──────────────────────────────────┘
```

## Voice Input

### How to Use Voice

1. **Tap the microphone button** at the bottom
2. **Speak your command** clearly
3. **Wait for transcription** (shown in real-time)
4. **Review and confirm** (or tap to edit)
5. **Agent executes** your command

### Voice Command Examples

#### Create New Code

```
"Create a React component for a user profile card with
 avatar, name, bio, and follow button"
```

#### Modify Existing Code

```
"Add input validation to the login form in
 my-app project"
```

#### Debug Issues

```
"Debug the null pointer error in UserList component"
```

#### Generate Tests

```
"Generate unit tests for the authentication service"
```

#### Deploy

```
"Deploy my-web-app project to staging environment"
```

### Voice Tips

- **Be specific**: Include context like project name, file names
- **Speak naturally**: No need for robotic commands
- **Pause briefly**: After each sentence for better recognition
- **Review transcription**: Check accuracy before submitting
- **Use context**: Reference previous commands ("Add that to my last project")

### Supported Languages

- English (US, UK, AU)
- Spanish
- French
- German
- Portuguese
- Japanese
- Korean
- Chinese (Simplified, Traditional)

Change language in: **Settings → Voice → Language**

## Project Management

### View Projects

**Projects Tab** shows all your projects:

- **Grid View**: Visual cards with previews
- **List View**: Detailed list with stats
- **Sort by**: Created date, updated date, name
- **Filter**: Language, framework, status

### Create Project

1. Tap **"+" button** (top right)
2. Choose creation method:
   - **Voice**: Describe your project
   - **Form**: Fill in details manually
   - **Template**: Choose from templates

#### Voice Creation

```
"Create a new React app called my-portfolio
 with routing and Tailwind CSS"
```

#### Manual Creation

Fill in the form:
- **Name**: Project name
- **Description**: Brief description
- **Language**: JavaScript, Python, Go, etc.
- **Framework**: React, Vue, Django, etc.
- **Template**: Blank, Starter, Full-featured

3. Tap **"Create Project"**
4. Wait for initialization
5. Start coding!

### View Project Details

Tap any project to see:

```
┌──────────────────────────────────┐
│  My React App          [••• Menu]│
├──────────────────────────────────┤
│  Status: Active                  │
│  Language: JavaScript            │
│  Framework: React                │
│                                  │
│  Stats:                          │
│  • 42 files                      │
│  • 3,456 lines                   │
│  • 23 commits                    │
│                                  │
│  [Files] [Tasks] [Deploy]        │
├──────────────────────────────────┤
│                                  │
│  File Tree:                      │
│  📁 src                          │
│    📁 components                 │
│      📄 App.jsx                  │
│      📄 Header.jsx               │
│    📁 pages                      │
│    📄 index.js                   │
│  📁 public                       │
│  📄 package.json                 │
│                                  │
└──────────────────────────────────┘
```

### File Operations

#### View File

- Tap file name to open
- Syntax highlighting
- Line numbers
- Scroll and zoom

#### Edit File

- Tap **pencil icon**
- Use keyboard or voice
- Auto-save drafts
- Sync to cloud

#### Share File

- Tap **share icon**
- Copy link
- Share snippet
- Export to PDF

### Project Actions

From the **••• menu**:

- **Edit Settings**: Rename, change visibility
- **Sync**: Force sync with cloud/desktop
- **Deploy**: Deploy to staging/production
- **Archive**: Archive inactive project
- **Delete**: Permanently delete project

## Tasks Management

### View Tasks

**Tasks Tab** shows:
- Running tasks (animated progress)
- Queued tasks (with position)
- Completed tasks (last 24 hours)
- Failed tasks (with error info)

### Task Details

Tap any task to see:

```
┌──────────────────────────────────┐
│  Create Login Component          │
├──────────────────────────────────┤
│  Agent: Code Generation          │
│  Status: Running                 │
│  Progress: 65%                   │
│                                  │
│  [████████████░░░░░] 65%         │
│                                  │
│  Current Step:                   │
│  "Generating form validation..."  │
│                                  │
│  Started: 2:34 PM                │
│  Estimated: 1m 20s remaining     │
│                                  │
│  [Cancel Task]                   │
└──────────────────────────────────┘
```

### Task Actions

- **View Progress**: Live updates
- **View Result**: When completed
- **Retry**: If failed
- **Cancel**: Stop running task
- **View Files**: See generated files

### Task Notifications

Enable push notifications for:
- Task started
- Task completed
- Task failed
- Long-running task (>5 min)

**Settings → Notifications → Task Updates**

## Video Playback

### AI-Generated Videos

Some tasks generate explanatory videos showing:
- Code being written
- Architecture diagrams
- Step-by-step explanations
- Best practices

### Playback Controls

```
┌──────────────────────────────────┐
│                                  │
│         [Video Player]           │
│                                  │
│  Building a React App            │
│                                  │
│  [◄◄]  [▶]  [►►]  [⚙]           │
│  ────────●───────── 2:34 / 5:12  │
│                                  │
│  [Speed] [Quality] [CC] [Share]  │
└──────────────────────────────────┘
```

Features:
- **Play/Pause**: Tap center
- **Seek**: Drag progress bar
- **Speed**: 0.5x, 1x, 1.5x, 2x
- **Quality**: Auto, 720p, 1080p
- **Captions**: Available in multiple languages
- **Fullscreen**: Rotate device
- **Share**: Share video link
- **Download**: Save for offline

### Video Library

Access all videos in:
**Profile → Video Library**

Filter by:
- Project
- Agent type
- Date created
- Duration

## Settings

Access via **Profile → Settings**

### Account

- **Email**: View/change email
- **Password**: Change password
- **Name**: Update display name
- **Organization**: Update org name
- **Avatar**: Upload new avatar
- **Delete Account**: Permanently delete

### Voice

- **Language**: Recognition language
- **Accent**: Accent variant
- **Noise Cancellation**: Reduce background noise
- **Voice Feedback**: Hear confirmation
- **Continuous Listening**: Keep mic active
- **Wake Word**: "Hey RemoteDevAI" (optional)

### Projects

- **Default Language**: For new projects
- **Default Framework**: For new projects
- **Auto-Sync**: Sync projects automatically
- **Sync Frequency**: Every 5s, 10s, 30s, 1m
- **Local Cache**: Cache files locally
- **Cache Size Limit**: Storage limit

### Notifications

- **Push Notifications**: Enable/disable
- **Task Updates**: Notify on task changes
- **Project Updates**: File changes, deploys
- **Team Activity**: Collaborator actions
- **Email Notifications**: Also send via email
- **Sound**: Notification sound
- **Vibration**: Vibrate on notify

### Appearance

- **Theme**: Light, Dark, Auto
- **Accent Color**: Choose accent color
- **Font Size**: Small, Medium, Large
- **Code Font**: Monospace font choice
- **Animations**: Enable/disable animations

### Advanced

- **API Endpoint**: Cloud backend URL
- **Developer Mode**: Extra debugging info
- **Clear Cache**: Clear all cached data
- **Export Data**: Download your data
- **Debug Logs**: View app logs

## Troubleshooting

### Voice Not Working

**Issue**: Microphone not picking up voice

**Solutions**:
1. Check microphone permission in system settings
2. Try different voice language
3. Reduce background noise
4. Restart the app
5. Check internet connection

---

### Sync Issues

**Issue**: Projects not syncing

**Solutions**:
1. Check internet connection
2. Tap "Force Sync" in project menu
3. Clear app cache (Settings → Advanced → Clear Cache)
4. Log out and log back in
5. Reinstall the app

---

### Login Problems

**Issue**: Can't sign in

**Solutions**:
1. Verify email/password
2. Reset password if forgotten
3. Check internet connection
4. Try OAuth login instead
5. Contact support if persists

---

### App Crashes

**Issue**: App crashes or freezes

**Solutions**:
1. Force close and restart
2. Update to latest version
3. Clear cache
4. Free up device storage
5. Reinstall if needed

---

### Video Won't Play

**Issue**: Videos not loading

**Solutions**:
1. Check internet connection
2. Lower quality setting
3. Clear cache
4. Wait and retry (server may be busy)
5. Download for offline viewing

---

### Slow Performance

**Issue**: App is slow or laggy

**Solutions**:
1. Close other apps
2. Free up device storage
3. Disable animations (Settings → Appearance)
4. Reduce sync frequency
5. Clear cache
6. Restart device

---

## Tips & Tricks

### 1. Use Shortcuts

Long-press microphone for:
- Quick project select
- Recent commands
- Favorites

### 2. Offline Mode

Projects are cached locally. Work offline and sync later.

### 3. Voice Macros

Save frequently used commands:
**Settings → Voice → Macros**

Example:
"Deploy latest" → "Deploy my-app to production after running tests"

### 4. Widgets (iOS)

Add home screen widget for:
- Quick voice input
- Recent projects
- Task status

### 5. Share Intents

Share text to RemoteDevAI from other apps to create tasks.

### 6. Siri Shortcuts (iOS)

"Hey Siri, create a component in RemoteDevAI"

### 7. Dark Mode

Auto-switch based on time:
**Settings → Appearance → Theme → Auto**

### 8. Quick Actions

3D Touch / Long-press app icon:
- New Project
- Voice Command
- Recent Project

---

## Keyboard Shortcuts (iPad)

- **⌘ N**: New project
- **⌘ F**: Search
- **⌘ /**: Voice input
- **⌘ R**: Refresh
- **⌘ ,**: Settings
- **⌘ W**: Close current view

---

## Support

### In-App Help

Tap **"?"** icon → Help Center

### Contact

- **Email**: support@remotedevai.com
- **Chat**: In-app live chat
- **Discord**: [discord.gg/remotedevai](https://discord.gg/remotedevai)

### Report Bugs

**Settings → Advanced → Report Bug**

Include:
- Description of issue
- Steps to reproduce
- Screenshots (optional)

---

**Next**: Learn about the [Desktop Agent](DESKTOP-AGENT.md) for local development.
