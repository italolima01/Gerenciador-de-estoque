
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { ProductWithStatus } from '@/lib/types';
import { getProducts } from '@/app/actions';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export function useProducts() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusPending, startStatusTransition] = useTransition();

    const fetchProducts = () => {
        startStatusTransition(async () => {
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

  return { products, isLoading: isLoading || isStatusPending, refetch: fetchProducts };
}
