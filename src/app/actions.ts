
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { type GenerateRestockAlertOutput } from '@/ai/flows/generate-restock-alert';
import { generateMultipleRestockAlerts } from '@/ai/flows/generate-multiple-restock-alerts';
import type { Product, ProductWithStatus } from '@/lib/types';
import { getProducts as getFsProducts } from '@/lib/firestore';


async function getProductsWithStatus(products: Product[]): Promise<ProductWithStatus[]> {
  if (products.length === 0) {
    return [];
  }
  try {
    const productsForAlert = products.map(p => ({
      id: p.id,
      productName: p.name,
      currentStock: p.quantity,
      averageDailySales: p.averageDailySales,
      daysToRestock: p.daysToRestock,
      expirationDate: p.expirationDate,
    }));
    
    const alerts = await generateMultipleRestockAlerts({ products: productsForAlert });
    
    const productsWithStatus = products.map(product => {
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
    // Return products with a generic error status if the batch call fails
    return products.map(product => ({
      ...product,
      zone: 'red',
      restockRecommendation: 'Error fetching recommendation.',
      confidenceLevel: 'low',
    }));
  }
}

export async function getInitialProducts(): Promise<ProductWithStatus[]> {
  const products = await getFsProducts();
  return getProductsWithStatus(products);
}

export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}
