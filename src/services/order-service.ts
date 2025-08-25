
import type { Order, Product } from '@/lib/types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction, DocumentReference, DocumentSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';

const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products';

// Function to get all orders
export async function getOrders(): Promise<Order[]> {
    console.log("Fetching orders from Firestore...");
    const ordersCol = collection(db, ORDERS_COLLECTION);
    const orderSnapshot = await getDocs(ordersCol);
    const orderList = orderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    // Sort by creation date descending
    return orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Function to add a new order and update product stock using a transaction
export async function addOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<{ newOrder: Order, updatedProducts: Product[] }> {
    const newOrderRef = doc(collection(db, ORDERS_COLLECTION));
    const updatedProducts: Product[] = [];

    await runTransaction(db, async (transaction) => {
        // 1. READ all product documents first
        const productRefs = orderData.items.map(item => doc(db, PRODUCTS_COLLECTION, item.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // 2. VALIDATE the data and prepare writes
        const productUpdates: { ref: DocumentReference, newQuantity: number }[] = [];
        
        for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            const productDoc = productDocs[i];

            if (!productDoc.exists()) {
                throw new Error(`Produto ${item.productName} não encontrado.`);
            }
            
            const product = productDoc.data() as Product;
            if (product.quantity < item.quantity) {
                throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product.quantity}`);
            }

            const newQuantity = product.quantity - item.quantity;
            productUpdates.push({ ref: productRefs[i], newQuantity });
            updatedProducts.push({ ...product, id: productDoc.id, quantity: newQuantity });
        }

        // 3. EXECUTE all writes
        for (const update of productUpdates) {
            transaction.update(update.ref, { quantity: update.newQuantity });
        }
        
        const newOrder: Order = {
            ...orderData,
            id: newOrderRef.id,
            createdAt: new Date().toISOString(),
            status: 'Pendente',
        };
        transaction.set(newOrderRef, newOrder);
    });

    console.log("Order added with ID:", newOrderRef.id);
    const finalNewOrderDoc = await getDoc(newOrderRef);
    const finalNewOrder = finalNewOrderDoc.data() as Order;
    return { newOrder: { ...finalNewOrder, id: newOrderRef.id }, updatedProducts };
}

// Function to update an existing order and adjust stock accordingly
export async function updateOrder(orderData: Order, adjustStock: boolean = true): Promise<{ updatedOrder: Order, updatedProducts: Product[] }> {
    const orderRef = doc(db, ORDERS_COLLECTION, orderData.id);
    const updatedProducts: Product[] = [];

    await runTransaction(db, async (transaction) => {
        // 1. READ all necessary documents
        const originalOrderDoc = await transaction.get(orderRef);
        if (!originalOrderDoc.exists()) {
            throw new Error("Pedido original não encontrado.");
        }
        const originalOrder = originalOrderDoc.data() as Order;
        
        const productIds = new Set([
            ...originalOrder.items.map(item => item.productId),
            ...orderData.items.map(item => item.productId)
        ]);
        
        const productRefs = Array.from(productIds).map(id => doc(db, PRODUCTS_COLLECTION, id));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // 2. VALIDATE and PREPARE writes
        const productUpdates: { ref: DocumentReference, newQuantity: number }[] = [];

        if (adjustStock) {
            const stockAdjustments: { [productId: string]: number } = {};
            
            for (const item of originalOrder.items) {
                stockAdjustments[item.productId] = (stockAdjustments[item.productId] || 0) + item.quantity;
            }
            for (const item of orderData.items) {
                stockAdjustments[item.productId] = (stockAdjustments[item.productId] || 0) - item.quantity;
            }

            const productMap = new Map(productDocs.map(d => [d.id, d.data() as Product]));

            for (let i = 0; i < productRefs.length; i++) {
                const productRef = productRefs[i];
                const productId = productRef.id;
                const adjustment = stockAdjustments[productId] || 0;

                if (adjustment !== 0) {
                    const product = productMap.get(productId);
                    if (!product) throw new Error(`Produto com ID ${productId} não encontrado.`);
                    
                    const newQuantity = product.quantity + adjustment;
                    if (newQuantity < 0) {
                        throw new Error(`Estoque insuficiente para ${product.name}.`);
                    }
                    productUpdates.push({ ref: productRef, newQuantity });
                    updatedProducts.push({ ...product, id: productId, quantity: newQuantity });
                }
            }
        }
        
        // 3. EXECUTE all writes
        for (const update of productUpdates) {
            transaction.update(update.ref, { quantity: update.newQuantity });
        }

        const { id, ...dataToUpdate } = orderData;
        transaction.update(orderRef, dataToUpdate);
    });

    console.log("Order updated:", orderData.id);
    // Find non-updated products to return a complete list
    const returnedProductIds = new Set(updatedProducts.map(p => p.id));
    const allProductIdsInvolved = new Set(orderData.items.map(i => i.productId));
    for (const productId of allProductIdsInvolved) {
        if (!returnedProductIds.has(productId)) {
            const productDoc = await getDoc(doc(db, PRODUCTS_COLLECTION, productId));
            if (productDoc.exists()) {
                updatedProducts.push({id: productId, ...productDoc.data()} as Product);
            }
        }
    }


    return { updatedOrder: orderData, updatedProducts };
}

// Function to delete an order and return items to stock if it was pending
export async function deleteOrder(orderId: string): Promise<Product[]> {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const updatedProducts: Product[] = [];

    await runTransaction(db, async (transaction) => {
        // 1. READ all necessary documents
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) {
            throw new Error("Order not found");
        }
        const orderToDelete = orderDoc.data() as Order;

        if (orderToDelete.status === 'Pendente') {
            const productRefs = orderToDelete.items.map(item => doc(db, PRODUCTS_COLLECTION, item.productId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            // 2. PREPARE writes
            const productUpdates: { ref: DocumentReference, newQuantity: number }[] = [];
            for (let i = 0; i < orderToDelete.items.length; i++) {
                const item = orderToDelete.items[i];
                const productDoc = productDocs[i];
                if (productDoc.exists()) {
                    const product = productDoc.data() as Product;
                    const newQuantity = product.quantity + item.quantity;
                    productUpdates.push({ ref: productRefs[i], newQuantity });
                    updatedProducts.push({ ...product, id: productDoc.id, quantity: newQuantity });
                }
            }

            // 3. EXECUTE writes
            for (const update of productUpdates) {
                transaction.update(update.ref, { quantity: update.newQuantity });
            }
        }
        
        // Final write: delete the order
        transaction.delete(orderRef);
    });
    
    console.log("Order deleted:", orderId);
    return updatedProducts;
}
