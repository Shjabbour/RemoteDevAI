# RemoteDevAI Mobile App

A beautiful, modern React Native mobile app for RemoteDevAI - your AI-powered remote development assistant.

## Features

- Voice-First Interaction: Record voice commands and receive voice responses
- Real-time Chat: Communicate with your desktop AI agent in real-time
- Project Management: Create and manage multiple development projects
- Video Recordings: Access screen recordings from your desktop agent
- Push Notifications: Stay updated on agent status and task completion
- Dark Mode: Beautiful dark theme optimized for mobile
- Smooth Animations: Polished UX with haptic feedback

## Tech Stack

- Expo - React Native framework
- Expo Router - File-based routing
- TypeScript - Type safety
- NativeWind - Tailwind CSS for React Native
- Zustand - State management
- Socket.IO - Real-time communication
- Expo AV - Audio/video playback and recording

## Getting Started

### Installation

1. Install dependencies:
   ```bash
   cd apps/mobile
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm start
   ```

### Running

- iOS Simulator: Press `i` in terminal
- Android Emulator: Press `a` in terminal
- Physical Device: Scan QR code with Expo Go app

## Project Structure

```
apps/mobile/
├── app/                 # Expo Router pages
│   ├── (auth)/         # Auth screens
│   ├── (tabs)/         # Main app tabs
│   ├── _layout.tsx     # Root layout
│   └── index.tsx       # Splash screen
├── src/
│   ├── components/     # UI components
│   ├── services/       # API clients
│   ├── stores/         # State management
│   ├── hooks/          # Custom hooks
│   └── types/          # TypeScript types
└── package.json
```

## License

MIT License
