
'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';


export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ordersRef = ref(db, 'orders');

    const unsubscribe = onValue(ordersRef, (snapshot) => {
        setIsLoading(true);
        if (snapshot.exists()) {
            const ordersObject = snapshot.val();
            const fetchedOrders: Order[] = Object.keys(ordersObject).map(key => ({
                ...ordersObject[key]
            }));
            setOrders(fetchedOrders.reverse());
        } else {
            setOrders([]);
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Firebase read failed: " + error.message);
        setIsLoading(false);
        setOrders([]);
    });

    return () => unsubscribe();
  }, []);

  return { orders, isLoading };
}
