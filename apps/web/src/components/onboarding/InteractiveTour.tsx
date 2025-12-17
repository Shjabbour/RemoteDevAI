'use client';

import { Play } from 'lucide-react';

export default function InteractiveTour() {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-2">🎯 Interactive Demo</h3>
          <p className="text-blue-100">
            Watch a 2-minute overview of RemoteDevAI in action
          </p>
        </div>
        <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2 shadow-lg">
          <Play className="w-5 h-5" />
          <span>Watch Video</span>
        </button>
      </div>

      {/* Video Placeholder */}
      <div className="mt-4 bg-black/20 rounded-lg aspect-video flex items-center justify-center backdrop-blur-sm border border-white/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center mx-auto mb-3">
            <Play className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm text-white/90">Click to play demo video</p>
        </div>
      </div>
    </div>
  );
}
