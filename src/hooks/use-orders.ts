
'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Order } from '@/lib/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ordersRef = query(ref(db, 'orders'), orderByChild('createdAt'));
    
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const ordersData = snapshot.val();
        const ordersList: Order[] = Object.keys(ordersData).map(key => ({
          ...ordersData[key],
          id: key,
        })).reverse(); // reverse to show newest first
        setOrders(ordersList);
      } else {
        setOrders([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase read failed: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { orders, isLoading };
}
