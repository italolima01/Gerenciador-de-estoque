
'use server';

import { findRelevantProducts } from '@/ai/flows/find-relevant-products';
import { generateRestockAlert } from '@/ai/flows/generate-restock-alert';
import type { Product, Order, GenerateRestockAlertOutput } from '@/lib/types';
import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    addDoc,
    deleteDoc, 
    updateDoc, 
    runTransaction,
    getDoc,
    serverTimestamp,
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

export async function registerOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<void> {
    
    await runTransaction(db, async (transaction) => {
        const newOrderRef = doc(collection(db, "orders"));
        
        // 1. Validate stock and prepare product updates
        const productUpdates: { ref: any, newQuantity: number }[] = [];
        for (const item of orderData.items) {
            const productRef = doc(db, 'products', item.productId);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error(`Produto com ID ${item.productId} não encontrado.`);
            }
            const currentQuantity = productDoc.data().quantity;
            if (currentQuantity < item.quantity) {
                throw new Error(`Estoque insuficiente para ${item.productName}.`);
            }
            productUpdates.push({ ref: productRef, newQuantity: currentQuantity - item.quantity });
        }

        // 2. Create the order
        const newOrder: Omit<Order, 'id'> = {
            ...orderData,
            createdAt: new Date().toISOString(),
            status: 'Pendente',
        };
        transaction.set(newOrderRef, newOrder);
        transaction.update(newOrderRef, { id: newOrderRef.id });


        // 3. Apply stock updates
        for (const update of productUpdates) {
            transaction.update(update.ref, { quantity: update.newQuantity });
        }
    });
}

export async function updateOrder(updatedOrderData: Order, originalOrder: Order): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', updatedOrderData.id);

        const productQuantityChanges: { [productId: string]: number } = {};
        
        // Add back original quantities
        for (const item of originalOrder.items) {
            productQuantityChanges[item.productId] = (productQuantityChanges[item.productId] || 0) + item.quantity;
        }
        
        // Subtract new quantities
        for (const item of updatedOrderData.items) {
            productQuantityChanges[item.productId] = (productQuantityChanges[item.productId] || 0) - item.quantity;
        }

        // Validate stock and prepare updates
        const productUpdates: { ref: any, newQuantity: number }[] = [];
        for (const productId in productQuantityChanges) {
            const change = productQuantityChanges[productId];
            if (change === 0) continue;

            const productRef = doc(db, 'products', productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                throw new Error(`Produto com ID ${productId} não encontrado.`);
            }
            
            const currentQuantity = productDoc.data().quantity;
            const newQuantity = currentQuantity - change;

            if (newQuantity < 0) {
                 throw new Error(`Estoque insuficiente para o produto atualizado.`);
            }
            productUpdates.push({ ref: productRef, newQuantity: newQuantity });
        }

        // Apply updates
        transaction.set(orderRef, updatedOrderData);
        for (const update of productUpdates) {
            transaction.update(update.ref, { quantity: update.newQuantity });
        }
    });
}


export async function cancelOrder(order: Order): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', order.id);

        // Prepare stock updates
        const productUpdates: { ref: any, newQuantity: number }[] = [];
        for (const item of order.items) {
            const productRef = doc(db, 'products', item.productId);
            const productDoc = await transaction.get(productRef);
            if (productDoc.exists()) {
                const currentQuantity = productDoc.data().quantity;
                productUpdates.push({ ref: productRef, newQuantity: currentQuantity + item.quantity });
            }
        }
        
        // Apply updates
        transaction.update(orderRef, { status: 'Cancelado' });
        for (const update of productUpdates) {
            transaction.update(update.ref, { quantity: update.newQuantity });
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
