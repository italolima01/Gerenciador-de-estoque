
'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const productsQuery = query(collection(db, 'products'), orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const fetchedProducts: Product[] = [];
      snapshot.forEach((doc) => {
        fetchedProducts.push({ ...doc.data() as Product });
      });
      setProducts(fetchedProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore read failed: " + error.message);
      setIsLoading(false);
      setProducts([]);
    });

    return () => unsubscribe();
  }, []);

  return { products, isLoading };
}
