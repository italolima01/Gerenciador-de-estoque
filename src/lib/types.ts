
export type Product = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  expirationDate: string; // YYYY-MM-DD
};

export type ProductWithStatus = Product & GenerateRestockAlertOutput;

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type Order = {
  id: string;
  customerName: string;
  address: string;
  deliveryDate: string; // YYYY-MM-DD
  items: OrderItem[];
  notes?: string;
  status: 'Pendente' | 'Concluído';
  createdAt: string; // ISO date string
};

// Duplicating the AI output schema type here to avoid circular dependency
export type GenerateRestockAlertOutput = {
  zone: 'green' | 'yellow' | 'red';
  restockRecommendation: string;
  confidenceLevel: string;
};

// Type for the AI flow that generates intelligent restock alerts
export type GenerateIntelligentRestockAlertInput = {
  product: Product;
  orders: Order[];
};
