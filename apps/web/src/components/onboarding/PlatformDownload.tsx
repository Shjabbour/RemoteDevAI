'use client';

import { Download, Check } from 'lucide-react';

interface PlatformDownloadProps {
  platform: 'windows' | 'macos' | 'linux';
}

const DOWNLOAD_LINKS = {
  windows: {
    x64: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-Setup-x64.exe',
    arm64: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-Setup-arm64.exe',
  },
  macos: {
    intel: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-Intel.dmg',
    apple_silicon: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-AppleSilicon.dmg',
    universal: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-Universal.dmg',
  },
  linux: {
    deb: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-amd64.deb',
    rpm: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-x86_64.rpm',
    appimage: 'https://github.com/your-org/remotedevai-desktop/releases/latest/download/RemoteDevAI-x86_64.AppImage',
  },
};

export default function PlatformDownload({ platform }: PlatformDownloadProps) {
  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Windows Downloads */}
      {platform === 'windows' && (
        <div className="space-y-3">
          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.windows.x64)}
            className="w-full flex items-center justify-between p-4 border-2 border-blue-600 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Windows (x64)</div>
                <div className="text-sm text-gray-600">Recommended for most users</div>
              </div>
            </div>
            <Check className="w-5 h-5 text-blue-600" />
          </button>

          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.windows.arm64)}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Windows (ARM64)</div>
                <div className="text-sm text-gray-600">For ARM-based PCs</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* macOS Downloads */}
      {platform === 'macos' && (
        <div className="space-y-3">
          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.macos.universal)}
            className="w-full flex items-center justify-between p-4 border-2 border-blue-600 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">macOS (Universal)</div>
                <div className="text-sm text-gray-600">Works on Intel & Apple Silicon</div>
              </div>
            </div>
            <Check className="w-5 h-5 text-blue-600" />
          </button>

          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.macos.apple_silicon)}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">macOS (Apple Silicon)</div>
                <div className="text-sm text-gray-600">M1, M2, M3 Macs</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.macos.intel)}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">macOS (Intel)</div>
                <div className="text-sm text-gray-600">Intel-based Macs</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Linux Downloads */}
      {platform === 'linux' && (
        <div className="space-y-3">
          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.linux.appimage)}
            className="w-full flex items-center justify-between p-4 border-2 border-blue-600 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">AppImage</div>
                <div className="text-sm text-gray-600">Universal Linux package</div>
              </div>
            </div>
            <Check className="w-5 h-5 text-blue-600" />
          </button>

          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.linux.deb)}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">.deb Package</div>
                <div className="text-sm text-gray-600">Ubuntu, Debian, Mint</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleDownload(DOWNLOAD_LINKS.linux.rpm)}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">.rpm Package</div>
                <div className="text-sm text-gray-600">Fedora, RHEL, CentOS</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Version Info */}
      <div className="text-center text-sm text-gray-500 pt-2">
        Latest version: v1.0.0 • Released: December 16, 2025
      </div>
    </div>
  );
}
