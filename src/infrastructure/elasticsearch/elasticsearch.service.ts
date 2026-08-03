import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type VenueSearchDocument = {
  id: string;
  name: string;
  location: string;
  city: string;
  district: string;
  description?: string | null;
  sports: string[];
  courtNames: string[];
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

export type VenueSearchFilters = {
  sport?: string;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
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
            city: { type: 'keyword' },
            district: { type: 'keyword' },
            description: { type: 'text' },
            sports: { type: 'keyword' },
            courtNames: { type: 'text' },
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
    filters: VenueSearchFilters = {},
  ): Promise<{ ids: string[]; total: number }> {
    if (!this.enabled) {
      return { ids: [], total: 0 };
    }

    try {
      await this.ensureIndex();

      const must: Record<string, unknown>[] = [];
      if (query.trim()) {
        must.push({
          multi_match: {
            query,
            fields: ['name^3', 'location^2', 'description', 'sports', 'courtNames^2'],
            fuzziness: 'AUTO',
          },
        });
      }

      const filter: Record<string, unknown>[] = [];
      if (filters.sport) {
        filter.push({ term: { sports: filters.sport } });
      }
      if (filters.city) {
        filter.push({ term: { city: filters.city } });
      }
      if (filters.district) {
        filter.push({ term: { district: filters.district } });
      }
      if (filters.minPrice != null || filters.maxPrice != null) {
        filter.push({
          range: {
            minPrice: {
              ...(filters.minPrice != null && { gte: filters.minPrice }),
              ...(filters.maxPrice != null && { lte: filters.maxPrice }),
            },
          },
        });
      }

      const response = await axios.post(`${this.baseUrl}/${this.indexName}/_search`, {
        from,
        size,
        query: {
          bool: {
            ...(must.length > 0 && { must }),
            ...(filter.length > 0 && { filter }),
            ...(must.length === 0 && filter.length === 0 && { match_all: {} }),
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
