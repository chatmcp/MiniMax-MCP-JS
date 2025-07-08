import { z } from "zod";
import { OUTPUT_DIRECTORY_DESCRIPTION } from "../const/index.js";

export const COMMON_REST_ARGUMENTS = [
  { name: 'outputDirectory', description: OUTPUT_DIRECTORY_DESCRIPTION, required: false }
];

export const COMMON_REST_INPUT_SCHEMA_PROPERTIES = {
  outputDirectory: { type: 'string' }
};

export const COMMON_PARAMETERS_SCHEMA = {
  outputDirectory: z.string().optional().describe(OUTPUT_DIRECTORY_DESCRIPTION),
};