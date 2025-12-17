# Assets

This directory contains icons and resources for the desktop application.

## Required Icons

### Windows
- `icon.ico` - Main application icon (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
- `icon-connected.ico` - Tray icon when connected
- `icon-disconnected.ico` - Tray icon when disconnected
- `icon-error.ico` - Tray icon when error

### macOS
- `icon.icns` - Main application icon
- `iconTemplate.png` - Tray icon template (16x16, 32x32 for Retina)
- `iconTemplate-connected.png` - Connected state
- `iconTemplate-disconnected.png` - Disconnected state
- `iconTemplate-error.png` - Error state

### Linux
- `icon.png` - Main application icon (512x512, 256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
- `icon-connected.png` - Tray icon when connected (64x64)
- `icon-disconnected.png` - Tray icon when disconnected (64x64)
- `icon-error.png` - Tray icon when error (64x64)

### Status Icons (for menus)
- `status-connected.png` - Small icon for menu items (16x16)
- `status-disconnected.png` - Small icon for menu items (16x16)
- `status-error.png` - Small icon for menu items (16x16)

## Icon Guidelines

### Windows
- Use `.ico` format with multiple sizes embedded
- Include sizes: 16, 32, 48, 64, 128, 256
- Use transparent background
- Follow Windows design guidelines

### macOS
- Use `.icns` format for app icon
- Use template images for tray icons (black/transparent)
- Tray icons should work in both light and dark modes
- Name template icons with `Template` suffix

### Linux
- Use `.png` format
- Provide multiple sizes for better scaling
- Use transparent background
- Follow freedesktop.org icon guidelines

## Creating Icons

You can use tools like:
- **electron-icon-builder** - Generate all icon formats from a single source
- **Photoshop/GIMP** - Manual creation
- **ImageMagick** - Batch conversion
- **iconutil** (macOS) - Convert .iconset to .icns
- **icotool** (Linux) - Create .ico files

### Example: Generate from SVG

```bash
# Install electron-icon-builder
npm install -g electron-icon-builder

# Generate all icons from source
electron-icon-builder --input=./source-icon.svg --output=./
```

## Source Files

Keep source files (SVG, PSD, etc.) in a separate `source/` directory for easy regeneration.
