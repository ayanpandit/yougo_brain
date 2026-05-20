import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { repairItinerary } from '../schemas/itinerary.schema';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  parseAndValidate<T>(rawContent: string, schema: z.ZodSchema<T>): T {
    this.logger.log('Starting validation and repair-ready parsing pipeline...');

    // Step 1: Clean markdown markers and extract JSON block
    const cleaned = this.cleanAndExtractJson(rawContent);

    // Step 2: Attempt standard JSON parse
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (firstParseError: any) {
      this.logger.warn(
        `Standard JSON parsing failed: ${firstParseError.message}. Attempting regex repair...`,
      );

      // Step 3: Attempt trailing comma and syntax repair
      const repaired = this.repairJsonSyntax(cleaned);
      try {
        parsed = JSON.parse(repaired);
        this.logger.log('JSON syntactical repair completed successfully!');
      } catch (secondParseError: any) {
        this.logger.error(
          'JSON parsing failed completely even after syntax repair.',
        );
        throw new Error(
          `JSON Syntax Error: ${secondParseError.message}. Content was: ${cleaned}`,
        );
      }
    }

    // Step 4: Run deep-merge self-healing repair to guarantee zero missing keys
    let repairedObj = parsed;
    try {
      this.logger.log(
        'Executing deep-merge self-healing repair on parsed JSON...',
      );
      repairedObj = repairItinerary(parsed);
      this.logger.log('Deep-merge self-healing repair completed successfully!');
    } catch (repairError: any) {
      this.logger.warn(
        `Self-healing repair process failed: ${repairError.message}. Proceeding to validate raw structure.`,
      );
    }

    // Step 5: Validate against Zod Schema
    const result = schema.safeParse(repairedObj);
    if (!result.success) {
      this.logger.error('Zod schema validation failed!');
      const formattedErrors = JSON.stringify(result.error.format(), null, 2);
      this.logger.error(formattedErrors);
      throw new Error(`Validation Error: ${formattedErrors}`);
    }

    this.logger.log('Validation passed successfully!');
    return result.data as T;
  }

  private cleanAndExtractJson(content: string): string {
    let trimmed = content.trim();

    // Remove markdown codeblock wrapper
    if (trimmed.startsWith('```')) {
      trimmed = trimmed
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '');
    }

    trimmed = trimmed.trim();

    // Extract JSON block using first '{' and last '}' to handle LLM conversational noise
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      this.logger.warn(
        'Could not detect braces in the LLM string. Processing raw content.',
      );
      return trimmed;
    }

    return trimmed.substring(firstBrace, lastBrace + 1);
  }

  private repairJsonSyntax(jsonStr: string): string {
    let repaired = jsonStr;

    // 1. Remove trailing commas in arrays and objects: e.g. [1, 2, ] -> [1, 2]
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 2. Add double quotes to unquoted keys (simple helper)
    // e.g. { destination: "Paris" } -> { "destination": "Paris" }
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    return repaired;
  }
}
