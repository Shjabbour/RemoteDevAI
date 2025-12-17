import { exec, execSync } from 'child_process';
import os from 'os';

/**
 * InputControl - Handles remote mouse and keyboard control
 * Supports Windows, macOS, and Linux
 */
export class InputControl {
  constructor() {
    this.platform = os.platform();
    this.screenWidth = 1920;
    this.screenHeight = 1080;
    this.isEnabled = true;
    this.initScreenSize();
  }

  /**
   * Initialize screen dimensions
   */
  async initScreenSize() {
    try {
      if (this.platform === 'win32') {
        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; $s=[System.Windows.Forms.Screen]::PrimaryScreen; Write-Output "$($s.Bounds.Width),$($s.Bounds.Height)"`;
        const result = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf-8' });
        const [width, height] = result.trim().split(',').map(Number);
        this.screenWidth = width || 1920;
        this.screenHeight = height || 1080;
      } else if (this.platform === 'darwin') {
        const result = execSync("system_profiler SPDisplaysDataType | grep Resolution | head -1 | awk '{print $2, $4}'", { encoding: 'utf-8' });
        const [width, height] = result.trim().split(' ').map(Number);
        this.screenWidth = width || 1920;
        this.screenHeight = height || 1080;
      } else {
        // Linux
        const result = execSync("xrandr | grep '*' | head -1 | awk '{print $1}'", { encoding: 'utf-8' });
        const [width, height] = result.trim().split('x').map(Number);
        this.screenWidth = width || 1920;
        this.screenHeight = height || 1080;
      }
      console.log(`[InputControl] Screen size: ${this.screenWidth}x${this.screenHeight}`);
    } catch (error) {
      console.error('[InputControl] Error getting screen size:', error.message);
    }
  }

  /**
   * Move mouse to position (normalized 0-1 coordinates)
   */
  async moveMouse(x, y) {
    if (!this.isEnabled) return false;

    // Convert normalized coordinates to screen coordinates
    const screenX = Math.round(x * this.screenWidth);
    const screenY = Math.round(y * this.screenHeight);

    try {
      if (this.platform === 'win32') {
        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${screenX}, ${screenY})`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 1000 });
      } else if (this.platform === 'darwin') {
        // macOS requires cliclick or similar tool
        // Try using AppleScript with System Events
        execSync(`osascript -e 'tell application "System Events" to click at {${screenX}, ${screenY}}'`, { timeout: 1000 });
      } else {
        // Linux: Use xdotool
        execSync(`xdotool mousemove ${screenX} ${screenY}`, { timeout: 1000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] moveMouse error:', error.message);
      return false;
    }
  }

  /**
   * Click at current position
   */
  async click(button = 'left') {
    if (!this.isEnabled) return false;

    const buttonMap = { left: 1, middle: 2, right: 3 };
    const btn = buttonMap[button] || 1;

    try {
      if (this.platform === 'win32') {
        // Use simpler SendInput approach via PowerShell
        const downFlag = button === 'right' ? '0x0008' : '0x0002';
        const upFlag = button === 'right' ? '0x0010' : '0x0004';
        const psCmd = `Add-Type -Name Win32 -Namespace Win32 -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -PassThru | ForEach-Object { [Win32.Win32]::mouse_event(${downFlag},0,0,0,0); [Win32.Win32]::mouse_event(${upFlag},0,0,0,0) }`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 2000 });
      } else if (this.platform === 'darwin') {
        execSync(`osascript -e 'tell application "System Events" to click'`, { timeout: 1000 });
      } else {
        execSync(`xdotool click ${btn}`, { timeout: 1000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] click error:', error.message);
      return false;
    }
  }

  /**
   * Click at specific position
   */
  async clickAt(x, y, button = 'left') {
    await this.moveMouse(x, y);
    await new Promise(r => setTimeout(r, 50)); // Small delay for position update
    return this.click(button);
  }

  /**
   * Double click at current position
   */
  async doubleClick() {
    if (!this.isEnabled) return false;

    try {
      if (this.platform === 'win32') {
        const psCmd = `Add-Type -Name Win32 -Namespace Win32 -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -PassThru | ForEach-Object { [Win32.Win32]::mouse_event(2,0,0,0,0); [Win32.Win32]::mouse_event(4,0,0,0,0); Start-Sleep -Milliseconds 50; [Win32.Win32]::mouse_event(2,0,0,0,0); [Win32.Win32]::mouse_event(4,0,0,0,0) }`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 2000 });
      } else if (this.platform === 'darwin') {
        execSync(`osascript -e 'tell application "System Events" to double click'`, { timeout: 1000 });
      } else {
        execSync('xdotool click --repeat 2 --delay 50 1', { timeout: 1000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] doubleClick error:', error.message);
      return false;
    }
  }

