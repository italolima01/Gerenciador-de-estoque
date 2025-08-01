
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert, type GenerateRestockAlertOutput } from '@/ai/flows/generate-restock-alert';
import { generateMultipleRestockAlerts, type GenerateMultipleRestockAlertsOutput } from '@/ai/flows/generate-multiple-restock-alerts';
import { products as mockProducts } from '@/lib/data';
import type { Product, ProductWithStatus } from '@/lib/types';

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
  return getProductsWithStatus(mockProducts);
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

export async function updateProductsAndGetStatus(
  currentProducts: ProductWithStatus[],
  updatedProductQuantities: { [productId: string]: number }
): Promise<ProductWithStatus[]> {
    const productIdsToUpdate = Object.keys(updatedProductQuantities);
    if (productIdsToUpdate.length === 0) {
        return currentProducts;
    }

    // Create a new list of all products with updated quantities
    const allProductsWithUpdatedQuantities: Product[] = currentProducts.map(p => {
        if (updatedProductQuantities[p.id] !== undefined) {
            return { ...p, quantity: updatedProductQuantities[p.id] };
        }
        return p;
    });

    // Get the products that actually need their status (re)calculated
    const productsToRecalculate = allProductsWithUpdatedQuantities.filter(p => productIdsToUpdate.includes(p.id));
    
    const statusUpdates = await getProductsWithStatus(productsToRecalculate);

    // Merge the new statuses back into the full product list
    const updatedProductsWithStatus = allProductsWithUpdatedQuantities.map(p => {
        const newStatus = statusUpdates.find(s => s.id === p.id);
        const currentFullProduct = currentProducts.find(cp => cp.id === p.id);
        
        if (newStatus) {
            return { ...p, ...newStatus };
        }
        // If no new status was generated, it means it wasn't in the list to be recalculated.
        // We need to find its old status from the original `currentProducts` list.
        if (currentFullProduct) {
            const { id, zone, restockRecommendation, confidenceLevel, ...productData } = currentFullProduct;
            return { ...p, id, zone, restockRecommendation, confidenceLevel };
        }
        // Fallback for a product that somehow didn't exist before.
        return {
             ...p,
             zone: 'yellow',
             restockRecommendation: 'Status not available.',
             confidenceLevel: 'low',
        };
    });

    return updatedProductsWithStatus;
}


export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}
