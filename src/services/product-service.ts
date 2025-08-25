
import type { Product } from '@/lib/types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

const PRODUCTS_COLLECTION = 'products';

// Mock function to simulate network delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// This is a simplified in-memory "database" for demonstration.
// In a real app, you would use a proper database like Firestore.
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

// Function to get all products
export async function getProducts(): Promise<Product[]> {
    console.log("Fetching products...");
    await sleep(500); // Simulate delay
    // Sort by name by default
    return [...memoryProducts].sort((a, b) => a.name.localeCompare(b.name));
}

// Function to add a new product
export async function addProduct(productData: Omit<Product, 'id' | 'quantity'>): Promise<Product> {
    await sleep(500);
    const quantity = productData.packQuantity * productData.unitsPerPack;
    const newProduct: Product = {
        id: uuidv4(),
        ...productData,
        quantity,
    };
    memoryProducts.push(newProduct);
    console.log("Product added:", newProduct);
    return newProduct;
}

// Function to update an existing product
export async function updateProduct(productData: Product): Promise<Product> {
    await sleep(500);
    const quantity = productData.packQuantity * productData.unitsPerPack;
    const updatedProduct = { ...productData, quantity };

    const index = memoryProducts.findIndex(p => p.id === updatedProduct.id);
    if (index === -1) {
        throw new Error("Product not found");
    }
    memoryProducts[index] = updatedProduct;
    console.log("Product updated:", updatedProduct);
    return updatedProduct;
}

// Function to delete a product
export async function deleteProduct(productId: string): Promise<void> {
    await sleep(500);
    const index = memoryProducts.findIndex(p => p.id === productId);
    if (index === -1) {
        throw new Error("Product not found");
    }
    memoryProducts.splice(index, 1);
    console.log("Product deleted:", productId);
}
