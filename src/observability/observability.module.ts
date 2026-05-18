import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityService } from './observability.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
