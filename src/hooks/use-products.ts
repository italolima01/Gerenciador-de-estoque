
'use client';

import { useState, useEffect, useTransition } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Product, ProductWithStatus } from '@/lib/types';
import { generateMultipleRestockAlerts } from '@/ai/flows/generate-multiple-restock-alerts';

export function useProducts() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusPending, startStatusTransition] = useTransition();

  useEffect(() => {
    const productsRef = ref(db, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        const productsList: Product[] = Object.keys(productsData).map(key => ({
            ...productsData[key],
            id: key
        }));
        
        startStatusTransition(async () => {
           try {
                const productsForAlert = productsList.map(p => ({
                    id: p.id,
                    productName: p.name,
                    currentStock: p.quantity,
                    averageDailySales: p.averageDailySales,
                    daysToRestock: p.daysToRestock,
                    expirationDate: p.expirationDate,
                }));

                const alerts = await generateMultipleRestockAlerts({ products: productsForAlert });
                
                const productsWithStatus = productsList.map(product => {
                    const alert = alerts.find(a => a.id === product.id);
                    return {
                        ...product,
                        zone: alert?.zone || 'yellow',
                        restockRecommendation: alert?.restockRecommendation || 'Could not determine status.',
                        confidenceLevel: alert?.confidenceLevel || 'low',
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));
                
                setProducts(productsWithStatus);
           } catch (error) {
                console.error("Error fetching AI status for products:", error);
                const productsWithFallbackStatus = productsList.map(p => ({
                    ...p,
                    zone: 'yellow',
                    restockRecommendation: 'Error fetching status.',
                    confidenceLevel: 'low',
                })).sort((a, b) => a.name.localeCompare(b.name));
                setProducts(productsWithFallbackStatus);
           }
        });

      } else {
        setProducts([]);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Firebase read failed: ", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { products, isLoading, isStatusPending };
}
