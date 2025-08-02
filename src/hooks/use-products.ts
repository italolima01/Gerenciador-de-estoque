
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Product } from '@/lib/types';
import { getProducts } from '@/app/actions';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

    const fetchProducts = () => {
        startTransition(async () => {
            setIsLoading(true);
            try {
                const fetchedProducts = await getProducts();
                setProducts(fetchedProducts);
            } catch(e) {
                console.error(e);
                 setProducts([]);
            } finally {
                setIsLoading(false);
            }
        });
    }

  useEffect(() => {
    const productsRef = ref(db, 'products');
    
    // Initial fetch
    fetchProducts();

    // Listen for realtime updates
    const unsubscribe = onValue(productsRef, () => {
        fetchProducts();
    });

    return () => unsubscribe();
  }, []);

  return { products, isLoading: isLoading || isPending, refetch: fetchProducts };
}
