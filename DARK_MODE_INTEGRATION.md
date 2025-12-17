# Dark Mode Integration Guide

Quick reference for integrating the dark mode system into your components.

## Web App Integration

### 1. Using Theme in Components

```tsx
'use client'

import { useTheme } from 'next-themes'

export function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg">
      <h1 className="text-slate-900 dark:text-white">
        Current theme: {theme}
      </h1>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="px-4 py-2 bg-primary-500 dark:bg-primary-600 text-white rounded"
      >
        Toggle Theme
      </button>
    </div>
  )
}
```

### 2. Adding Theme Toggle to Any Page

```tsx
import { ThemeToggleSimple } from '@/components/ThemeToggle'

export default function MyPage() {
  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <h1>My Page</h1>
        <ThemeToggleSimple />
      </header>
    </div>
  )
}
```

### 3. Common Dark Mode Patterns

**Text:**
```tsx
<p className="text-slate-600 dark:text-slate-400">
  Body text with proper contrast
</p>

<h1 className="text-slate-900 dark:text-white">
  Heading text
</h1>
```

**Backgrounds:**
```tsx
<div className="bg-white dark:bg-slate-800">
  Card background
</div>

<section className="bg-slate-50 dark:bg-slate-900">
  Section background
</section>
```

**Borders:**
```tsx
<div className="border border-slate-200 dark:border-slate-700">
  Bordered element
</div>
```

**Shadows:**
```tsx
<div className="shadow-lg dark:shadow-xl dark:shadow-black/50">
  Card with adjusted shadow
</div>
```

**Gradients:**
```tsx
<div className="bg-gradient-to-r from-blue-500 to-purple-500
                dark:from-blue-600 dark:to-purple-600">
  Gradient background
</div>
```

---

## Mobile App Integration

### 1. Using Theme Hook

```tsx
import { useTheme } from '@/theme'
import { View, Text, StyleSheet } from 'react-native'

export function MyComponent() {
  const { isDark, colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text.primary }]}>
        Hello World
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
})
```

### 2. Using NativeWind (Tailwind)

```tsx
import { View, Text } from 'react-native'

export function MyComponent() {
  return (
    <View className="bg-white dark:bg-slate-900 p-4">
      <Text className="text-slate-900 dark:text-white text-lg">
        Hello World
      </Text>
    </View>
  )
}
```

### 3. Theme Settings Component

