export interface IField {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: string;
  sportId: string;
  venueId: string;
  createdAt: Date;
  updatedAt: Date;
}

