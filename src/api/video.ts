import { MiniMaxAPI } from '../utils/api.js';
import { VideoGenerationQueryRequest, VideoGenerationRequest } from '../types/index.js';
import { MinimaxRequestError } from '../exceptions/index.js';
import { DEFAULT_VIDEO_MODEL, ERROR_PROMPT_REQUIRED, RESOURCE_MODE_URL, VALID_VIDEO_MODELS } from '../const/index.js';
import * as path from 'path';
import * as fs from 'fs';
import { buildOutputFile } from '../utils/file.js';
import * as requests from 'axios';

export class VideoAPI {
  private api: MiniMaxAPI;

  constructor(api: MiniMaxAPI) {
    this.api = api;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<any> {
    // Validate required parameters
    if (!request.prompt || request.prompt.trim() === '') {
      throw new MinimaxRequestError(ERROR_PROMPT_REQUIRED);
    }

    try {
      // Ensure model is valid
      const model = this.ensureValidModel(request.model);

      // Prepare request data
      const requestData: Record<string, any> = {
        model: model,
        prompt: request.prompt
      };

      // Process first frame image
      if (request.firstFrameImage) {
        // Check if it's a URL or data URL
        if (!request.firstFrameImage.startsWith(('http://')) &&
            !request.firstFrameImage.startsWith(('https://')) &&
            !request.firstFrameImage.startsWith(('data:'))) {
          // If it's a local file, convert to data URL
          if (!fs.existsSync(request.firstFrameImage)) {
            throw new MinimaxRequestError(`First frame image file does not exist: ${request.firstFrameImage}`);
          }

          const imageData = fs.readFileSync(request.firstFrameImage);
          const base64Image = imageData.toString('base64');
          requestData.first_frame_image = `data:image/jpeg;base64,${base64Image}`;
        } else {
          requestData.first_frame_image = request.firstFrameImage;
        }
      }

      // Process resolution
      if (request.resolution) {
        requestData.resolution = request.resolution;
      }

      // Process duration
      if (request.duration) {
        requestData.duration = request.duration;
      }

      // Step 1: Submit video generation task
      const response = await this.api.post<any>('/v1/video_generation', requestData);

      // Get task ID
      const taskId = response?.task_id;
      if (!taskId) {
        throw new MinimaxRequestError('Unable to get task ID from response');
      }

      if (request.asyncMode) {
        return {
          task_id: taskId,
        }
      }

      // Step 2: Wait for video generation task to complete
      let fileId: string | null = null;
      const maxRetries = model === "MiniMax-Hailuo-02" ? 60 : 30; // Maximum 30 attempts, total duration 10 minutes (30 * 20 seconds). MiniMax-Hailuo-02 model has a longer processing time, so we need to wait for a longer time
      const retryInterval = 20; // 20 second interval

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Query task status
        const statusResponse = await this.api.get<any>(`/v1/query/video_generation?task_id=${taskId}`);
        const status = statusResponse?.status;

        if (status === 'Fail') {
          throw new MinimaxRequestError(`Video generation task failed, task ID: ${taskId}`);
        } else if (status === 'Success') {
          fileId = statusResponse?.file_id;
          if (fileId) {
            break;
          }
          throw new MinimaxRequestError(`File ID missing in success response, task ID: ${taskId}`);
        }

        // Task still processing, wait and retry
        await new Promise(resolve => setTimeout(resolve, retryInterval * 1000));
      }

      if (!fileId) {
        throw new MinimaxRequestError(`Failed to get file ID, task ID: ${taskId}`);
      }

      // Step 3: Get video result
      const fileResponse = await this.api.get<any>(`/v1/files/retrieve?file_id=${fileId}`);
      const downloadUrl = fileResponse?.file?.download_url;

      if (!downloadUrl) {
        throw new MinimaxRequestError(`Unable to get download URL for file ID: ${fileId}`);
      }

      // If URL mode, return URL directly
      const resourceMode = this.api.getResourceMode();
      if (resourceMode === RESOURCE_MODE_URL) {
        return {
          video_url: downloadUrl,
          task_id: taskId,
        };
      }

      // Step 4: Download and save video
      const outputPath = buildOutputFile(`video_${taskId}`, request.outputDirectory, 'mp4', true);

      try {
        const videoResponse = await requests.default.get(downloadUrl, { responseType: 'arraybuffer' });

        // Ensure directory exists
        const dirPath = path.dirname(outputPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Save file
        fs.writeFileSync(outputPath, Buffer.from(videoResponse.data));
        return {
          video_path: outputPath,
          task_id: taskId,
        }
      } catch (error) {
        throw new MinimaxRequestError(`Failed to download or save video: ${String(error)}`);
      }
    } catch (error) {
      if (error instanceof MinimaxRequestError) {
        throw error;
      }
      throw new MinimaxRequestError(`Unexpected error occurred during video generation: ${String(error)}`);
    }
  }

  async queryVideoGeneration(request: VideoGenerationQueryRequest): Promise<any> {
    const taskId = request.taskId;

    // Step 1: Get video generation status
    const response = await this.api.get<any>(`/v1/query/video_generation?task_id=${taskId}`);
    const status = response?.status;
    let fileId: string | null = null;
    if (status === 'Fail') {
      throw new MinimaxRequestError(`Video generation task failed, task ID: ${taskId}`);
    } else if (status === 'Success') {
      fileId = response?.file_id;
      if (!fileId) {
        throw new MinimaxRequestError(`File ID missing in success response, task ID: ${taskId}`);
      }
    } else {
      return {
        status,
      }
    }

    // Step 2: Get video result
    const fileResponse = await this.api.get<any>(`/v1/files/retrieve?file_id=${fileId}`);
    const downloadUrl = fileResponse?.file?.download_url;

    if (!downloadUrl) {
      throw new MinimaxRequestError(`Unable to get download URL for file ID: ${fileId}`);
    }

    // If URL mode, return URL directly
    const resourceMode = this.api.getResourceMode();
    if (resourceMode === RESOURCE_MODE_URL) {
      return {
        status,
        video_url: downloadUrl,
        task_id: taskId,
      };
    }

    // Step 3: Download and save video
    const outputPath = buildOutputFile(`video_${taskId}`, request.outputDirectory, 'mp4', true);

    try {
      const videoResponse = await requests.default.get(downloadUrl, { responseType: 'arraybuffer' });

      // Ensure directory exists
      const dirPath = path.dirname(outputPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Save file
      fs.writeFileSync(outputPath, Buffer.from(videoResponse.data));
      return {
        status,
        video_path: outputPath,
        task_id: taskId,
      }
    } catch (error) {
      throw new MinimaxRequestError(`Failed to download or save video: ${String(error)}`);
    }
  }

  // Helper function: Ensure model is valid
  private ensureValidModel(model?: string): string {
    // If no model provided, use default
    if (!model) {
      return DEFAULT_VIDEO_MODEL;
    }

    // Check if model is valid
    if (!VALID_VIDEO_MODELS.includes(model)) {
      // console.error(`Warning: Provided model ${model} is invalid, using default value ${DEFAULT_VIDEO_MODEL}`);
      return DEFAULT_VIDEO_MODEL;
    }

    return model;
  }
}
