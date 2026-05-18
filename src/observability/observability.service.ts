import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TraceSpan {
  id: string;
  name: string;
  startTime: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('app.observabilityEnabled', false);
  }

  startSpan(name: string, metadata?: Record<string, any>): TraceSpan {
    const id = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    if (this.isEnabled) {
      this.logger.log(`[Telemetry][Span-Start] Name: ${name}, SpanID: ${id}, Meta: ${JSON.stringify(metadata)}`);
      // Ready to bridge directly to OpenTelemetry/Langfuse:
      // const trace = langfuse.trace({ name, id, metadata });
    }
    
    return { id, name, startTime, metadata };
  }

  endSpan(span: TraceSpan, outputMetadata?: Record<string, any>) {
    const duration = Date.now() - span.startTime;
    
    if (this.isEnabled) {
      this.logger.log(
        `[Telemetry][Span-End] Name: ${span.name}, SpanID: ${span.id}, Duration: ${duration}ms, OutMeta: ${JSON.stringify(
          outputMetadata,
        )}`,
      );
      // Bridge directly to OpenTelemetry/Langfuse:
      // span.update({ output: outputMetadata, duration });
    }
  }

  logLlmCost(span: TraceSpan, model: string, promptTokens: number, completionTokens: number) {
    if (this.isEnabled) {
      this.logger.log(
        `[Telemetry][LLM-Cost] SpanID: ${span.id}, Model: ${model}, PromptTokens: ${promptTokens}, CompletionTokens: ${completionTokens}`,
      );
      // langfuse.generation({ ... })
    }
  }
}
