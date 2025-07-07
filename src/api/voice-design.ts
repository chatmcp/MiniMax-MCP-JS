import { MiniMaxAPI } from '../utils/api.js';
import { MinimaxRequestError } from '../exceptions/index.js';
import { VoiceDesignRequest } from '../types/index.js';
import { ERROR_PROMPT_REQUIRED, ERROR_PREVIEW_TEXT_REQUIRED } from '../const/index.js';
import { buildOutputFile } from '../utils/file.js';
import * as path from 'path';
import * as fs from 'fs';

export class VoiceDesignAPI {
  private api: MiniMaxAPI;

  constructor(api: MiniMaxAPI) {
    this.api = api;
  }

  async voiceDesign(request: VoiceDesignRequest): Promise<any> {
    // Validate required parameters
    if (!request.prompt || request.prompt.trim() === '') {
      throw new MinimaxRequestError(ERROR_PROMPT_REQUIRED);
    }
    if (!request.previewText || request.previewText.trim() === '') {
      throw new MinimaxRequestError(ERROR_PREVIEW_TEXT_REQUIRED);
    }

    // Process output file
    const textPrefix = request.prompt.substring(0, 20).replace(/[^\w]/g, '_');
    const fileName = `voice_design_${textPrefix}_${Date.now()}`;
    const outputFile = buildOutputFile(fileName, request.outputDirectory, 'mp3');

    // Prepare request data
    const requestData: Record<string, any> = {
      prompt: request.prompt,
      preview_text: request.previewText,
      voice_id: request.voiceId,
    };

    try {
      // Send request
      const response = await this.api.post<any>('/v1/voice_design', requestData);

      // Process response
      const trialAudioData = response?.trial_audio;
      const voiceId = response?.voice_id;

      if (!trialAudioData) {
        throw new MinimaxRequestError('Could not get audio data from response');
      }

      // decode and save file
      try {
        // Convert hex string to binary
        const audioBuffer = Buffer.from(trialAudioData, 'hex');

        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(outputFile, audioBuffer);

        return {
          voiceId,
          outputFile,
        };
      } catch (error) {
        throw new MinimaxRequestError(`Failed to save audio file: ${String(error)}`);
      }
    } catch (err) {
      throw err;
    }
  }
}
