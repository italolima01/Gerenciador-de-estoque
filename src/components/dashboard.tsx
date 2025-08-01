
'use client';

import { useState, useEffect, useTransition } from 'react';
import { PlusCircle } from 'lucide-react';

import type { ProductWithStatus, Product, Order, OrderItem } from '@/lib/types';
import { getInitialProducts, getProductStatus } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { AddProductSheet } from '@/components/add-product-sheet';
import { SellProductDialog } from '@/components/sell-product-dialog';
import { RestockAlertDialog } from '@/components/restock-alert-dialog';
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderRegistrationForm } from './order-registration-form';
import { RegisteredOrdersList } from './registered-orders-list';
import { OrderDetailsDialog } from './order-details-dialog';

export function Dashboard() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<ProductWithStatus | null>(null);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<ProductWithStatus | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getInitialProducts().then((initialProducts) => {
      setProducts(initialProducts);
      setIsLoading(false);
    });
  }, []);

  const handleAddProduct = (newProduct: Product) => {
    startTransition(async () => {
      const status = await getProductStatus(newProduct);
      setProducts(prev => [{...newProduct, ...status}, ...prev]);
      setAddSheetOpen(false);
    });
  };

  const handleSellProduct = (product: ProductWithStatus, quantitySold: number) => {
    const updatedProductBase = {
      ...product,
      quantity: Math.max(0, product.quantity - quantitySold),
    };

    startTransition(async () => {
      const status = await getProductStatus(updatedProductBase);
      setProducts(prev => prev.map(p => p.id === product.id ? {...updatedProductBase, ...status} : p));
      setSelectedProductForSale(null);
    });
  };
  
  const handleOrderSubmit = (newOrderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    startTransition(async () => {
      const orderedItems = newOrderData.items.map(item => ({ id: item.productId, quantity: item.quantity }));
      const updatedProducts = await Promise.all(
        products.map(async (p) => {
          const orderedItem = orderedItems.find(item => item.id === p.id);
          if (orderedItem) {
            const updatedQuantity = p.quantity - orderedItem.quantity;
            const updatedProductBase = { ...p, quantity: updatedQuantity };
            const status = await getProductStatus(updatedProductBase);
            return { ...updatedProductBase, ...status };
          }
          return p;
        })
      );
      setProducts(updatedProducts);

      const newOrder: Order = {
        ...newOrderData,
        id: `order_${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'Pendente',
      };
      setOrders(prev => [newOrder, ...prev]);
    });
  };

  const handleOrderStatusChange = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };


  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Logo />
             <Button onClick={() => setAddSheetOpen(true)} className='hidden sm:inline-flex'>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produto
            </Button>
        </div>
      </header>
        
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="inventory">
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="inventory">Estoque</TabsTrigger>
              <TabsTrigger value="registerOrder">Registrar Pedido</TabsTrigger>
              <TabsTrigger value="orders">Pedidos Registrados</TabsTrigger>
            </TabsList>
             <Button onClick={() => setAddSheetOpen(true)} className='sm:hidden'>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar
            </Button>
          </div>
          <TabsContent value="inventory">
            <div className="mb-6">
                <h2 className="font-headline text-3xl font-bold tracking-tight">Painel de Controle de Estoque</h2>
                <p className="text-muted-foreground">Monitore e gerencie o inventário de suas bebidas.</p>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-[200px] w-full rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSellClick={() => setSelectedProductForSale(product)}
                    onAlertClick={() => setSelectedProductForAlert(product)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="registerOrder">
             <div className="mb-6">
                <h2 className="font-headline text-3xl font-bold tracking-tight">Registro de Pedidos</h2>
                <p className="text-muted-foreground">Crie um novo pedido para um cliente.</p>
            </div>
             <OrderRegistrationForm 
                products={products}
                onSubmit={handleOrderSubmit}
                isPending={isPending}
            />
          </TabsContent>
           <TabsContent value="orders">
             <div className="mb-6">
                <h2 className="font-headline text-3xl font-bold tracking-tight">Pedidos Registrados</h2>
                <p className="text-muted-foreground">Visualize e gerencie todos os pedidos dos clientes.</p>
            </div>
             <RegisteredOrdersList 
                orders={orders}
                onStatusChange={handleOrderStatusChange}
                onOrderSelect={setSelectedOrderForDetails}
            />
          </TabsContent>
        </Tabs>
      </main>

      <AddProductSheet
        isOpen={isAddSheetOpen}
        onOpenChange={setAddSheetOpen}
        onProductAdd={handleAddProduct}
        isPending={isPending}
      />

      {selectedProductForSale && (
        <SellProductDialog
          product={selectedProductForSale}
          isOpen={!!selectedProductForSale}
          onOpenChange={() => setSelectedProductForSale(null)}
          onSell={handleSellProduct}
          isPending={isPending}
        />
      )}
      
      {selectedProductForAlert && (
        <RestockAlertDialog
          product={selectedProductForAlert}
          isOpen={!!selectedProductForAlert}
          onOpenChange={() => setSelectedProductForAlert(null)}
        />
      )}

      {selectedOrderForDetails && (
        <OrderDetailsDialog
          order={selectedOrderForDetails}
          isOpen={!!selectedOrderForDetails}
          onOpenChange={() => setSelectedOrderForDetails(null)}
        />
      )}
    </>
  );
}

