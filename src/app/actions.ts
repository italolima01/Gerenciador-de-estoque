'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert, type GenerateRestockAlertOutput } from '@/ai/flows/generate-restock-alert';
import { generateMultipleRestockAlerts } from '@/ai/flows/generate-multiple-restock-alerts';
import { products as mockProducts } from '@/lib/data';
import type { Product, ProductWithStatus } from '@/lib/types';

export async function getInitialProducts(): Promise<ProductWithStatus[]> {
  try {
    const productsForAlert = mockProducts.map(p => ({
        id: p.id,
        productName: p.name,
        currentStock: p.quantity,
        averageDailySales: p.averageDailySales,
        daysToRestock: p.daysToRestock,
        expirationDate: p.expirationDate,
    }));
    
    const alerts = await generateMultipleRestockAlerts({ products: productsForAlert });
    
    const productsWithStatus = mockProducts.map(product => {
      const alert = alerts.find(a => a.id === product.id);
      if (alert) {
        return { ...product, ...alert };
      }
      // Fallback in case an alert wasn't generated for a product
      return {
        ...product,
        zone: 'yellow',
        restockRecommendation: 'Status could not be determined.',
        confidenceLevel: 'low',
        id: product.id,
      };
    });

    return productsWithStatus;

  } catch (error) {
    console.error(`Failed to get batch status for products`, error);
    // Return mock products with a generic error status if the batch call fails
    return mockProducts.map(product => ({
      ...product,
      zone: 'red',
      restockRecommendation: 'Error fetching recommendation.',
      confidenceLevel: 'low',
    }));
  }
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
