
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert } from '@/ai/flows/generate-restock-alert';
import type { Product, ProductWithStatus, Order, GenerateRestockAlertOutput } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, get, set, push, remove, update } from 'firebase/database';

export async function getProducts(): Promise<Product[]> {
  const productsRef = ref(db, 'products');
  const snapshot = await get(productsRef);
  if (!snapshot.exists()) {
    return [];
  }
  
  const productsObject = snapshot.val();
  const products: Product[] = Object.keys(productsObject).map(key => ({
    ...productsObject[key]
  }));

  return products.sort((a, b) => a.name.localeCompare(b.name));
}

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
        return {
            zone: 'red',
            restockRecommendation: 'Erro ao obter recomendação.',
            confidenceLevel: 'low',
        };
    }
}


export async function getOrders(): Promise<Order[]> {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    if (!snapshot.exists()) {
        return [];
    }
    const ordersObject = snapshot.val();
    if (!ordersObject) {
        return [];
    }
    const orders: Order[] = Object.keys(ordersObject).map(key => ({
        ...ordersObject[key]
    }));
    return orders.reverse();
}


export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  const productsRef = ref(db, 'products');
  const newProductRef = push(productsRef);
  const newProduct: Product = { ...productData, id: newProductRef.key! };
  await set(ref(db, `products/${newProduct.id}`), newProduct);
  return newProduct.id;
}


export async function deleteProduct(productId: string): Promise<void> {
    const productRef = ref(db, `products/${productId}`);
    await remove(productRef);
}

export async function registerOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>, productUpdates: { [productId: string]: number }): Promise<void> {
    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
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
            status: 'Concluído'
        };
        if (note) {
            updates.notes = order.notes ? `${order.notes}\n---\n${note}` : note;
        }
        await update(orderRef, updates);
    }
}
