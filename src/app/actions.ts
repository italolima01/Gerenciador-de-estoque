
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateMultipleRestockAlerts } from '@/ai/flows/generate-multiple-restock-alerts';
import type { Product, ProductWithStatus, Order, OrderItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, set, push, update, remove, get } from 'firebase/database';

async function getProductsWithStatus(products: Product[]): Promise<ProductWithStatus[]> {
  if (products.length === 0) {
    return [];
  }
  try {
    const productsForAlert = products.map(p => ({
      id: p.id,
      productName: p.name,
      currentStock: p.quantity,
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

export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  const newProductRef = push(ref(db, 'products'));
  const newProduct: Product = { ...productData, id: newProductRef.key! };
  await set(newProductRef, newProduct);
  return newProduct.id;
}

export async function deleteProduct(productId: string): Promise<void> {
    await remove(ref(db, `products/${productId}`));
}

export async function registerOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>, productUpdates: { [productId: string]: number }): Promise<void> {
    const newOrderRef = push(ref(db, 'orders'));
    const newOrder: Order = {
        ...orderData,
        id: newOrderRef.key!,
        createdAt: new Date().toISOString(),
        status: 'Pendente',
    };
    
    const updates: { [key: string]: any } = {};
    updates[`/orders/${newOrder.id}`] = newOrder;
    for (const [productId, newQuantity] of Object.entries(productUpdates)) {
        updates[`/products/${productId}/quantity`] = newQuantity;
    }
    
    await update(ref(db), updates);
}

export async function updateOrder(updatedOrderData: Order, productUpdates: { [productId: string]: number }): Promise<void> {
    const updates: { [key: string]: any } = {};
    updates[`/orders/${updatedOrderData.id}`] = updatedOrderData;

    for (const [productId, newQuantity] of Object.entries(productUpdates)) {
        updates[`/products/${productId}/quantity`] = newQuantity;
    }
    
    await update(ref(db), updates);
}


export async function cancelOrder(order: Order, productUpdates: { [productId: string]: number }): Promise<void> {
    const updates: { [key: string]: any } = {};
    updates[`/orders/${order.id}/status`] = 'Cancelado';

    for (const [productId, newQuantity] of Object.entries(productUpdates)) {
        updates[`/products/${productId}/quantity`] = newQuantity;
    }

    await update(ref(db), updates);
}

export async function completeOrder(orderId: string, note?: string): Promise<void> {
    const orderRef = ref(db, `orders/${orderId}`);
    const snapshot = await get(orderRef);
    if (snapshot.exists()) {
        const order = snapshot.val();
        const updates: { [key: string]: any } = {
            status: 'Concluído',
            notes: note ? (order.notes ? `${order.notes}\n---\n${note}` : note) : order.notes,
        };
        await update(orderRef, updates);
    }
}
