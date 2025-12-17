# Quick Start Guide

Get the RemoteDevAI mobile app running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

## Step 1: Install Dependencies

```bash
cd apps/mobile
npm install
```

## Step 2: Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3000
```

**Important**: If testing on a physical device, replace `localhost` with your computer's IP address:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:3000
```

## Step 3: Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

## Step 4: Run the App

### Option A: iOS Simulator (Mac only)

Press `i` in the terminal, or:

```bash
npm run ios
```

### Option B: Android Emulator

Press `a` in the terminal, or:

```bash
npm run android
```

### Option C: Physical Device

1. Install Expo Go app from App Store/Play Store
2. Scan the QR code shown in the terminal
3. Wait for the app to load

## Step 5: Test the App

1. **Login Screen**: The app should show the login screen
2. **Create Account**: Tap "Sign Up" to create a test account
3. **Projects**: After login, you'll see the projects screen
4. **Create Project**: Tap the "+" button to create a new project
5. **Chat**: Open a project to start chatting with the AI

## Troubleshooting

### "Cannot connect to server"

- Make sure the backend server is running
- Check that the API URL in `.env` is correct
- If using a physical device, use your computer's IP address, not `localhost`

### "Metro bundler error"

```bash
npx expo start -c
```

### "Module not found"

```bash
rm -rf node_modules
npm install
```

### iOS build errors

```bash
cd ios && pod install && cd ..
```

## Development Tips

### Hot Reload

The app automatically reloads when you save changes to files.

### Debug Menu

- iOS: `Cmd + D`
- Android: `Cmd + M` (Mac) or `Ctrl + M` (Windows/Linux)
- Physical Device: Shake the device

### Console Logs

View logs in the terminal or in Expo DevTools.

### TypeScript Errors

```bash
npm run type-check
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the code in `app/` and `src/` directories
- Customize the UI components in `src/components/`
- Add new features following the existing patterns

## Getting Help

- Check the [Expo documentation](https://docs.expo.dev/)
- Review the [React Native documentation](https://reactnative.dev/)
- Look at existing code for examples

Happy coding!
