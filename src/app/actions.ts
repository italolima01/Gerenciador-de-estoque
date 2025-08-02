
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert } from '@/ai/flows/generate-restock-alert';
import type { Product, GenerateRestockAlertOutput } from '@/lib/types';

export async function getRestockAlert(product: Product): Promise<GenerateRestockAlertOutput> {
    try {
        const alert = await generateRestockAlert({
            productName: product.name,
            currentStock: product.quantity,
            expirationDate: product.expirationDate,
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
