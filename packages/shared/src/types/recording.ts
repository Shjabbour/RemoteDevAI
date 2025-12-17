/**
 * Recording-related types and interfaces
 */

/**
 * Recording type
 */
export enum RecordingType {
  SCREEN = 'SCREEN',
  TERMINAL = 'TERMINAL',
  BROWSER = 'BROWSER',
  WEBCAM = 'WEBCAM',
  AUDIO = 'AUDIO',
  COMBINED = 'COMBINED'
}

/**
 * Recording status
 */
export enum RecordingStatus {
  PENDING = 'PENDING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  DELETED = 'DELETED'
}

/**
 * Video quality preset
 */
export enum VideoQuality {
  LOW = 'LOW',        // 480p, lower bitrate
  MEDIUM = 'MEDIUM',  // 720p, medium bitrate
  HIGH = 'HIGH',      // 1080p, high bitrate
  ULTRA = 'ULTRA'     // 1440p+, very high bitrate
}

/**
 * Recording format
 */
export enum RecordingFormat {
  MP4 = 'MP4',
  WEBM = 'WEBM',
  MKV = 'MKV',
  JSON = 'JSON'  // For terminal recordings (asciinema format)
}

/**
 * Recording segment (for chunked recordings)
 */
export interface RecordingSegment {
  /** Segment ID */
  id: string;
  /** Segment index */
  index: number;
  /** Segment start time in milliseconds */
  startTimeMs: number;
  /** Segment end time in milliseconds */
  endTimeMs: number;
  /** Segment duration in milliseconds */
  durationMs: number;
  /** Segment file URL */
  fileUrl: string;
  /** Segment file size in bytes */
  fileSizeBytes: number;
  /** Processing status */
  status: 'pending' | 'processing' | 'ready' | 'failed';
}

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  /** Screen resolution */
  resolution: {
    width: number;
    height: number;
  } | null;
  /** Frame rate (FPS) */
  frameRate: number | null;
  /** Video bitrate in kbps */
  videoBitrate: number | null;
  /** Audio bitrate in kbps */
  audioBitrate: number | null;
  /** Audio sample rate */
  audioSampleRate: number | null;
  /** Audio channels */
  audioChannels: number | null;
  /** Video codec */
  videoCodec: string | null;
  /** Audio codec */
  audioCodec: string | null;
  /** Browser information (for browser recordings) */
  browser: {
    name: string;
    version: string;
    userAgent: string;
  } | null;
  /** Operating system information */
  os: {
    name: string;
    version: string;
    platform: string;
  } | null;
  /** Terminal information (for terminal recordings) */
  terminal: {
    shell: string;
    columns: number;
    rows: number;
    theme: string;
  } | null;
}

/**
 * Recording annotation
 */
export interface RecordingAnnotation {
  /** Annotation ID */
  id: string;
  /** User ID who created annotation */
  userId: string;
  /** User name */
  userName: string;
  /** Timestamp in recording (milliseconds) */
  timestampMs: number;
  /** Annotation text */
  text: string;
  /** Annotation type */
  type: 'comment' | 'highlight' | 'issue' | 'question';
  /** Position on screen (x, y coordinates) */
  position: {
    x: number;
    y: number;
  } | null;
  /** Creation timestamp */
  createdAt: Date;
  /** Edit timestamp */
  editedAt: Date | null;
}

/**
 * Recording transcript entry
 */
export interface TranscriptEntry {
  /** Entry ID */
  id: string;
  /** Start time in milliseconds */
  startTimeMs: number;
  /** End time in milliseconds */
  endTimeMs: number;
  /** Transcript text */
  text: string;
  /** Speaker name (if identified) */
  speaker: string | null;
  /** Confidence score (0-1) */
  confidence: number | null;
}

/**
 * Recording interface
 */
export interface Recording {
  /** Unique recording ID */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Session title */
  sessionTitle: string;
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Recording name/title */
  name: string;
  /** Recording description */
  description: string | null;
  /** Recording type */
  type: RecordingType;
  /** Recording status */
  status: RecordingStatus;
  /** Recording quality preset */
  quality: VideoQuality;
  /** Recording format */
  format: RecordingFormat;
  /** Owner user ID */
  ownerId: string;
  /** Owner name */
  ownerName: string;
  /** Recording file URL */
  fileUrl: string | null;
  /** Thumbnail URL */
  thumbnailUrl: string | null;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Recording start timestamp */
  startedAt: Date | null;
  /** Recording end timestamp */
  endedAt: Date | null;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Processing progress (0-100) */
  processingProgress: number;
  /** Recording metadata */
  metadata: RecordingMetadata;
  /** Recording segments (for chunked recordings) */
  segments: RecordingSegment[];
  /** Recording annotations */
  annotations: RecordingAnnotation[];
  /** Recording transcript */
  transcript: TranscriptEntry[];
  /** Has audio track */
  hasAudio: boolean;
  /** Has video track */
  hasVideo: boolean;
  /** Is downloadable */
  isDownloadable: boolean;
  /** Is public */
  isPublic: boolean;
  /** Shared with users */
  sharedWith: string[];
  /** Tags */
  tags: string[];
  /** View count */
  viewCount: number;
  /** Download count */
  downloadCount: number;
}

/**
 * Recording creation payload
 */
export interface CreateRecordingPayload {
  sessionId: string;
  name: string;
  description?: string;
  type: RecordingType;
  quality?: VideoQuality;
  format?: RecordingFormat;
  tags?: string[];
  metadata?: Partial<RecordingMetadata>;
}

/**
 * Recording update payload
 */
export interface UpdateRecordingPayload {
  name?: string;
  description?: string;
  status?: RecordingStatus;
  tags?: string[];
  isPublic?: boolean;
  isDownloadable?: boolean;
}

/**
 * Recording settings
 */
export interface RecordingSettings {
  /** Default quality */
  quality: VideoQuality;
  /** Default format */
  format: RecordingFormat;
  /** Enable audio */
  enableAudio: boolean;
  /** Enable webcam */
  enableWebcam: boolean;
  /** Webcam position */
  webcamPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Webcam size */
  webcamSize: 'small' | 'medium' | 'large';
  /** Enable microphone */
  enableMicrophone: boolean;
  /** Enable system audio */
  enableSystemAudio: boolean;
  /** Auto-stop after minutes */
  autoStopAfterMinutes: number | null;
  /** Max recording duration in minutes */
  maxDurationMinutes: number;
  /** Enable auto-transcription */
  enableAutoTranscription: boolean;
  /** Transcription language */
  transcriptionLanguage: string;
}

/**
 * Recording summary (for lists)
 */
export interface RecordingSummary {
  id: string;
  sessionId: string;
  sessionTitle: string;
  projectName: string;
  name: string;
  type: RecordingType;
  status: RecordingStatus;
  quality: VideoQuality;
  ownerName: string;
  thumbnailUrl: string | null;
  durationMs: number;
  fileSizeBytes: number;
  createdAt: Date;
  viewCount: number;
  tags: string[];
}
