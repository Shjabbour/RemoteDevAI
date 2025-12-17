# Assets Directory

This directory contains all static assets for the RemoteDevAI mobile app.

## Required Assets

### App Icon
- `icon.png` - 1024x1024px app icon
- `adaptive-icon.png` - 1024x1024px adaptive icon (Android)
- `favicon.png` - 48x48px favicon for web

### Splash Screen
- `splash.png` - 2732x2732px splash screen image

### Notifications
- `notification-icon.png` - 96x96px notification icon (Android)

## Generating Icons

You can use the following tools to generate icons:

1. **Icon Kitchen** - https://icon.kitchen/
2. **App Icon Generator** - https://appicon.co/
3. **Expo Asset Generator** - Built into Expo

## Placeholder Icons

For development, you can use simple placeholder images:

```bash
# Create a simple blue square icon
convert -size 1024x1024 xc:#3b82f6 icon.png
```

Or download free icons from:
- https://www.flaticon.com/
- https://www.iconfinder.com/
- https://iconscout.com/

## Fonts (Optional)

Place custom fonts in `assets/fonts/`:
- `Inter-Regular.ttf`
- `Inter-Bold.ttf`
- `Inter-SemiBold.ttf`

Then load them in your app with `expo-font`.

## Image Guidelines

- Use PNG format for icons and logos
- Use JPEG for photos and screenshots
- Optimize images for mobile (use tools like ImageOptim or TinyPNG)
- Keep total asset size under 10MB for faster downloads
