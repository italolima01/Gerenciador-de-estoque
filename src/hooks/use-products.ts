
'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const productsRef = ref(db, 'products');

    const unsubscribe = onValue(productsRef, (snapshot) => {
      setIsLoading(true);
      if (snapshot.exists()) {
        const productsObject = snapshot.val();
        const fetchedProducts: Product[] = Object.keys(productsObject).map(key => ({
          ...productsObject[key]
        }));
        setProducts(fetchedProducts.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setProducts([]);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Firebase read failed: " + error.message);
        setIsLoading(false);
        setProducts([]);
    });

    return () => unsubscribe();
  }, []);

  return { products, isLoading };
}