  /**
   * Type text
   */
  async typeText(text) {
    if (!this.isEnabled || !text) return false;

    try {
      if (this.platform === 'win32') {
        // Escape special characters for PowerShell/SendKeys
        const escapedText = text
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "''")
          .replace(/\+/g, '{+}')
          .replace(/\^/g, '{^}')
          .replace(/%/g, '{%}')
          .replace(/~/g, '{~}')
          .replace(/\(/g, '{(}')
          .replace(/\)/g, '{)}')
          .replace(/\{/g, '{{}')
          .replace(/\}/g, '{}}')
          .replace(/\[/g, '{[}')
          .replace(/\]/g, '{]}');
        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 5000 });
      } else if (this.platform === 'darwin') {
        const escapedText = text.replace(/'/g, "'\\''").replace(/"/g, '\\"');
        execSync(`osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`, { timeout: 5000 });
      } else {
        const escapedText = text.replace(/'/g, "'\\''");
        execSync(`xdotool type -- '${escapedText}'`, { timeout: 5000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] typeText error:', error.message);
      return false;
    }
  }

  /**
   * Press a special key
   */
  async pressKey(key) {
    if (!this.isEnabled) return false;

    // Map common key names
    const keyMap = {
      'enter': { win: '{ENTER}', mac: 'return', linux: 'Return' },
      'tab': { win: '{TAB}', mac: 'tab', linux: 'Tab' },
      'escape': { win: '{ESC}', mac: 'escape', linux: 'Escape' },
      'backspace': { win: '{BACKSPACE}', mac: 'delete', linux: 'BackSpace' },
      'delete': { win: '{DELETE}', mac: 'forwarddelete', linux: 'Delete' },
      'up': { win: '{UP}', mac: 'up arrow', linux: 'Up' },
      'down': { win: '{DOWN}', mac: 'down arrow', linux: 'Down' },
      'left': { win: '{LEFT}', mac: 'left arrow', linux: 'Left' },
      'right': { win: '{RIGHT}', mac: 'right arrow', linux: 'Right' },
      'home': { win: '{HOME}', mac: 'home', linux: 'Home' },
      'end': { win: '{END}', mac: 'end', linux: 'End' },
      'pageup': { win: '{PGUP}', mac: 'page up', linux: 'Page_Up' },
      'pagedown': { win: '{PGDN}', mac: 'page down', linux: 'Page_Down' },
      'space': { win: ' ', mac: 'space', linux: 'space' },
      'f1': { win: '{F1}', mac: 'F1', linux: 'F1' },
      'f2': { win: '{F2}', mac: 'F2', linux: 'F2' },
      'f3': { win: '{F3}', mac: 'F3', linux: 'F3' },
      'f4': { win: '{F4}', mac: 'F4', linux: 'F4' },
      'f5': { win: '{F5}', mac: 'F5', linux: 'F5' },
      'f11': { win: '{F11}', mac: 'F11', linux: 'F11' },
      'f12': { win: '{F12}', mac: 'F12', linux: 'F12' },
    };

    const normalizedKey = key.toLowerCase();
    const mappedKey = keyMap[normalizedKey];

    try {
      if (this.platform === 'win32') {
        const winKey = mappedKey?.win || key;
        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${winKey}')`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 1000 });
      } else if (this.platform === 'darwin') {
        const macKey = mappedKey?.mac || key;
        execSync(`osascript -e 'tell application "System Events" to key code ${macKey}'`, { timeout: 1000 });
      } else {
        const linuxKey = mappedKey?.linux || key;
        execSync(`xdotool key ${linuxKey}`, { timeout: 1000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] pressKey error:', error.message);
      return false;
    }
  }

  /**
   * Press key combination (e.g., ctrl+c, alt+tab)
   */
  async pressCombo(modifiers, key) {
    if (!this.isEnabled) return false;

    try {
      if (this.platform === 'win32') {
        let combo = '';
        if (modifiers.includes('ctrl')) combo += '^';
        if (modifiers.includes('alt')) combo += '%';
        if (modifiers.includes('shift')) combo += '+';
        combo += key.length === 1 ? key : `{${key.toUpperCase()}}`;

        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${combo}')`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 1000 });
      } else if (this.platform === 'darwin') {
        let appleScript = 'tell application "System Events" to keystroke "' + key + '"';
        if (modifiers.length > 0) {
          const modMap = { ctrl: 'control down', alt: 'option down', shift: 'shift down', cmd: 'command down' };
          const mods = modifiers.map(m => modMap[m] || m).join(', ');
          appleScript = `tell application "System Events" to keystroke "${key}" using {${mods}}`;
        }
        execSync(`osascript -e '${appleScript}'`, { timeout: 1000 });
      } else {
        const linuxMods = modifiers.map(m => {
          const map = { ctrl: 'ctrl', alt: 'alt', shift: 'shift', super: 'super' };
          return map[m] || m;
        }).join('+');
        execSync(`xdotool key ${linuxMods}+${key}`, { timeout: 1000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] pressCombo error:', error.message);
      return false;
    }
  }

  /**
   * Scroll at current position
   */
  async scroll(deltaY, deltaX = 0) {
    if (!this.isEnabled) return false;

    try {
      if (this.platform === 'win32') {
        const clicks = Math.round(deltaY / 120) * 120;
        const psCmd = `Add-Type -Name Win32 -Namespace Win32 -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -PassThru | ForEach-Object { [Win32.Win32]::mouse_event(0x0800,0,0,${clicks},0) }`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 1000 });
      } else if (this.platform === 'darwin') {
        const direction = deltaY > 0 ? 'up' : 'down';
        const amount = Math.abs(Math.round(deltaY / 100));
        execSync(`osascript -e 'tell application "System Events" to scroll ${direction} by ${amount}'`, { timeout: 1000 });
      } else {
        const button = deltaY > 0 ? 4 : 5;
        const clicks = Math.abs(Math.round(deltaY / 100));
        execSync(`xdotool click --repeat ${clicks} ${button}`, { timeout: 1000 });
      }
      return true;
    } catch (error) {
      console.error('[InputControl] scroll error:', error.message);
      return false;
    }
  }

  /**
   * Enable/disable input control
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`[InputControl] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Get screen dimensions
   */
  getScreenSize() {
    return {
      width: this.screenWidth,
      height: this.screenHeight
    };
  }
}

export default InputControl;
