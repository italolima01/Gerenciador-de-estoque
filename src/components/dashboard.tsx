
'use client';

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { PlusCircle, Search, Loader2 } from 'lucide-react';

import type { Order, Product, ProductWithStatus } from '@/lib/types';
import { getInitialProducts, getProductStatus, searchProducts, updateProductsAndGetStatus } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { AddProductDialog } from '@/components/add-product-dialog';
import { SellProductDialog } from '@/components/sell-product-dialog';
import { RestockAlertDialog } from '@/components/restock-alert-dialog';
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisteredOrdersList } from './registered-orders-list';
import { OrderDetailsDialog } from './order-details-dialog';
import { Input } from './ui/input';
import { DeleteProductDialog } from './delete-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { EditOrderSheet } from './edit-order-sheet';
import { CancelOrderDialog } from './cancel-order-dialog';
import { ConfirmCompletionDialog } from './confirm-completion-dialog';
import { AddNoteDialog } from './add-note-dialog';
import { RegisterOrderSheet } from './register-order-sheet';


// Debounce helper function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
}


export function Dashboard() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRegisterOrderSheetOpen, setRegisterOrderSheetOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<ProductWithStatus | null>(null);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<ProductWithStatus | null>(null);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<ProductWithStatus | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Order | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [isConfirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [isAddNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProductNames, setFilteredProductNames] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('orders');
  const { toast } = useToast();

  useEffect(() => {
    getInitialProducts().then((initialProducts) => {
      setProducts(initialProducts);
      setFilteredProductNames(initialProducts.map(p => p.name));
      setIsLoading(false);
    });
  }, []);

  const handleAddProduct = (newProduct: Product) => {
    startTransition(async () => {
      const status = await getProductStatus(newProduct);
      const newProductWithStatus = { ...newProduct, ...status };
      setProducts(prev => [newProductWithStatus, ...prev]);
      setFilteredProductNames(prev => prev ? [...prev, newProduct.name] : [newProduct.name]);
      setAddDialogOpen(false);
    });
  };

  const handleSellProduct = (product: ProductWithStatus, quantitySold: number) => {
    const updatedProductBase = {
      ...product,
      quantity: Math.max(0, product.quantity - quantitySold),
    };

    startTransition(async () => {
       const updatedProducts = await updateProductsAndGetStatus(products, { [product.id]: updatedProductBase.quantity });
       setProducts(updatedProducts);
       setSelectedProductForSale(null);
    });
  };

  const handleDeleteProduct = (productId: string) => {
    startTransition(() => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        setFilteredProductNames(prev => prev ? prev.filter(name => products.find(p => p.id !== productId && p.name === name)) : null);
        setSelectedProductForDelete(null);
        toast({
            title: "Produto Excluído",
            description: "O produto foi removido do seu inventário.",
        });
    });
  };
  
  const handleOrderSubmit = (newOrderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    startTransition(async () => {
      const updatedProductQuantities: { [productId: string]: number } = {};
      for (const item of newOrderData.items) {
          const product = products.find(p => p.id === item.productId);
          if(product) {
            updatedProductQuantities[item.productId] = product.quantity - item.quantity;
          }
      }

      const updatedProducts = await updateProductsAndGetStatus(products, updatedProductQuantities);
      setProducts(updatedProducts);

      const newOrder: Order = {
        ...newOrderData,
        id: `order_${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'Pendente',
      };
      setOrders(prev => [newOrder, ...prev]);
      setRegisterOrderSheetOpen(false);
    });
  };

  const handleOrderUpdate = (updatedOrderData: Order) => {
    startTransition(async () => {
      const originalOrder = orders.find(o => o.id === updatedOrderData.id);
      if (!originalOrder) return;

      const productQuantityChanges: {[productId: string]: number} = {};

      for (const item of originalOrder.items) {
          productQuantityChanges[item.productId] = (productQuantityChanges[item.productId] || 0) + item.quantity;
      }

      for (const item of updatedOrderData.items) {
          productQuantityChanges[item.productId] = (productQuantityChanges[item.productId] || 0) - item.quantity;
      }

      const updatedProductQuantities: { [productId: string]: number } = {};
      for (const productId in productQuantityChanges) {
          const product = products.find(p => p.id === productId);
          if (product) {
              updatedProductQuantities[productId] = product.quantity + productQuantityChanges[productId];
          }
      }

      const updatedProducts = await updateProductsAndGetStatus(products, updatedProductQuantities);
      setProducts(updatedProducts);
      
      setOrders(prev => prev.map(o => o.id === updatedOrderData.id ? updatedOrderData : o));
      setSelectedOrderForEdit(null);
    });
  }
  
  const handleOpenCompleteDialog = (order: Order) => {
    setOrderToComplete(order);
    setConfirmCompleteOpen(true);
  }

  const handleCancelOrder = (orderToCancel: Order) => {
     startTransition(async () => {
      const updatedProductQuantities: { [productId: string]: number } = {};
      for (const item of orderToCancel.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
              updatedProductQuantities[item.productId] = product.quantity + item.quantity;
          }
      }

      const updatedProducts = await updateProductsAndGetStatus(products, updatedProductQuantities);
      setProducts(updatedProducts);

      setOrders(prev => prev.map(o => o.id === orderToCancel.id ? { ...o, status: 'Cancelado' } : o));
      
      setSelectedOrderForCancel(null);

      toast({
          title: "Pedido Cancelado",
          description: `O pedido para ${orderToCancel.customerName} foi cancelado com sucesso.`,
      });
    });
  }

  const handleCompleteOrder = (orderId: string, note?: string) => {
      startTransition(() => {
        setOrders(prev => prev.map(o => o.id === orderId ? { 
            ...o, 
            status: 'Concluído', 
            notes: note ? (o.notes ? `${o.notes}\\n---\\n${note}` : note) : o.notes 
        } : o));
        
        // Close all dialogs related to completion
        setOrderToComplete(null);
        setConfirmCompleteOpen(false);
        setAddNoteDialogOpen(false);
        
         toast({
            title: "Pedido Concluído!",
            description: `O pedido foi marcado como concluído.`,
        });
      });
  };

  const allProductNames = useMemo(() => products.map(p => p.name), [products]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setFilteredProductNames(allProductNames);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const names = await searchProducts(query, allProductNames);
      setFilteredProductNames(names);
      setIsSearching(false);
    }, 500),
    [allProductNames] 
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };
  
  const filteredProducts = useMemo(() => {
    if (filteredProductNames === null) {
      return products;
    }
    const productSet = new Set(filteredProductNames);
    return products.filter(product =>
      productSet.has(product.name)
    );
  }, [products, filteredProductNames]);

  const headerButton = useMemo(() => {
    if (activeTab === 'orders') {
        return (
            <Button onClick={() => setRegisterOrderSheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Pedido
            </Button>
        );
    }
    if (activeTab === 'inventory') {
        return (
            <Button onClick={() => setAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produto
            </Button>
        );
    }
    return null;
  }, [activeTab]);
  
  const mobileHeaderButton = useMemo(() => {
    if (activeTab === 'orders') {
        return (
            <Button onClick={() => setRegisterOrderSheetOpen(true)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Pedido
            </Button>
        );
    }
    if (activeTab === 'inventory') {
        return (
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Produto
            </Button>
        );
    }
    return null;
  }, [activeTab]);


  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Logo />
             <div className="hidden sm:flex items-center gap-2">
                {headerButton}
            </div>
        </div>
      </header>
        
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="orders" onValueChange={setActiveTab}>
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="orders">Pedidos Registrados</TabsTrigger>
              <TabsTrigger value="inventory">Estoque</TabsTrigger>
            </TabsList>
             <div className='sm:hidden flex items-center gap-2'>
                 {mobileHeaderButton}
            </div>
          </div>
          <TabsContent value="inventory">
            <div className="mb-6">
                <h2 className="font-headline text-3xl font-bold tracking-tight">Painel de Controle de Estoque</h2>
                <p className="text-muted-foreground">Monitore e gerencie o inventário de suas bebidas.</p>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar produtos..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg bg-background pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
              )}
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
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSellClick={() => setSelectedProductForSale(product)}
                    onAlertClick={() => setSelectedProductForAlert(product)}
                    onDeleteClick={() => setSelectedProductForDelete(product)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
           <TabsContent value="orders">
             <div className="mb-6">
                <h2 className="font-headline text-3xl font-bold tracking-tight">Pedidos Registrados</h2>
                <p className="text-muted-foreground">Visualize e gerencie todos os pedidos dos clientes.</p>
            </div>
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <RegisteredOrdersList 
                    orders={orders}
                    onOrderSelect={(order) => setSelectedOrderForDetails(order)}
                    onOrderEdit={setSelectedOrderForEdit}
                    onOrderCancel={setSelectedOrderForCancel}
                    onMarkAsComplete={handleOpenCompleteDialog}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AddProductDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onProductAdd={handleAddProduct}
        isPending={isPending}
      />
      
      <RegisterOrderSheet
        isOpen={isRegisterOrderSheetOpen}
        onOpenChange={setRegisterOrderSheetOpen}
        products={products}
        onOrderSubmit={handleOrderSubmit}
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

       {selectedProductForDelete && (
        <DeleteProductDialog
          product={selectedProductForDelete}
          isOpen={!!selectedProductForDelete}
          onOpenChange={() => setSelectedProductForDelete(null)}
          onDelete={() => handleDeleteProduct(selectedProductForDelete.id)}
          isPending={isPending}
        />
      )}

      {selectedOrderForDetails && (
        <OrderDetailsDialog
          order={selectedOrderForDetails}
          products={products}
          isOpen={!!selectedOrderForDetails}
          onOpenChange={() => setSelectedOrderForDetails(null)}
        />
      )}

      {selectedOrderForEdit && (
        <EditOrderSheet
          order={selectedOrderForEdit}
          products={products}
          isOpen={!!selectedOrderForEdit}
          onOpenChange={() => setSelectedOrderForEdit(null)}
          onOrderUpdate={handleOrderUpdate}
          isPending={isPending}
        />
      )}

      {selectedOrderForCancel && (
        <CancelOrderDialog
          order={selectedOrderForCancel}
          isOpen={!!selectedOrderForCancel}
          onOpenChange={() => setSelectedOrderForCancel(null)}
          onConfirm={() => handleCancelOrder(selectedOrderForCancel)}
          isPending={isPending}
        />
      )}

      {orderToComplete && (
        <ConfirmCompletionDialog
            isOpen={isConfirmCompleteOpen}
            onOpenChange={setConfirmCompleteOpen}
            onConfirmWithoutNote={() => handleCompleteOrder(orderToComplete.id)}
            onConfirmWithNote={() => {
                setConfirmCompleteOpen(false);
                setAddNoteDialogOpen(true);
            }}
        />
      )}

      {orderToComplete && (
        <AddNoteDialog
            isOpen={isAddNoteDialogOpen}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setOrderToComplete(null);
                }
                setAddNoteDialogOpen(isOpen);
            }}
            onSave={(note) => handleCompleteOrder(orderToComplete.id, note)}
            isPending={isPending}
        />
      )}
    </>
  );
}