```tsx
import { useSettingsStore } from '@/stores/settingsStore'
import { View, Text, TouchableOpacity } from 'react-native'

export function ThemeSettings() {
  const { theme, setTheme } = useSettingsStore()

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ]

  return (
    <View>
      {themes.map(({ value, label }) => (
        <TouchableOpacity
          key={value}
          onPress={() => setTheme(value)}
          className={`p-4 ${theme === value ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-800'}`}
        >
          <Text className="text-white">{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

---

## Desktop App Integration

### 1. Main Process Setup

In `apps/desktop/src/main/main.ts`:

```typescript
import { ThemeService } from '../services/ThemeService'

// Initialize theme service
const themeService = new ThemeService()

// After creating window
function createWindow() {
  const mainWindow = new BrowserWindow({
    // ... window config
  })

  // Register window for theme updates
  themeService.registerWindow(mainWindow)

  return mainWindow
}
```

### 2. IPC Handlers

In `apps/desktop/src/main/ipc.ts`:

```typescript
import { ipcMain } from 'electron'

// Get theme
ipcMain.handle('get-theme', () => {
  return themeService.getThemeData()
})

// Set theme
ipcMain.handle('set-theme', (_event, theme) => {
  themeService.setTheme(theme)
  return themeService.getThemeData()
})
```

### 3. Renderer Process

In your renderer HTML/JS:

```typescript
import { initThemeListener } from './renderer/theme'

// Initialize theme
const cleanup = initThemeListener((themeData) => {
  console.log('Theme changed:', themeData)
  // Update your UI based on themeData.isDark
})

// Change theme
async function changeTheme(theme: 'light' | 'dark' | 'system') {
  const themeData = await window.electron.ipcRenderer.invoke('set-theme', theme)
  console.log('New theme:', themeData)
}
```

### 4. Settings UI

```html
<div class="theme-settings">
  <h3>Theme</h3>
  <div class="theme-options">
    <button onclick="changeTheme('light')">Light</button>
    <button onclick="changeTheme('dark')">Dark</button>
    <button onclick="changeTheme('system')">System</button>
  </div>
</div>

<style>
  .theme-settings {
    background-color: var(--color-background);
    color: var(--color-foreground);
    padding: 1rem;
  }

  button {
    background-color: var(--color-primary);
    color: var(--color-primary-foreground);
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
</style>
```

---

## Common Patterns

### Conditional Rendering Based on Theme

**Web:**
```tsx
const { theme } = useTheme()

{theme === 'dark' ? (
  <DarkModeComponent />
) : (
  <LightModeComponent />
)}
```

**Mobile:**
```tsx
const { isDark } = useTheme()

{isDark ? (
  <DarkIcon />
) : (
  <LightIcon />
)}
```

### Dynamic Styles

**Web:**
```tsx
const { theme } = useTheme()

<div
  style={{
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
  }}
>
  Content
</div>
```

**Mobile:**
```tsx
const { colors } = useTheme()

<View style={{ backgroundColor: colors.card }}>
  <Text style={{ color: colors.text.primary }}>
    Content
  </Text>
</View>
```

### Image Assets

**Web:**
```tsx
const { theme } = useTheme()

<Image
  src={theme === 'dark' ? '/logo-light.png' : '/logo-dark.png'}
  alt="Logo"
/>
```

**Mobile:**
```tsx
const { isDark } = useTheme()

<Image
  source={isDark
    ? require('./assets/logo-light.png')
    : require('./assets/logo-dark.png')
  }
/>
```

---

## Chart & Graph Theming

### Chart.js Example

```tsx
import { useTheme } from 'next-themes'
import { Line } from 'react-chartjs-2'

export function ThemedChart() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{
      label: 'Revenue',
      data: [12, 19, 3, 5],
      borderColor: isDark ? '#60a5fa' : '#3b82f6',
      backgroundColor: isDark
        ? 'rgba(96, 165, 250, 0.1)'
        : 'rgba(59, 130, 246, 0.1)',
    }],
  }

  const options = {
    scales: {
      y: {
        ticks: { color: isDark ? '#cbd5e1' : '#64748b' },
        grid: { color: isDark ? '#334155' : '#e2e8f0' },
      },
      x: {
        ticks: { color: isDark ? '#cbd5e1' : '#64748b' },
        grid: { color: isDark ? '#334155' : '#e2e8f0' },
      },
    },
    plugins: {
      legend: {
        labels: { color: isDark ? '#f8fafc' : '#0f172a' },
      },
    },
  }

  return <Line data={data} options={options} />
}
```

---

## Code Block Theming

### Syntax Highlighting

```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'

export function CodeBlock({ code, language }) {
  const { theme } = useTheme()

  return (
    <SyntaxHighlighter
      language={language}
      style={theme === 'dark' ? vscDarkPlus : vs}
      customStyle={{
        borderRadius: '0.5rem',
        padding: '1rem',
      }}
    >
      {code}
    </SyntaxHighlighter>
  )
}
```

---

## Form Elements

### Themed Input

```tsx
export function ThemedInput({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        className="w-full px-4 py-2 rounded-lg
                   border border-slate-300 dark:border-slate-600
                   bg-white dark:bg-slate-800
                   text-slate-900 dark:text-white
                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        {...props}
      />
    </div>
  )
}
```

### Themed Select

```tsx
export function ThemedSelect({ label, options, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <select
        className="w-full px-4 py-2 rounded-lg
                   border border-slate-300 dark:border-slate-600
                   bg-white dark:bg-slate-800
                   text-slate-900 dark:text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

---

## Testing Your Theme Implementation

### Checklist

- [ ] All text is readable in both themes
- [ ] All backgrounds have proper contrast
- [ ] Images/logos work in both themes
- [ ] Charts and graphs are themed
- [ ] Code blocks use appropriate syntax highlighting
- [ ] Forms and inputs are properly styled
- [ ] Modals and dialogs support dark mode
- [ ] Toasts and notifications are themed
- [ ] Loading states are visible in both themes
- [ ] Borders are visible but not harsh
- [ ] Shadows are appropriate for each theme
- [ ] Theme preference persists on reload
- [ ] System preference detection works
- [ ] No white flashes during theme switch
- [ ] Smooth transitions between themes

---

## Quick Reference

### Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| background | `#ffffff` | `#0f172a` |
| foreground | `#0f172a` | `#f8fafc` |
| primary | `#3b82f6` | `#60a5fa` |
| secondary | `#a855f7` | `#c084fc` |
| muted | `#f1f5f9` | `#334155` |
| border | `#e2e8f0` | `#334155` |

### Tailwind Classes

```
bg-white dark:bg-slate-900
text-slate-900 dark:text-white
border-slate-200 dark:border-slate-700
shadow-lg dark:shadow-xl
```

### Hook Usage

**Web:**
```tsx
const { theme, setTheme } = useTheme()
```

**Mobile:**
```tsx
const { isDark, colors } = useTheme()
```

---

## Support

For issues or questions about the dark mode implementation:
1. Check this guide
2. Review `DARK_MODE_IMPLEMENTATION.md`
3. Check component examples in the codebase
4. Open an issue on GitHub

---

**Happy theming!**
