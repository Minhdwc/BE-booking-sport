export const CACHE_TTL = {
  venueDetail: 300,
  venueList: 120,
  courtDetail: 300,
  courtList: 120,
  dashboard: 120,
  search: 60,
  searchSuggestions: 60,
  searchPopular: 3600,
  recentlyViewed: 7 * 24 * 60 * 60,
} as const;

export const CACHE_KEYS = {
  venueDetail: (id: string) => `cache:venue:detail:${id}`,
  venueList: (hash: string) => `cache:venue:list:${hash}`,
  courtDetail: (id: string) => `cache:court:detail:${id}`,
  courtList: (hash: string) => `cache:court:list:${hash}`,
  dashboard: (hash: string) => `cache:dashboard:${hash}`,
  search: (hash: string) => `cache:search:${hash}`,
  searchPopular: 'cache:search:popular',
  recentlyViewed: (userId: string) => `cache:search:recent:${userId}`,
} as const;
