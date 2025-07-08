import { MiniMaxAPI } from '../utils/api.js';
import { MinimaxRequestError } from '../exceptions/index.js';
import { MusicGenerationRequest } from '../types/index.js';
import { DEFAULT_FORMAT, DEFAULT_MUSIC_MODEL, ERROR_LYRICS_REQUIRED, ERROR_PROMPT_REQUIRED, RESOURCE_MODE_URL } from '../const/index.js';
import * as path from 'path';
import { buildOutputFile } from '../utils/file.js';
import * as fs from 'fs';

export class MusicAPI {
  private api: MiniMaxAPI;

  constructor(api: MiniMaxAPI) {
    this.api = api;
  }

  async generateMusic(request: MusicGenerationRequest): Promise<string> {
    // Validate required parameters
    if (!request.prompt || request.prompt.trim() === '') {
      throw new MinimaxRequestError(ERROR_PROMPT_REQUIRED);
    }
    if (!request.lyrics || request.lyrics.trim() === '') {
      throw new MinimaxRequestError(ERROR_LYRICS_REQUIRED);
    }

    // Process output file
    const textPrefix = request.prompt.substring(0, 20).replace(/[^\w]/g, '_');
    const format = request.format || DEFAULT_FORMAT;
    const fileName = `music_${textPrefix}_${Date.now()}`;
    const outputFile = buildOutputFile(fileName, request.outputDirectory, format);

    // Prepare request data
    const requestData: Record<string, any> = {
      model: DEFAULT_MUSIC_MODEL,
      prompt: request.prompt,
      lyrics: request.lyrics,
      audio_setting: {
        sample_rate: this.ensureValidSampleRate(request.sampleRate),
        bitrate: this.ensureValidBitrate(request.bitrate),
        format: this.ensureValidFormat(request.format),
        channel: this.ensureValidChannel(request.channel),
      },
    };

    // Add output format (if specified)
    if (request.outputFormat === RESOURCE_MODE_URL) {
      requestData.output_format = 'url';
    }

    try {
      // Send request
      const response = await this.api.post<any>('/v1/music_generation', requestData);

      // Process response
      const audioData = response?.data?.audio;

      if (!audioData) {
        throw new MinimaxRequestError('Could not get audio data from response');
      }

      // If URL mode, return URL directly
      if (request.outputFormat === RESOURCE_MODE_URL) {
        return audioData;
      }

      // decode and save file
      try {
        // Convert hex string to binary
        const audioBuffer = Buffer.from(audioData, 'hex');

        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(outputFile, audioBuffer);

        return outputFile;
      } catch (error) {
        throw new MinimaxRequestError(`Failed to save audio file: ${String(error)}`);
      }
    } catch (err) {
      throw err;
    }
  }

  // Helper function: Ensure sample rate is within valid range
  private ensureValidSampleRate(sampleRate?: number): number {
    // List of valid sample rates supported by MiniMax API
    const validSampleRates = [16000, 24000, 32000, 44100];

    // If no sample rate is provided or it's invalid, use default value 32000
    if (sampleRate === undefined) {
      return 32000;
    }

    // If the provided sample rate is not within the valid range, use the closest valid value
    if (!validSampleRates.includes(sampleRate)) {
      // Find the closest valid sample rate
      const closest = validSampleRates.reduce((prev, curr) => {
        return Math.abs(curr - sampleRate) < Math.abs(prev - sampleRate) ? curr : prev;
      });

      console.error(`Warning: Provided sample rate ${sampleRate} is invalid, using closest valid value ${closest}`);
      return closest;
    }

    return sampleRate;
  }

  // Helper function: Ensure bitrate is within valid range
  private ensureValidBitrate(bitrate?: number): number {
    // List of valid bitrates supported by MiniMax API
    const validBitrates = [32000, 64000, 128000, 256000];

    // If no bitrate is provided or it's invalid, use default value 128000
    if (bitrate === undefined) {
      return 128000;
    }

    // If the provided bitrate is not within the valid range, use the closest valid value
    if (!validBitrates.includes(bitrate)) {
      // Find the closest valid bitrate
      const closest = validBitrates.reduce((prev, curr) => {
        return Math.abs(curr - bitrate) < Math.abs(prev - bitrate) ? curr : prev;
      });

      console.error(`Warning: Provided bitrate ${bitrate} is invalid, using closest valid value ${closest}`);
      return closest;
    }

    return bitrate;
  }

  // Helper function: Ensure channel is within valid range
  private ensureValidChannel(channel?: number): number {
    // List of valid channels supported by MiniMax API
    const validChannels = [1, 2];

    // If no channel is provided or it's invalid, use default value 1
    if (channel === undefined) {
      return 1;
    }

    // If the provided channel is not within the valid range, use the closest valid value
    if (!validChannels.includes(channel)) {
      // Find the closest valid channel
      const closest = validChannels.reduce((prev, curr) => {
        return Math.abs(curr - channel) < Math.abs(prev - channel) ? curr : prev;
      });

      console.error(`Warning: Provided channel ${channel} is invalid, using closest valid value ${closest}`);
      return closest;
    }

    return channel;
  }

  // Helper function: Ensure format is within valid range
  private ensureValidFormat(format?: string): string {
    // List of valid formats supported by MiniMax API
    const validFormats = ['mp3', 'pcm', 'wav'];

    // If no format is provided or it's invalid, use default value mp3
    if (!format) {
      return 'mp3';
    }

    // If the provided format is not within the valid range, use default value
    if (!validFormats.includes(format)) {
      console.error(`Warning: Provided format ${format} is invalid, using default value mp3`);
      return 'mp3';
    }

    return format;
  }
}
