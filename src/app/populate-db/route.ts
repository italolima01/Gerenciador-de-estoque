
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/data';

export async function GET() {
  try {
    const productsCollectionRef = collection(db, 'products');
    const ordersCollectionRef = collection(db, 'orders');

    // Check if products already exist to avoid duplication
    const productsSnapshot = await getDocs(productsCollectionRef);
    if (!productsSnapshot.empty) {
        return NextResponse.json({ success: true, message: 'Firestore database already contains data. Population skipped.' });
    }

    // Create a batch to perform multiple writes at once.
    const batch = writeBatch(db);

    for (const product of initialProducts) {
      // Create a new document reference with an auto-generated ID
      const productRef = doc(productsCollectionRef);
      // The product data (including its own `id` field) is set on this new document.
      batch.set(productRef, product);
    }

    // Commit the batch.
    await batch.commit();

    // Check if orders collection is empty, just for info.
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
