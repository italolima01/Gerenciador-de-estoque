
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateMultipleRestockAlerts } from '@/ai/flows/generate-multiple-restock-alerts';
import type { Product, ProductWithStatus, Order, OrderItem } from '@/lib/types';
import { products as initialProducts, orders as initialOrders } from '@/lib/data';

// This is a temporary in-memory store.
// In a real application, this would be a database.
let products: Product[] = [...initialProducts];
let orders: Order[] = [...initialOrders];

export async function getProducts(): Promise<ProductWithStatus[]> {
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
      return {
        ...product,
        zone: 'yellow',
        restockRecommendation: 'Status could not be determined.',
        confidenceLevel: 'low',
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return productsWithStatus;

  } catch (error) {
    console.error(`Failed to get batch status for products`, error);
    return products.map(product => ({
      ...product,
      zone: 'red',
      restockRecommendation: 'Error fetching recommendation.',
      confidenceLevel: 'low',
    })).sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function getOrders(): Promise<Order[]> {
    return [...orders].reverse();
}


export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  const newProduct: Product = { ...productData, id: `prod_${new Date().getTime()}` };
  products.push(newProduct);
  return newProduct.id;
}

export async function deleteProduct(productId: string): Promise<void> {
    products = products.filter(p => p.id !== productId);
}

export async function registerOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>, productUpdates: { [productId: string]: number }): Promise<void> {
    const newOrder: Order = {
        ...orderData,
        id: `order_${new Date().getTime()}`,
        createdAt: new Date().toISOString(),
        status: 'Pendente',
    };
    orders.push(newOrder);

    for (const [productId, newQuantity] of Object.entries(productUpdates)) {
        const product = products.find(p => p.id === productId);
        if (product) {
            product.quantity = newQuantity;
        }
    }
}

export async function updateOrder(updatedOrderData: Order, productUpdates: { [productId: string]: number }): Promise<void> {
    const orderIndex = orders.findIndex(o => o.id === updatedOrderData.id);
    if(orderIndex !== -1) {
        orders[orderIndex] = updatedOrderData;
    }

    for (const [productId, newQuantity] of Object.entries(productUpdates)) {
         const product = products.find(p => p.id === productId);
        if (product) {
            product.quantity = newQuantity;
        }
    }
}


export async function cancelOrder(order: Order, productUpdates: { [productId: string]: number }): Promise<void> {
    const orderIndex = orders.findIndex(o => o.id === order.id);
    if(orderIndex !== -1) {
        orders[orderIndex].status = 'Cancelado';
    }

    for (const [productId, newQuantity] of Object.entries(productUpdates)) {
        const product = products.find(p => p.id === productId);
        if (product) {
            product.quantity = newQuantity;
        }
    }
}

export async function completeOrder(orderId: string, note?: string): Promise<void> {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        const order = orders[orderIndex];
        order.status = 'Concluído';
        if (note) {
            order.notes = order.notes ? `${order.notes}\n---\n${note}` : note;
        }
        orders[orderIndex] = order;
    }
}
