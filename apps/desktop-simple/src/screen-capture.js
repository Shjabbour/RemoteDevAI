import { exec, execSync } from 'child_process';
import { createServer } from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * ScreenCapture - Handles screen capture and streaming for remote viewing
 * Supports Windows, macOS, and Linux
 */
export class ScreenCapture {
  constructor() {
    this.isStreaming = false;
    this.captureInterval = null;
    this.lastFrame = null;
    this.frameCount = 0;
    this.fps = 10; // Default FPS for streaming
    this.quality = 50; // JPEG quality (1-100)
    this.scale = 0.5; // Scale factor for frame size
    this.subscribers = new Set();
    this.platform = os.platform();
    this.displays = [];
    this.currentDisplay = 0;
  }

  /**
   * Get available displays
   */
  async getDisplays() {
    try {
      if (this.platform === 'win32') {
        // Windows: Use PowerShell to get display info (single-line command)
        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { [PSCustomObject]@{Name=$_.DeviceName;Primary=$_.Primary;Width=$_.Bounds.Width;Height=$_.Bounds.Height;X=$_.Bounds.X;Y=$_.Bounds.Y} } | ConvertTo-Json`;
        const result = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf-8' });
        const displays = JSON.parse(result);
        this.displays = Array.isArray(displays) ? displays : [displays];
      } else if (this.platform === 'darwin') {
        // macOS: Use system_profiler
        const result = execSync('system_profiler SPDisplaysDataType -json', { encoding: 'utf-8' });
        const data = JSON.parse(result);
        this.displays = data.SPDisplaysDataType?.[0]?.spdisplays_ndrvs?.map((d, i) => ({
          Name: d._name || `Display ${i}`,
          Width: parseInt(d._spdisplays_resolution?.split(' x ')[0]) || 1920,
          Height: parseInt(d._spdisplays_resolution?.split(' x ')[1]) || 1080,
          Primary: i === 0
        })) || [{ Name: 'Main', Width: 1920, Height: 1080, Primary: true }];
      } else {
        // Linux: Use xrandr
        try {
          const result = execSync('xrandr --query', { encoding: 'utf-8' });
          const matches = result.matchAll(/(\S+) connected.*?(\d+)x(\d+)/g);
          this.displays = Array.from(matches).map((m, i) => ({
            Name: m[1],
            Width: parseInt(m[2]),
            Height: parseInt(m[3]),
            Primary: i === 0
          }));
        } catch {
          this.displays = [{ Name: 'Main', Width: 1920, Height: 1080, Primary: true }];
        }
      }

      return this.displays.map((d, i) => ({
        id: i,
        name: d.Name,
        width: d.Width,
        height: d.Height,
        primary: d.Primary
      }));
    } catch (error) {
      console.error('[ScreenCapture] Error getting displays:', error.message);
      return [{ id: 0, name: 'Primary', width: 1920, height: 1080, primary: true }];
    }
  }

  /**
   * Capture a single screenshot
   */
  async captureFrame() {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(os.tmpdir(), `rdai-frame-${Date.now()}.jpg`);
      const tempFileEscaped = tempFile.replace(/\\/g, '\\\\');

      try {
        let cmd;

        if (this.platform === 'win32') {
          // Windows: Use PowerShell with .NET - single line command
          const psScript = `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $s=[System.Windows.Forms.Screen]::AllScreens[${this.currentDisplay}]; $b=$s.Bounds; $bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height); $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $bmp.Save('${tempFileEscaped}',[System.Drawing.Imaging.ImageFormat]::Jpeg); $g.Dispose(); $bmp.Dispose()`;
          cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`;
        } else if (this.platform === 'darwin') {
          // macOS: Use screencapture
          cmd = `screencapture -x -t jpg -D ${this.currentDisplay + 1} "${tempFile}"`;
        } else {
          // Linux: Use scrot or import (ImageMagick)
          cmd = `scrot -q ${this.quality} "${tempFile}" 2>/dev/null || import -window root -quality ${this.quality} "${tempFile}"`;
        }

        exec(cmd, { timeout: 10000 }, (error) => {
          if (error) {
            reject(error);
            return;
          }

          // Read the file and convert to base64
          fs.readFile(tempFile, (err, data) => {
            // Clean up temp file
            fs.unlink(tempFile, () => {});

            if (err) {
              reject(err);
              return;
            }

            const base64 = data.toString('base64');
            this.lastFrame = base64;
            this.frameCount++;
            resolve(base64);
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start streaming frames to subscribers
   */
  startStreaming(fps = 10) {
    if (this.isStreaming) {
      console.log('[ScreenCapture] Already streaming');
      return;
    }

    this.fps = Math.min(Math.max(fps, 1), 30); // Clamp FPS between 1-30
    this.isStreaming = true;
    this.frameCount = 0;

    console.log(`[ScreenCapture] Starting stream at ${this.fps} FPS`);

    const captureLoop = async () => {
      if (!this.isStreaming) return;

      try {
        const frame = await this.captureFrame();

        // Notify all subscribers
        for (const callback of this.subscribers) {
          try {
            callback({
              frame,
              frameNumber: this.frameCount,
              timestamp: Date.now(),
              display: this.currentDisplay
            });
          } catch (e) {
            console.error('[ScreenCapture] Subscriber error:', e.message);
          }
        }
      } catch (error) {
        console.error('[ScreenCapture] Frame capture error:', error.message);
      }

      // Schedule next frame
      if (this.isStreaming) {
        this.captureInterval = setTimeout(captureLoop, 1000 / this.fps);
      }
    };

    captureLoop();
  }

  /**
   * Stop streaming
   */
  stopStreaming() {
    this.isStreaming = false;
    if (this.captureInterval) {
      clearTimeout(this.captureInterval);
      this.captureInterval = null;
    }
    console.log('[ScreenCapture] Streaming stopped');
  }

  /**
   * Subscribe to frame updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Set streaming quality
   */
  setQuality(quality) {
    this.quality = Math.min(Math.max(quality, 10), 100);
    console.log(`[ScreenCapture] Quality set to ${this.quality}`);
  }

  /**
   * Set frame scale
   */
  setScale(scale) {
    this.scale = Math.min(Math.max(scale, 0.1), 1.0);
    console.log(`[ScreenCapture] Scale set to ${this.scale}`);
  }

  /**
   * Set FPS
   */
  setFPS(fps) {
    this.fps = Math.min(Math.max(fps, 1), 30);
    console.log(`[ScreenCapture] FPS set to ${this.fps}`);
  }

  /**
   * Select display
   */
  selectDisplay(displayId) {
    if (displayId >= 0 && displayId < this.displays.length) {
      this.currentDisplay = displayId;
      console.log(`[ScreenCapture] Selected display ${displayId}`);
      return true;
    }
    return false;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      isStreaming: this.isStreaming,
      fps: this.fps,
      quality: this.quality,
      scale: this.scale,
      frameCount: this.frameCount,
      subscriberCount: this.subscribers.size,
      currentDisplay: this.currentDisplay,
      displayCount: this.displays.length
    };
  }
}

export default ScreenCapture;
