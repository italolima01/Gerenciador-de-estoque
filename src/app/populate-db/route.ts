
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import { products as initialProducts } from '@/lib/data';

export async function GET() {
  try {
    const productsRef = ref(db, 'products');
    
    // Transform data to match the structure where Firebase key is the unique ID
    // and the product data (including its own 'id' field) is the value.
    const dataToUpload = initialProducts.reduce((acc, product) => {
        // The product object itself already contains the ID.
        // We will let Firebase generate the unique key for the entry.
        // The prompt seems to imply a different structure. Let's fix this to be consistent.
        // The issue is that getProducts expects an object where keys are firebase IDs.
        // And `addProduct` uses push to create new ones.
        // The initial data has hardcoded IDs. When we use set, it overwrites the whole `products` node.
        // Let's use the product id as the key for initial population.
        acc[product.id] = product;
        return acc;
    }, {} as any);

    await set(productsRef, dataToUpload);
    
    // Initialize orders only if it doesn't exist
    const ordersRef = ref(db, 'orders');
    const ordersSnapshot = await get(ordersRef);
    if (!ordersSnapshot.exists()) {
        await set(ordersRef, {});
    }
    
    return NextResponse.json({ success: true, message: 'Database populated successfully.' });
  } catch (error) {
    console.error("Error populating database: ", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: 'Failed to populate database.', error: errorMessage }, { status: 500 });
  }
}
