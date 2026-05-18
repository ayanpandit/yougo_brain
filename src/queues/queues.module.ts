import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueuesService } from './queues.service';

@Module({
  imports: [ConfigModule],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
