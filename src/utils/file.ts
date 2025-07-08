import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MinimaxResourceError } from '../exceptions/index.js';
import { ConfigManager } from '../config/ConfigManager.js';

/**
 * Expand home directory if path starts with ~
 * @param filepath Path that might contain ~
 * @returns Expanded path
 */
function expandHomeDir(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  return filepath;
}

/**
 * Build output path
 * @param dir Output directory
 * @returns Complete path
 */
export function buildOutputPath(dir?: string): string {
  const BASE_PATH = expandHomeDir(ConfigManager.getConfig().basePath!);
  const outputPath = dir ? path.join(BASE_PATH, dir) : BASE_PATH;

  if (!fs.existsSync(outputPath)) {
    try {
      fs.mkdirSync(outputPath, { recursive: true });
    } catch (err) {
      throw new MinimaxResourceError(`Cannot create output directory: ${outputPath}, dir: ${dir}, BASE_PATH: ${BASE_PATH}`);
    }
  }

  return outputPath;
}

/**
 * Sanitize filename to remove invalid characters
 * @param filename Filename to sanitize
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  // Remove invalid characters
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

/**
 * Build complete output file path
 * @param filename Filename
 * @param dir Directory
 * @param ext Extension (without dot)
 * @param useRandomSuffix Whether to use random suffix
 * @returns Complete file path
 */
export function buildOutputFile(filename: string, dir?: string, ext?: string, useRandomSuffix?: boolean): string {
  // Sanitize the filename first
  filename = sanitizeFilename(filename);

  if (useRandomSuffix) {
    const rnd = Math.random().toString(36).slice(2, 8);
    filename = `${filename}_${rnd}`;
  }

  if (ext && !filename.endsWith(`.${ext}`)) {
    ext = sanitizeFilename(ext);
    filename = `${filename}.${ext}`;
  }

  const folder = buildOutputPath(dir);
  return path.join(folder, filename);
}

/**
 * Process input file, check if it exists
 * @param filePath File path
 * @returns Complete file path
 */
export function processInputFile(filePath: string): string {
  // First expand home directory if present
  filePath = expandHomeDir(filePath);
  
  // Resolve to absolute path
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  // Normalize and sanitize path
  const normalized = path.normalize(resolved);
  
  // Prevent directory traversal
  if (!normalized.startsWith(process.cwd()) && !path.isAbsolute(filePath)) {
    throw new MinimaxResourceError(`Invalid file path: ${normalized} (directory traversal not allowed)`);
  }

  // Check if file exists
  if (!fs.existsSync(normalized)) {
    throw new MinimaxResourceError(`File does not exist: ${normalized}`);
  }

  // Check if it's a file
  if (!fs.statSync(normalized).isFile()) {
    throw new MinimaxResourceError(`Not a file: ${normalized}`);
  }

  return normalized;
}

/**
 * Generate timestamp filename
 * @param prefix Prefix
 * @param ext Extension (without dot)
 * @returns Timestamped filename
 */
export function generateTimestampFilename(prefix: string, ext: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${ext}`;
}
