
import { collection, getDocs, addDoc, doc, updateDoc, writeBatch, query, where, documentId, getDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import type { Order, Product } from "./types";

const productsCollection = collection(db, "products");
const ordersCollection = collection(db, "orders");

// Product Functions
export async function getProducts(): Promise<Product[]> {
    const snapshot = await getDocs(query(productsCollection));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const docRef = await addDoc(productsCollection, product);
    return docRef.id;
}

export async function updateProductQuantity(productId: string, newQuantity: number) {
    const productDoc = doc(db, "products", productId);
    await updateDoc(productDoc, { quantity: newQuantity });
}

export async function deleteProduct(productId: string) {
    const productDoc = doc(db, "products", productId);
    await deleteDoc(productDoc);
}

// Order Functions
export async function getOrders(): Promise<Order[]> {
    const snapshot = await getDocs(query(ordersCollection, orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
}

export async function addOrder(order: Omit<Order, 'id'>, productUpdates: {id: string, newQuantity: number}[]): Promise<string> {
    const batch = writeBatch(db);

    // Add the new order
    const newOrderRef = doc(ordersCollection);
    batch.set(newOrderRef, order);

    // Update product quantities
    productUpdates.forEach(update => {
        const productRef = doc(db, "products", update.id);
        batch.update(productRef, { quantity: update.newQuantity });
    });

    await batch.commit();
    return newOrderRef.id;
}


export async function updateOrder(orderId: string, orderData: Partial<Order>, productQuantityChanges: { [productId: string]: number }, allProducts: Product[]): Promise<void> {
    const batch = writeBatch(db);
    
    // Update the order
    const orderRef = doc(db, "orders", orderId);
    batch.update(orderRef, orderData);

    // Update product quantities
    for (const productId in productQuantityChanges) {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            const productRef = doc(db, "products", productId);
            const newQuantity = product.quantity + productQuantityChanges[productId];
            batch.update(productRef, { quantity: newQuantity });
        }
    }

    await batch.commit();
}

export async function updateOrderStatus(orderId: string, status: Order['status'], notes?: string): Promise<void> {
    const orderRef = doc(db, "orders", orderId);
    const updateData: { status: Order['status'], notes?: string } = { status };
    if (notes) {
        const orderSnap = await getDoc(orderRef);
        const currentOrder = orderSnap.data() as Order;
        updateData.notes = currentOrder.notes ? `${currentOrder.notes}\n---\n${notes}` : notes;
    }
    await updateDoc(orderRef, updateData);
}

export async function cancelOrder(order: Order, allProducts: Product[]): Promise<void> {
    const batch = writeBatch(db);

    // Delete the order
    const orderRef = doc(db, "orders", order.id);
    batch.delete(orderRef);

    // Restore product quantities
    order.items.forEach(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (product) {
            const productRef = doc(db, "products", item.productId);
            batch.update(productRef, { quantity: product.quantity + item.quantity });
        }
    });

    await batch.commit();
}
