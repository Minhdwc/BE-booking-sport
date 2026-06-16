export interface IReview {
  id: string;
  userId: string;
  fieldId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

