'use client';

import { useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';

interface QRCodeConnectProps {
  connectionCode: string;
}

export default function QRCodeConnect({ connectionCode }: QRCodeConnectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // In a real app, use a QR code library like qrcode.react or qr-code-generator
    // For now, we'll create a placeholder
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw placeholder QR code
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Draw border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 256, 256);

    // Draw QR code pattern (simplified placeholder)
    ctx.fillStyle = '#000000';
    const blockSize = 8;
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 32; j++) {
        if (Math.random() > 0.5) {
          ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
        }
      }
    }

    // Draw connection code in center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(64, 104, 128, 48);
    ctx.fillStyle = '#000000';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(connectionCode, 128, 128);
  }, [connectionCode]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="rounded"
        />
      </div>

      <div className="mt-4 flex items-center text-sm text-gray-600">
        <QrCode className="w-4 h-4 mr-2" />
        <span>Scan with the RemoteDevAI Desktop Agent</span>
      </div>
    </div>
  );
}
