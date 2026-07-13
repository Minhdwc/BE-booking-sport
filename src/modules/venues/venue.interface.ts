export interface IVenue {
  id: string;
  name: string;
  location: string;
  description?: string;
  images?: string[];
  ownerId?: string;
}