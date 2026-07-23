import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IMAGE_JOBS, QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.IMAGE)
export class ImageProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageProcessor.name);

  async process(job: Job): Promise<void> {
    if (job.name !== IMAGE_JOBS.PROCESS) {
      this.logger.warn(`Unknown image job: ${job.name}`);
      return;
    }

    this.logger.log(`Image job received [${job.id}] — processor stub`);
  }
}
