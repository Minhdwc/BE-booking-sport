export const CACHE_TTL = {
  venueDetail: 300,
  venueList: 120,
  fieldDetail: 300,
  fieldList: 120,
  dashboardSummary: 120,
  searchVenues: 60,
  searchPopular: 300,
  searchSuggestions: 120,
} as const;

export const CACHE_KEYS = {
  venueDetail: (id: string) => `cache:venue:detail:${id}`,
  venueList: (hash: string) => `cache:venue:list:${hash}`,
  fieldDetail: (id: string) => `cache:field:detail:${id}`,
  fieldList: (hash: string) => `cache:field:list:${hash}`,
  dashboardSummary: (hash: string) => `cache:dashboard:summary:${hash}`,
  searchVenues: (hash: string) => `cache:search:venues:${hash}`,
  searchPopular: 'search:popular:queries',
  recentlyViewed: (userId: string) => `search:recently-viewed:${userId}`,
  venueListPattern: 'cache:venue:list:*',
  fieldListPattern: 'cache:field:list:*',
  venueDetailPattern: (id: string) => `cache:venue:detail:${id}`,
  fieldDetailPattern: (id: string) => `cache:field:detail:${id}`,
} as const;

export const RECENTLY_VIEWED_LIMIT = 20;
export const POPULAR_SEARCH_LIMIT = 10;

export function hashQuery(params: Record<string, string | number | undefined | null>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}
