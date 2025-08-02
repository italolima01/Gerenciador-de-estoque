
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Order } from '@/lib/types';
import { getOrders } from '@/app/actions';

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
    fetchOrders();
  }, []);

  return { orders, isLoading: isLoading || isPending, refetch: fetchOrders };
}
