#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { MCPServer } from './mcp-server.js';
import { MCPSSEServer } from './mcp-sse-server.js';
import { MCPRestServer } from './mcp-rest-server.js';
import { ConfigManager } from './config/ConfigManager.js';
import {
  DEFAULT_TRANSPORT_MODE,
  TRANSPORT_MODE_REST,
  TRANSPORT_MODE_SSE,
  TRANSPORT_MODE_STDIO,
} from './const/index.js';
import type { Config, TransportMode } from './types/index.js';

export async function startMiniMaxMCP(customConfig?: Partial<Config>): Promise<void> {
  try {
    const config = ConfigManager.getConfig(customConfig);
    const mode = config.server?.mode || DEFAULT_TRANSPORT_MODE;
    // console.log(`[${new Date().toISOString()}] Using transport mode: ${mode}`);

    if (mode === TRANSPORT_MODE_REST) {
      config.server = config.server || {};
      config.server.port = config.server.port || 3000;
      // console.log(`[WARN] No --port specified for REST; defaulting to ${config.server.port}`);
    }

    switch (mode) {
      case TRANSPORT_MODE_REST:
        // console.log(`[${new Date().toISOString()}] Starting REST server`);
        return new MCPServer(config).start();
      case TRANSPORT_MODE_SSE:
        // console.log(`[${new Date().toISOString()}] Starting SSE server`);
        return new MCPSSEServer(config).start();
      case TRANSPORT_MODE_STDIO:
      default:
        // console.log(`[${new Date().toISOString()}] Starting STDIO server`);
        return new MCPServer(config).start();
    }
  } catch (err) {
    // console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    process.exit(1);
  }
}

function isCLIEntry(): boolean {
  if (typeof (import.meta as any).main === 'boolean') {
    return (import.meta as any).main;
  }

  try {
    const invoked = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    if (invoked === self) return true;
  } catch {
    /* ignore */
  }

  const invokedName = process.argv[1] ? path.basename(process.argv[1]) : '';
  const selfName = path.basename(fileURLToPath(import.meta.url));

  if (invokedName === selfName) return true; // node build/index.js
  if (invokedName === 'minimax-mcp-js') return true; // global bin

  return false;
}

if (isCLIEntry()) {
  const argv = yargs(hideBin(process.argv))
    .option('mode', {
      alias: 'm',
      type: 'string',
      default: DEFAULT_TRANSPORT_MODE,
      describe: 'transport mode (rest | sse | stdio)',
    })
    .option('port', {
      alias: 'p',
      type: 'number',
      default: 3000,
      describe: 'port for REST server (only applies when --mode=rest)',
    })
    .help()
    .parseSync();

  const customCfg: Partial<Config> = {
    server: { mode: argv.mode as TransportMode },
  };

  if (argv.port) {
    customCfg.server!.port = argv.port;
  }

  startMiniMaxMCP(customCfg).catch((err) => {
    // console.error(err);
    process.exit(1);
  });
}

export * from './types/index.js';
export * from './utils/api.js';
export * from './api/tts.js';
export * from './api/image.js';
export * from './api/video.js';
export * from './api/voice-clone.js';
export * from './api/voice.js';
export * from './exceptions/index.js';
export * from './const/index.js';
export { MCPServer, MCPSSEServer, MCPRestServer, ConfigManager };
