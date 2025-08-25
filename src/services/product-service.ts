import type { Product } from '@/lib/types';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

const PRODUCTS_COLLECTION = 'products';

// Function to get all products
export async function getProducts(): Promise<Product[]> {
    console.log("Fetching products from Firestore...");
    const productsCol = collection(db, PRODUCTS_COLLECTION);
    const productSnapshot = await getDocs(productsCol);
    const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    // Sort by name by default
    return productList.sort((a, b) => a.name.localeCompare(b.name));
}

// Function to add a new product
export async function addProduct(productData: Omit<Product, 'id' | 'quantity'>): Promise<Product> {
    const quantity = productData.packQuantity * productData.unitsPerPack;
    const newProductData = { ...productData, quantity };
    
    const productsCol = collection(db, PRODUCTS_COLLECTION);
    const docRef = await addDoc(productsCol, newProductData);
    console.log("Product added with ID: ", docRef.id);
    
    return { id: docRef.id, ...newProductData };
}

// Function to update an existing product
export async function updateProduct(productData: Product): Promise<Product> {
    const quantity = productData.packQuantity * productData.unitsPerPack;
    const updatedProductData = { ...productData, quantity };
    
    const productRef = doc(db, PRODUCTS_COLLECTION, updatedProductData.id);
    // We remove the id from the data being sent to Firestore
    const { id, ...dataToUpdate } = updatedProductData;
    await updateDoc(productRef, dataToUpdate);
    console.log("Product updated: ", id);
    
    return updatedProductData;
}

// Function to delete a product
export async function deleteProduct(productId: string): Promise<void> {
    if (!productId) throw new Error("Product ID is required");
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(productRef);
    console.log("Product deleted:", productId);
}
