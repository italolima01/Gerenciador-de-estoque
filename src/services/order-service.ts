import type { Order, Product } from '@/lib/types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
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
        for (const item of orderData.items) {
            const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                throw new Error(`Produto ${item.productName} não encontrado.`);
            }

            const product = productDoc.data() as Product;
            if (product.quantity < item.quantity) {
                throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product.quantity}`);
            }
            
            const newQuantity = product.quantity - item.quantity;
            transaction.update(productRef, { quantity: newQuantity });
            updatedProducts.push({ ...product, id: productDoc.id, quantity: newQuantity });
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
    const finalNewOrder = (await getDoc(newOrderRef)).data() as Order;
    return { newOrder: { ...finalNewOrder, id: newOrderRef.id }, updatedProducts };
}

// Function to update an existing order and adjust stock accordingly
export async function updateOrder(orderData: Order, adjustStock: boolean = true): Promise<{ updatedOrder: Order, updatedProducts: Product[] }> {
    const orderRef = doc(db, ORDERS_COLLECTION, orderData.id);
    const updatedProducts: Product[] = [];

    await runTransaction(db, async (transaction) => {
        if (adjustStock) {
            const originalOrderDoc = await transaction.get(orderRef);
            if (!originalOrderDoc.exists()) {
                throw new Error("Pedido original não encontrado.");
            }
            const originalOrder = originalOrderDoc.data() as Order;
            const stockAdjustments: { [productId: string]: number } = {};

            // Add back original quantities
            for (const item of originalOrder.items) {
                stockAdjustments[item.productId] = (stockAdjustments[item.productId] || 0) + item.quantity;
            }

            // Subtract new quantities
            for (const item of orderData.items) {
                stockAdjustments[item.productId] = (stockAdjustments[item.productId] || 0) - item.quantity;
            }

            // Apply adjustments
            for (const productId in stockAdjustments) {
                const productRef = doc(db, PRODUCTS_COLLECTION, productId);
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) throw new Error(`Produto com ID ${productId} não encontrado.`);
                
                const product = productDoc.data() as Product;
                const newQuantity = product.quantity + stockAdjustments[productId];

                if (newQuantity < 0) {
                     throw new Error(`Estoque insuficiente para ${product.name}.`);
                }
                transaction.update(productRef, { quantity: newQuantity });
                updatedProducts.push({ ...product, id: productDoc.id, quantity: newQuantity });
            }
        }
        
        const { id, ...dataToUpdate } = orderData;
        transaction.update(orderRef, dataToUpdate);
    });

    console.log("Order updated:", orderData.id);
    return { updatedOrder: orderData, updatedProducts };
}

// Function to delete an order and return items to stock if it was pending
export async function deleteOrder(orderId: string): Promise<Product[]> {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const updatedProducts: Product[] = [];

    await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) {
            throw new Error("Order not found");
        }
        const orderToDelete = orderDoc.data() as Order;

        if (orderToDelete.status === 'Pendente') {
            for (const item of orderToDelete.items) {
                const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                    const product = productDoc.data() as Product;
                    const newQuantity = product.quantity + item.quantity;
                    transaction.update(productRef, { quantity: newQuantity });
                    updatedProducts.push({ ...product, id: productDoc.id, quantity: newQuantity });
                }
            }
        }
        transaction.delete(orderRef);
    });
    
    console.log("Order deleted:", orderId);
    return updatedProducts;
}
