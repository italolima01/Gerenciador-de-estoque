
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert } from '@/ai/flows/generate-restock-alert';
import type { Product, Order, GenerateRestockAlertOutput } from '@/lib/types';
import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    setDoc, 
    deleteDoc, 
    updateDoc, 
    runTransaction,
    addDoc,
    getDoc,
} from 'firebase/firestore';


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

export async function searchProducts(query: string, allProductNames: string[]): Promise<string[]> {
  if (!query) {
    return allProductNames;
  }
  const result = await findRelevantProducts({ query, productNames: allProductNames });
  return result.relevantProductNames;
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'products'), productData);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
}


export async function deleteProduct(productId: string): Promise<void> {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
}

export async function registerOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>, productUpdates: { [productId: string]: number }): Promise<void> {
    
    await runTransaction(db, async (transaction) => {
        const newOrderRef = doc(collection(db, "orders"));
        const newOrder: Order = {
            ...orderData,
            id: newOrderRef.id,
            createdAt: new Date().toISOString(),
            status: 'Pendente',
        };
        transaction.set(newOrderRef, newOrder);

        for (const [productId, newQuantity] of Object.entries(productUpdates)) {
            const productRef = doc(db, 'products', productId);
            transaction.update(productRef, { quantity: newQuantity });
        }
    });
}

export async function updateOrder(updatedOrderData: Order, productUpdates: { [productId: string]: number }): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', updatedOrderData.id);
        transaction.set(orderRef, updatedOrderData);

        for (const [productId, newQuantity] of Object.entries(productUpdates)) {
            const productRef = doc(db, 'products', productId);
            transaction.update(productRef, { quantity: newQuantity });
        }
    });
}


export async function cancelOrder(order: Order, productUpdates: { [productId: string]: number }): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', order.id);
        transaction.update(orderRef, { status: 'Cancelado' });

        for (const [productId, newQuantity] of Object.entries(productUpdates)) {
            const productRef = doc(db, 'products', productId);
            transaction.update(productRef, { quantity: newQuantity });
        }
    });
}

export async function completeOrder(orderId: string, note?: string): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
        const order = orderSnap.data();
        const updates: { status: string; notes?: string } = {
            status: 'Concluído'
        };
        if (note) {
            updates.notes = order.notes ? `${order.notes}\\n---\\n${note}` : note;
        }
        await updateDoc(orderRef, updates);
    }
}
