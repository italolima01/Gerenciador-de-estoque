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

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type Order = {
  id: string;
  customerName: string;
  deliveryDate: string; // YYYY-MM-DD
  items: OrderItem[];
  notes?: string;
  status: 'Pendente' | 'Concluído' | 'Cancelado';
  createdAt: string; // ISO date string
};
