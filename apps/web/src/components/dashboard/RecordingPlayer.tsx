'use client'

import { useState } from 'next'
import { Play, Pause, Volume2, VolumeX, Maximize, Download } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatDuration } from '@/lib/utils'

interface RecordingPlayerProps {
  recording: {
    id: string
    url: string
    duration: number
    thumbnail?: string
  }
}

export default function RecordingPlayer({ recording }: RecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      {/* Video player */}
      <div className="aspect-video bg-slate-800 relative">
        <video
          className="w-full h-full"
          poster={recording.thumbnail}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src={recording.url} type="video/mp4" />
        </video>

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-1" />
              )}
            </button>

            <div className="flex-1">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500"
                  style={{ width: `${(currentTime / recording.duration) * 100}%` }}
                />
              </div>
            </div>

            <span className="text-white text-sm">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(recording.duration)}
            </span>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center">
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-white">
          <p className="text-sm text-slate-400">Recording {recording.id}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  )
}
