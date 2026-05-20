import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);
  private readonly promptsDir = path.join(process.cwd(), 'prompts');
  private promptCache: Map<string, string> = new Map();

  async onModuleInit() {
    this.logger.log(
      `Scanning filesystem prompt templates directory: ${this.promptsDir}...`,
    );
    try {
      await fs.mkdir(this.promptsDir, { recursive: true });
      await fs.mkdir(path.join(this.promptsDir, 'system'), { recursive: true });
      await fs.mkdir(path.join(this.promptsDir, 'planners'), {
        recursive: true,
      });
      await fs.mkdir(path.join(this.promptsDir, 'modifiers'), {
        recursive: true,
      });
      this.logger.log('Prompt directories ready!');
    } catch (err) {
      this.logger.error('Failed to initialize prompt directories:', err);
    }
  }

  async loadPrompt(relativeFilePath: string): Promise<string> {
    const cached = this.promptCache.get(relativeFilePath);
    if (cached) return cached;

    const fullPath = path.join(this.promptsDir, relativeFilePath);
    this.logger.log(`Loading prompt file from disk: ${fullPath}`);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      this.promptCache.set(relativeFilePath, content);
      return content;
    } catch (err: any) {
      this.logger.warn(
        `Could not read prompt ${relativeFilePath} from disk: ${err.message}. Using safe fallback.`,
      );
      return this.getFallbackTemplate(relativeFilePath);
    }
  }

  async compilePrompt(
    relativeFilePath: string,
    variables: Record<string, any>,
  ): Promise<string> {
    const template = await this.loadPrompt(relativeFilePath);
    let compiled = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      compiled = compiled.replace(
        regex,
        value !== undefined ? String(value) : '',
      );
    }

    return compiled;
  }

  private getFallbackTemplate(filePath: string): string {
    // Elegant fallback template for fail-safe orchestration
    return `
You are an expert AI Travel agent called "YouGO".
Generate a structured itinerary for {{destination}} for {{durationDays}} days.
Preferences: {{preferences}}
Weather: {{weather}}

Return in STRICT JSON format:
{
  "destination": "{{destination}}",
  "durationDays": {{durationDays}},
  "tripPlan": [],
  "enrichedData": {
    "localWeatherForecast": "{{weather}}",
    "suggestedPackingList": [],
    "travelWarning": "None"
  }
}
    `.trim();
  }
}
