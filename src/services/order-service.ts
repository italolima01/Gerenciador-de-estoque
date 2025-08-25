
import type { Order, Product } from '@/lib/types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products'; // Assuming product service is separate

// This is a simplified in-memory "database" for demonstration.
// In a real app, you would use a proper database like Firestore.
let memoryOrders: Order[] = [];
// We need access to products to adjust stock
let memoryProducts: Product[] = [
    {
    id: 'prod_001',
    name: 'Vinho Tinto Cabernet',
    packType: 'Caixa',
    unitsPerPack: 6,
    packQuantity: 5,
    quantity: 30,
    price: 75.50,
    expirationDate: '2025-12-20',
  },
  {
    id: 'prod_002',
    name: 'Cerveja Artesanal IPA',
    packType: 'Fardo',
    unitsPerPack: 12,
    packQuantity: 12,
    quantity: 150,
    price: 12.99,
    expirationDate: '2024-11-15',
  },
  {
    id: 'prod_003',
    name: 'Whisky Escocês 12 Anos',
    packType: 'Caixa',
    unitsPerPack: 1,
    packQuantity: 15,
    quantity: 15,
    price: 189.90,
    expirationDate: '2030-01-01',
  },
  {
    id: 'prod_004',
    name: 'Refrigerante de Cola',
    packType: 'Fardo',
    unitsPerPack: 6,
    packQuantity: 3,
    quantity: 20,
    price: 5.00,
    expirationDate: '2024-10-30',
  },
  {
    id: 'prod_005',
    name: 'Água Mineral com Gás',
    packType: 'Fardo',
    unitsPerPack: 12,
    packQuantity: 16,
    quantity: 200,
    price: 3.50,
    expirationDate: '2025-08-01',
  },
  {
    id: 'prod_006',
    name: 'Suco de Laranja Integral',
    packType: 'Caixa',
    unitsPerPack: 8,
    packQuantity: 5,
    quantity: 40,
    price: 8.75,
    expirationDate: '2024-09-10',
  },
    {
    id: 'prod_007',
    name: 'Vodka Premium',
    packType: 'Caixa',
    unitsPerPack: 1,
    packQuantity: 25,
    quantity: 25,
    price: 95.00,
    expirationDate: '2028-06-01',
  },
  {
    id: 'prod_008',
    name: 'Champanhe Brut',
    packType: 'Caixa',
    unitsPerPack: 1,
    packQuantity: 10,
    quantity: 10,
    price: 250.00,
    expirationDate: '2026-05-20',
  },
];


// Mock function to simulate network delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get all orders
export async function getOrders(): Promise<Order[]> {
    console.log("Fetching orders...");
    await sleep(500);
    // Sort by creation date descending
    return [...memoryOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Function to add a new order and update product stock
export async function addOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<{ newOrder: Order, updatedProducts: Product[] }> {
    await sleep(500);
    
    const updatedProducts: Product[] = [];

    // This block should be a transaction in a real DB
    for (const item of orderData.items) {
        const productIndex = memoryProducts.findIndex(p => p.id === item.productId);
        if (productIndex === -1) {
            throw new Error(`Produto ${item.productName} não encontrado.`);
        }
        const product = memoryProducts[productIndex];
        if (product.quantity < item.quantity) {
            throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product.quantity}`);
        }
        const newQuantity = product.quantity - item.quantity;
        const updatedProduct = { ...product, quantity: newQuantity };
        memoryProducts[productIndex] = updatedProduct;
        updatedProducts.push(updatedProduct);
    }
    // End transaction block

    const newOrder: Order = {
        ...orderData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        status: 'Pendente',
    };

    memoryOrders.unshift(newOrder); // Add to the beginning
    console.log("Order added:", newOrder);
    return { newOrder, updatedProducts };
}

// Function to update an existing order and adjust stock accordingly
export async function updateOrder(orderData: Order, adjustStock: boolean = true): Promise<{ updatedOrder: Order, updatedProducts: Product[] }> {
    await sleep(500);

    const originalOrderIndex = memoryOrders.findIndex(o => o.id === orderData.id);
    if (originalOrderIndex === -1) {
        throw new Error("Pedido original não encontrado.");
    }
    const originalOrder = memoryOrders[originalOrderIndex];
    const updatedProducts: Product[] = [];

    if (adjustStock) {
        const stockAdjustments: { [productId: string]: number } = {};

        // Add back original quantities
        for (const item of originalOrder.items) {
            stockAdjustments[item.productId] = (stockAdjustments[item.productId] || 0) + item.quantity;
        }

        // Subtract new quantities
        for (const item of orderData.items) {
            stockAdjustments[item.productId] = (stockAdjustments[item.productId] || 0) - item.quantity;
        }

        // Apply adjustments in a "transaction"
        for (const productId in stockAdjustments) {
            const productIndex = memoryProducts.findIndex(p => p.id === productId);
            if (productIndex === -1) {
                throw new Error(`Produto com ID ${productId} não encontrado.`);
            }
            const product = memoryProducts[productIndex];
            const newQuantity = product.quantity + stockAdjustments[productId];
            if (newQuantity < 0) {
                throw new Error(`Estoque insuficiente para ${product.name}.`);
            }
            const updatedProduct = { ...product, quantity: newQuantity };
            memoryProducts[productIndex] = updatedProduct;
            updatedProducts.push(updatedProduct);
        }
    }
    
    memoryOrders[originalOrderIndex] = orderData;
    console.log("Order updated:", orderData);

    return { updatedOrder: orderData, updatedProducts };
}

// Function to delete an order and return items to stock if it was pending
export async function deleteOrder(orderId: string): Promise<Product[]> {
    await sleep(500);
    const orderIndex = memoryOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
        throw new Error("Order not found");
    }
    const orderToDelete = memoryOrders[orderIndex];
    const updatedProducts: Product[] = [];

    if (orderToDelete.status === 'Pendente') {
        // Return items to stock in a "transaction"
        for (const item of orderToDelete.items) {
            const productIndex = memoryProducts.findIndex(p => p.id === item.productId);
            if (productIndex !== -1) {
                const product = memoryProducts[productIndex];
                const newQuantity = product.quantity + item.quantity;
                const updatedProduct = { ...product, quantity: newQuantity };
                memoryProducts[productIndex] = updatedProduct;
                updatedProducts.push(updatedProduct);
            }
        }
    }

    memoryOrders.splice(orderIndex, 1);
    console.log("Order deleted:", orderId);
    return updatedProducts;
}
