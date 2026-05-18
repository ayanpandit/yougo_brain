import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [ApiController],
})
export class ApiModule {}
