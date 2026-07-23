import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type VenueSearchDocument = {
  id: string;
  name: string;
  location: string;
  description?: string | null;
  sports: string[];
  minPrice: number;
  ratingAverage: number;
  ratingCount: number;
  bookingCount: number;
  favoriteCount: number;
  viewCount: number;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;
  private readonly indexName = 'venues';

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config
      .get<string>('ELASTICSEARCH_URL', 'http://localhost:9200')
      .replace(/\/$/, '');
    this.enabled = this.config.get<string>('ELASTICSEARCH_ENABLED', 'false') === 'true';
  }

  isEnabled() {
    return this.enabled;
  }

  async ensureIndex() {
    if (!this.enabled) return;

    try {
      await axios.head(`${this.baseUrl}/${this.indexName}`);
    } catch {
      await axios.put(`${this.baseUrl}/${this.indexName}`, {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'text' },
            location: { type: 'text' },
            description: { type: 'text' },
            sports: { type: 'keyword' },
            minPrice: { type: 'integer' },
            ratingAverage: { type: 'float' },
            ratingCount: { type: 'integer' },
            bookingCount: { type: 'integer' },
            favoriteCount: { type: 'integer' },
            viewCount: { type: 'integer' },
            latitude: { type: 'float' },
            longitude: { type: 'float' },
            updatedAt: { type: 'date' },
          },
        },
      });
      this.logger.log(`Created Elasticsearch index "${this.indexName}"`);
    }
  }

  async indexVenue(doc: VenueSearchDocument) {
    if (!this.enabled) return;

    try {
      await this.ensureIndex();
      await axios.put(`${this.baseUrl}/${this.indexName}/_doc/${doc.id}`, doc);
      this.logger.log(`Indexed venue ${doc.id} -> ${this.indexName}`);
    } catch (error) {
      this.logger.warn(
        `Failed to index venue ${doc.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async deleteVenue(id: string) {
    if (!this.enabled) return;

    try {
      await axios.delete(`${this.baseUrl}/${this.indexName}/_doc/${id}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete venue ${id} from index: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async searchVenues(
    query: string,
    from = 0,
    size = 20,
  ): Promise<{ ids: string[]; total: number }> {
    if (!this.enabled) {
      return { ids: [], total: 0 };
    }

    try {
      await this.ensureIndex();
      const response = await axios.post(`${this.baseUrl}/${this.indexName}/_search`, {
        from,
        size,
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'location^2', 'description', 'sports'],
            fuzziness: 'AUTO',
          },
        },
        sort: [{ bookingCount: 'desc' }, { ratingAverage: 'desc' }],
      });

      const hits = response.data?.hits?.hits ?? [];
      const total = response.data?.hits?.total?.value ?? hits.length;
      return {
        ids: hits.map((hit: { _id: string }) => hit._id),
        total,
      };
    } catch (error) {
      this.logger.warn(
        `Elasticsearch search failed: ${error instanceof Error ? error.message : error}`,
      );
      return { ids: [], total: 0 };
    }
  }
}
