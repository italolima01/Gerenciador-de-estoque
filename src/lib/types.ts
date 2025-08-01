export type Product = {
  id: string;
  name: string;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD
  averageDailySales: number;
  daysToRestock: number;
  imageUrl: string;
  imageHint: string;
};

export type ProductWithStatus = Product & {
  zone: 'green' | 'yellow' | 'red';
  restockRecommendation: string;
  confidenceLevel: string;
};
