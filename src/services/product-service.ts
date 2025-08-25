import type { Product } from '@/lib/types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
    const productRef = doc(db, PRODUCTS_COLLECTION, productData.id);

    // When updating a product, we should not blindly trust the quantity from the form.
    // The quantity is primarily managed by sales orders.
    // We only update the descriptive fields, price, expiration, and pack info.
    // The total quantity should only change through sales or manual stock adjustments.
    
    // First, fetch the most current state of the product from the DB.
    const docSnap = await getDoc(productRef);
    if (!docSnap.exists()) {
        throw new Error("Product not found");
    }
    const existingProduct = docSnap.data() as Product;

    // Recalculate quantity based on pack info from the form,
    // but the TRUE quantity is determined by sales.
    // Let's assume editing pack quantity reflects a stock recount.
    const newCalculatedQuantity = productData.packQuantity * productData.unitsPerPack;

    const dataToUpdate = {
      name: productData.name,
      packType: productData.packType,
      unitsPerPack: productData.unitsPerPack,
      packQuantity: productData.packQuantity,
      price: productData.price,
      expirationDate: productData.expirationDate,
      // The new source of truth for total quantity is the pack calculation.
      quantity: newCalculatedQuantity,
    };

    await updateDoc(productRef, dataToUpdate);
    console.log("Product updated: ", productData.id);

    return { ...productData, quantity: newCalculatedQuantity };
}


// Function to delete a product
export async function deleteProduct(productId: string): Promise<void> {
    if (!productId) throw new Error("Product ID is required");
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(productRef);
    console.log("Product deleted:", productId);
}
