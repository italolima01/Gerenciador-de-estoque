
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Order } from '@/lib/types';
import { getOrders } from '@/app/actions';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';


export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchOrders = () => {
    startTransition(async () => {
        setIsLoading(true);
        try {
            const fetchedOrders = await getOrders();
            setOrders(fetchedOrders);
        } catch(e) {
            console.error(e)
        } finally {
            setIsLoading(false);
        }
    });
  }

  useEffect(() => {
    const ordersRef = ref(db, 'orders');

    fetchOrders(); // Initial fetch

    const unsubscribe = onValue(ordersRef, () => {
        fetchOrders();
    });

    return () => unsubscribe();
  }, []);

  return { orders, isLoading: isLoading || isPending, refetch: fetchOrders };
}
