'use client';

import { useState, useEffect, useTransition } from 'react';
import { PlusCircle } from 'lucide-react';

import type { ProductWithStatus, Product } from '@/lib/types';
import { getInitialProducts, getProductStatus } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { AddProductSheet } from '@/components/add-product-sheet';
import { SellProductDialog } from '@/components/sell-product-dialog';
import { RestockAlertDialog } from '@/components/restock-alert-dialog';
import { Logo } from '@/components/logo';
import { SidebarTrigger, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export function DashboardSidebar() {
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAddProduct = (newProduct: Product) => {
    startTransition(async () => {
      // In a real app, this would likely trigger a state update in the parent
      // For now, we'll just log it and close the sheet.
      const status = await getProductStatus(newProduct);
      console.log('New product with status', { ...newProduct, ...status });
      setAddSheetOpen(false);
    });
  };
  
  return (
    <>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setAddSheetOpen(true)}>
              <PlusCircle />
              Adicionar Produto
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
       <AddProductSheet
        isOpen={isAddSheetOpen}
        onOpenChange={setAddSheetOpen}
        onProductAdd={handleAddProduct}
        isPending={isPending}
      />
    </>
  );
}


export function Dashboard() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<ProductWithStatus | null>(null);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<ProductWithStatus | null>(null);
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

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <Logo className="hidden md:flex" />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-headline text-3xl font-bold tracking-tight">Painel de Controle de Estoque</h2>
            <p className="text-muted-foreground">Monitore e gerencie o inventário de suas bebidas.</p>
          </div>
           <Button onClick={() => setAddSheetOpen(true)} className="hidden md:flex">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produto
            </Button>
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
    </>
  );
}

Dashboard.Sidebar = DashboardSidebar;