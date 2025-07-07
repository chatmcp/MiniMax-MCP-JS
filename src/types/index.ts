export interface TTSRequest {
  text: string;
  model?: string;
  voiceId?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: string;
  format?: string;
  sampleRate?: number;
  bitrate?: number;
  channel?: number;
  latexRead?: boolean;
  pronunciationDict?: string[];
  stream?: boolean;
  languageBoost?: string;
  subtitleEnable?: boolean;
  outputFormat?: string;
  outputFile?: string;
  outputDirectory?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  n?: number;
  promptOptimizer?: boolean;
  outputFile?: string;
  subjectReference?: string;
  outputDirectory?: string;
}

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  fps?: number;
  firstFrameImage?: string;
  outputFile?: string;
  outputDirectory?: string;
  resolution?: string;
  asyncMode?: boolean;
}

export interface VideoGenerationQueryRequest {
  taskId: string;
  outputDirectory?: string;
}

export interface VoiceCloneRequest {
  audioFile: string;
  voiceId: string;
  text?: string;
  name?: string;
  description?: string;
  outputDirectory?: string;
  isUrl?: boolean;
}

export interface ListVoicesRequest {
  voiceType?: string;
}

export interface PlayAudioRequest {
  inputFilePath: string;
  isUrl?: boolean;
}

export interface MusicGenerationRequest {
  prompt: string;
  lyrics: string;
  sampleRate?: number;
  bitrate?: number;
  format?: string;
  channel?: number;
  outputDirectory?: string;
}

export interface VoiceDesignRequest {
  prompt: string;
  previewText: string;
  voiceId?: string;
  outputDirectory?: string;
}

export type TransportMode = 'stdio' | 'rest' | 'sse';

export interface ServerOptions {
  port?: number;
  endpoint?: string;
  mode?: TransportMode;
}

export interface Config {
  apiKey: string;
  basePath?: string;
  apiHost?: string;
  resourceMode?: string;
  server?: ServerOptions;
} 