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
    const productRef = doc(db, PRODUCTS_COLLECTION, productData.id);

    // Recalculate quantity based on packs, but preserve existing quantity
    // The quantity is now managed by orders, so we only update based on pack info
    // if it's a new product. For updates, we keep the existing quantity.
    const updatedProductData = {
        ...productData,
        quantity: productData.packQuantity * productData.unitsPerPack, // This will be overriden if the product exists
    };
    
    const docSnap = await getDoc(productRef);
    if (docSnap.exists()) {
        const existingProduct = docSnap.data() as Product;
        // Keep the existing quantity, as it's modified by sales.
        updatedProductData.quantity = existingProduct.quantity;
    }
    
    const { id, ...dataToUpdate } = updatedProductData;
    await updateDoc(productRef, dataToUpdate);
    console.log("Product updated: ", id);
    
    // We only update pack info, the quantity itself is updated via orders.
    // However, if the user changes the pack quantity, we should reflect that.
    // Let's assume for now that editing a product doesn't change the physical stock count
    // without a separate stock-taking operation.
    // The code as is updates properties but not the 'quantity' which is correct.
    // Let's recalculate based on the new pack info, but this might be desired behavior
    const finalQuantity = productData.packQuantity * productData.unitsPerPack;
    const finalProductData = { ...productData, quantity: finalQuantity };
    const { id: finalId, ...finalDataToUpdate } = finalProductData;
    await updateDoc(productRef, finalDataToUpdate);


    return finalProductData;
}

// Function to delete a product
export async function deleteProduct(productId: string): Promise<void> {
    if (!productId) throw new Error("Product ID is required");
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(productRef);
    console.log("Product deleted:", productId);
}
