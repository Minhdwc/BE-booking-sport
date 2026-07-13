export interface IVenue {
  id: string;
  name: string;
  location: string;
  longitude: number;
  latitude: number;
  openTime: string;
  closeTime: string;
  restStartTime?: string;
  restEndTime?: string;
  description?: string;
  images?: string[];
  ownerId?: string;
}
