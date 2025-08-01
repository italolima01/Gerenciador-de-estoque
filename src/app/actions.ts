'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert, type GenerateRestockAlertOutput } from '@/ai/flows/generate-restock-alert';
import { products as mockProducts } from '@/lib/data';
import type { Product, ProductWithStatus } from '@/lib/types';

export async function getInitialProducts(): Promise<ProductWithStatus[]> {
  const productsWithStatus = await Promise.all(
    mockProducts.map(async (product) => {
      try {
        const alert = await generateRestockAlert({
          productName: product.name,
          currentStock: product.quantity,
          averageDailySales: product.averageDailySales,
          daysToRestock: product.daysToRestock,
          expirationDate: product.expirationDate,
        });
        return { ...product, ...alert };
      } catch (error) {
        console.error(`Failed to get status for ${product.name}`, error);
        return { 
          ...product, 
          zone: 'red', 
          restockRecommendation: 'Error fetching recommendation.',
          confidenceLevel: 'low'
        };
      }
    })
  );
  return productsWithStatus;
}

export async function getProductStatus(product: Product): Promise<GenerateRestockAlertOutput> {
   const alert = await generateRestockAlert({
      productName: product.name,
      currentStock: product.quantity,
      averageDailySales: product.averageDailySales,
      daysToRestock: product.daysToRestock,
      expirationDate: product.expirationDate,
    });
    return alert;
}

export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}
