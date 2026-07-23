import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { ElasticsearchService } from '@/infrastructure/elasticsearch/elasticsearch.service';
import { ELASTIC_JOBS, QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.ELASTIC)
export class ElasticProcessor extends WorkerHost {
  private readonly logger = new Logger(ElasticProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing elastic job: ${job.name} [${job.id}]`);

    switch (job.name) {
      case ELASTIC_JOBS.SYNC_VENUE:
        await this.syncVenue(job.data.venueId as string);
        break;
      case ELASTIC_JOBS.DELETE_VENUE:
        await this.elasticsearch.deleteVenue(job.data.venueId as string);
        break;
      default:
        this.logger.warn(`Unknown elastic job: ${job.name}`);
    }
  }

  private async syncVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
      },
    });

    if (!venue) {
      await this.elasticsearch.deleteVenue(venueId);
      return;
    }

    const sports = [...new Set(venue.fields.map((field) => field.sport.name))];
    const minPrice =
      venue.fields.length > 0 ? Math.min(...venue.fields.map((field) => field.price)) : 0;

    await this.elasticsearch.indexVenue({
      id: venue.id,
      name: venue.name,
      location: venue.location,
      description: venue.description,
      sports,
      minPrice,
      ratingAverage: venue.ratingAverage,
      ratingCount: venue.ratingCount,
      bookingCount: venue.bookingCount,
      favoriteCount: venue.favoriteCount,
      viewCount: venue.viewCount,
      latitude: venue.latitude,
      longitude: venue.longitude,
      updatedAt: venue.updatedAt.toISOString(),
    });
    this.logger.log(`Synced venue ${venueId} to Elasticsearch`);
  }
}
