
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/data';

export async function GET() {
  try {
    const productsCollectionRef = collection(db, 'products');

    // Create a batch to perform multiple writes at once.
    const batch = writeBatch(db);

    initialProducts.forEach((product) => {
      const productRef = doc(productsCollectionRef, product.id);
      batch.set(productRef, product);
    });

    // Commit the batch.
    await batch.commit();
    
    // Initialize orders collection only if it doesn't exist
    const ordersCollectionRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersCollectionRef);
    if (ordersSnapshot.empty) {
        // No need to add a document, the collection is created on first add.
    }
    
    return NextResponse.json({ success: true, message: 'Firestore database populated successfully.' });
  } catch (error) {
    console.error("Error populating Firestore database: ", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: 'Failed to populate Firestore database.', error: errorMessage }, { status: 500 });
  }
}
