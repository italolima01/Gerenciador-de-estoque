
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import type { Product, GenerateRestockAlertOutput, Order } from '@/lib/types';
import { generateIntelligentRestockAlert } from '@/ai/flows/generate-intelligent-restock-alert';

export async function getRestockAlert(
  product: Product,
  orders: Order[]
): Promise<GenerateRestockAlertOutput> {
  try {
    const alert = await generateIntelligentRestockAlert({
      product,
      orders,
    });
    return alert;
  } catch (error) {
    console.error(`Failed to get restock alert for ${product.name}`, error);
    // Return a default error state
    return {
      zone: 'red',
      restockRecommendation: 'Erro ao obter recomendação.',
      confidenceLevel: 'low',
    };
  }
}

export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}
