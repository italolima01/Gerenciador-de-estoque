
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import { products as initialProducts } from '@/lib/data';

export async function GET() {
  try {
    const productsRef = ref(db, 'products');
    const dataToUpload = initialProducts.reduce((acc, product) => {
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
