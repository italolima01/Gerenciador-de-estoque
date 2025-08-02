
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { ProductWithStatus } from '@/lib/types';
import { getProducts } from '@/app/actions';

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
    fetchProducts();
  }, []);

  return { products, isLoading: isLoading || isStatusPending, refetch: fetchProducts };
}
