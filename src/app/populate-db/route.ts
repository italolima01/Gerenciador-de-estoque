
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';

const products = [
  {
    id: 'prod_001',
    name: 'Vinho Tinto Cabernet',
    quantity: 30,
    price: 75.50,
    expirationDate: '2025-12-20',
    averageDailySales: 2,
    daysToRestock: 10,
  },
  {
    id: 'prod_002',
    name: 'Cerveja Artesanal IPA',
    quantity: 150,
    price: 12.99,
    expirationDate: '2024-11-15',
    averageDailySales: 20,
    daysToRestock: 5,
  },
  {
    id: 'prod_003',
    name: 'Whisky Escocês 12 Anos',
    quantity: 15,
    price: 189.90,
    expirationDate: '2030-01-01',
    averageDailySales: 1,
    daysToRestock: 14,
  },
  {
    id: 'prod_004',
    name: 'Refrigerante de Cola',
    quantity: 20,
    price: 5.00,
    expirationDate: '2024-10-30',
    averageDailySales: 8,
    daysToRestock: 3,
  },
  {
    id: 'prod_005',
    name: 'Água Mineral com Gás',
    quantity: 200,
    price: 3.50,
    expirationDate: '2025-08-01',
    averageDailySales: 30,
    daysToRestock: 2,
  },
  {
    id: 'prod_006',
    name: 'Suco de Laranja Integral',
    quantity: 40,
    price: 8.75,
    expirationDate: '2024-09-10',
    averageDailySales: 5,
    daysToRestock: 4,
  },
    {
    id: 'prod_007',
    name: 'Vodka Premium',
    quantity: 25,
    price: 95.00,
    expirationDate: '2028-06-01',
    averageDailySales: 3,
    daysToRestock: 7,
  },
  {
    id: 'prod_008',
    name: 'Champanhe Brut',
    quantity: 10,
    price: 250.00,
    expirationDate: '2026-05-20',
    averageDailySales: 0.5,
    daysToRestock: 20,
  },
];

export async function GET() {
  try {
    const productsRef = ref(db, 'products');
    const dataToUpload = products.reduce((acc, product) => {
        const { id, ...rest } = product;
        acc[id] = rest;
        return acc;
    }, {} as any);

    await set(productsRef, dataToUpload);
    
    return NextResponse.json({ success: true, message: 'Database populated successfully.' });
  } catch (error) {
    console.error("Error populating database: ", error);
    return NextResponse.json({ success: false, message: 'Failed to populate database.' }, { status: 500 });
  }
}
