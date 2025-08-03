
'use client';

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import type { Order, Product, ProductWithStatus, GenerateRestockAlertOutput } from '@/lib/types';
import { products as initialProducts, orders as initialOrders } from '@/lib/data';
import { getRestockAlert, searchProducts } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { AddProductDialog } from '@/components/add-product-dialog';
import { EditProductDialog } from '@/components/edit-product-dialog';
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
import { SalesDashboard } from './sales-dashboard';
import { useLocalStorage } from '@/hooks/use-local-storage';


function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


export function Dashboard() {
  const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
  const [orders, setOrders] = useLocalStorage<Order[]>('orders', initialOrders);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRegisterOrderSheetOpen, setRegisterOrderSheetOpen] = useState(false);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<ProductWithStatus | null>(null);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<Product | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Order | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [isConfirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [isAddNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('inventory');
  const [productAlerts, setProductAlerts] = useState<Record<string, GenerateRestockAlertOutput>>({});
  const { toast } = useToast();
  
  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  const fetchProductAlert = useCallback(async (product: Product) => {
    if (!productAlerts[product.id]) { // Fetch only if not already fetched
      const alert = await getRestockAlert(product);
      setProductAlerts(prev => ({ ...prev, [product.id]: alert }));
    }
  }, [productAlerts]);

  useEffect(() => {
    products.forEach(p => fetchProductAlert(p));
  }, [products, fetchProductAlert]);


  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    startTransition(() => {
      const newProduct = { ...newProductData, id: uuidv4() };
      setProducts(prev => [newProduct, ...prev]);
      setAddDialogOpen(false);
      toast({
          title: "Produto Adicionado!",
          description: `"${newProduct.name}" foi adicionado ao seu inventário.`,
      });
    });
  };

  const handleEditProduct = (updatedProductData: Product) => {
    startTransition(() => {
      setProducts(prev => prev.map(p => p.id === updatedProductData.id ? updatedProductData : p));
      setSelectedProductForEdit(null);
       toast({
          title: "Produto Atualizado!",
          description: `"${updatedProductData.name}" foi atualizado com sucesso.`,
      });
    });
  };

  const handleDeleteProduct = (productId: string) => {
    startTransition(() => {
      setProducts(prev => prev.filter(p => p.id !== productId));
      setSelectedProductForDelete(null);
      toast({
          title: "Produto Excluído",
          description: "O produto foi removido do seu inventário.",
      });
    });
  };
  
  const handleOrderSubmit = (newOrderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    startTransition(() => {
      try {
        // 1. Check stock, but don't decrease it yet.
        for (const item of newOrderData.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product || product.quantity < item.quantity) {
             throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product?.quantity ?? 0}`);
          }
        }

        // 2. Create order with 'Pendente' status
        const newOrder = { 
          ...newOrderData, 
          id: uuidv4(), 
          createdAt: new Date().toISOString(),
          status: 'Pendente' as const
        };
        setOrders(prev => [newOrder, ...prev]);

        setRegisterOrderSheetOpen(false);
        toast({
          title: "Pedido Registrado!",
          description: "O novo pedido foi criado e aguarda conclusão.",
        });
      } catch (error) {
        console.error("Failed to register order:", error);
        const errorMessage = error instanceof Error ? error.message : "Tente novamente.";
        toast({
            variant: "destructive",
            title: "Erro ao Registrar Pedido",
            description: errorMessage,
        });
      }
    });
  };


  const handleOrderUpdate = (updatedOrderData: Order) => {
    startTransition(() => {
      try {
        // Check stock for the updated items, but don't modify it.
        for (const item of updatedOrderData.items) {
          const product = products.find(p => p.id === item.productId);
           if (!product || product.quantity < item.quantity) {
             throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product?.quantity ?? 0}`);
          }
        }
        
        // Update the order
        setOrders(prevOrders => prevOrders.map(o => o.id === updatedOrderData.id ? updatedOrderData : o));
        
        setSelectedOrderForEdit(null);
         toast({
          title: "Pedido Atualizado!",
          description: "As alterações no pedido foram salvas com sucesso.",
        });
       } catch (error) {
         console.error("Failed to update order:", error);
         const errorMessage = error instanceof Error ? error.message : "Tente novamente.";
         toast({
            variant: "destructive",
            title: "Erro ao Atualizar Pedido",
            description: errorMessage,
        });
      }
    });
  }
  
  const handleOpenCompleteDialog = (order: Order) => {
    setOrderToComplete(order);
    setConfirmCompleteOpen(true);
  }

  const handleCancelOrder = (orderToCancel: Order) => {
     startTransition(() => {
        // Stock is no longer restored here. We just update the status.
        setOrders(prevOrders => prevOrders.map(o => o.id === orderToCancel.id ? {...o, status: 'Cancelado'} : o));
       
        setSelectedOrderForCancel(null);

        toast({
            title: "Pedido Cancelado",
            description: `O pedido para ${orderToCancel.customerName} foi cancelado com sucesso.`,
        });
      
    });
  }

  const handleCompleteOrder = (orderId: string, note?: string) => {
      startTransition(() => {
        const orderToComplete = orders.find(o => o.id === orderId);
        if (!orderToComplete) {
            toast({ variant: "destructive", title: "Erro", description: "Pedido não encontrado." });
            return;
        }

        try {
            // Check stock again at the time of completion
            for (const item of orderToComplete.items) {
                const product = products.find(p => p.id === item.productId);
                if (!product || product.quantity < item.quantity) {
                    throw new Error(`Estoque insuficiente para ${item.productName} no momento da conclusão.`);
                }
            }

            // Decrease stock now
            setProducts(prevProducts => {
                const updatedProducts = [...prevProducts];
                for (const item of orderToComplete.items) {
                    const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                    if (productIndex !== -1) {
                        updatedProducts[productIndex].quantity -= item.quantity;
                    }
                }
                return updatedProducts;
            });

            // Update order status
            setOrders(prev => prev.map(o => {
              if (o.id === orderId) {
                const newNotes = o.notes ? `${o.notes}\\n---\\n${note}` : note;
                return { ...o, status: 'Concluído' as const, notes: note ? newNotes : o.notes };
              }
              return o;
            }));
            
            setOrderToComplete(null);
            setConfirmCompleteOpen(false);
            setAddNoteDialogOpen(false);
            
             toast({
                title: "Pedido Concluído!",
                description: `O pedido foi finalizado e o estoque foi atualizado.`,
            });
        } catch (error) {
             console.error("Failed to complete order:", error);
             const errorMessage = error instanceof Error ? error.message : "Tente novamente.";
             toast({
                variant: "destructive",
                title: "Erro ao Concluir Pedido",
                description: errorMessage,
            });
        }
      });
  };
  
  const filteredProducts = useMemo(() => {
    if (!searchQuery) {
      return products;
    }
    const normalizedQuery = removeAccents(searchQuery.toLowerCase());
    return products.filter(product =>
      removeAccents(product.name.toLowerCase()).includes(normalizedQuery)
    );
  }, [products, searchQuery]);


  const headerButton = useMemo(() => {
    if (activeTab === 'orders') {
        return (
            <Button onClick={() => setRegisterOrderSheetOpen(true)} disabled={isPending}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Pedido
            </Button>
        );
    }
    if (activeTab === 'inventory') {
        return (
            <Button onClick={() => setAddDialogOpen(true)} disabled={isPending}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produto
            </Button>
        );
    }
    return null;
  }, [activeTab, isPending]);
  
  const mobileHeaderButton = useMemo(() => {
    if (activeTab === 'orders') {
        return (
            <Button onClick={() => setRegisterOrderSheetOpen(true)} size="sm" disabled={isPending}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Pedido
            </Button>
        );
    }
    if (activeTab === 'inventory') {
        return (
            <Button onClick={() => setAddDialogOpen(true)} size="sm" disabled={isPending}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Produto
            </Button>
        );
    }
    return null;
  }, [activeTab, isPending]);


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
        <Tabs defaultValue="inventory" onValueChange={setActiveTab}>
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="orders">Pedidos Registrados</TabsTrigger>
              <TabsTrigger value="inventory">Estoque</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>
             <div className='sm:hidden flex items-center gap-2'>
                 {mobileHeaderButton}
            </div>
          </div>
           <TabsContent value="dashboard">
            <div className="mb-6">
                <h2 className="font-headline text-3xl font-bold tracking-tight">Visão Geral de Vendas</h2>
                <p className="text-muted-foreground">Acompanhe o desempenho de suas vendas semanais e mensais.</p>
            </div>
            <SalesDashboard orders={orders} products={products} isLoading={isLoading} />
          </TabsContent>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-background pl-10"
              />
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-[120px] w-full rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                    const alert = productAlerts[product.id];
                    const productWithStatus: ProductWithStatus = {
                        ...product,
                        zone: alert?.zone ?? 'yellow',
                        restockRecommendation: alert?.restockRecommendation ?? 'Carregando...',
                        confidenceLevel: alert?.confidenceLevel ?? 'low',
                    };
                    return (
                        <ProductCard
                            key={product.id}
                            product={productWithStatus}
                            onAlertClick={() => setSelectedProductForAlert(productWithStatus)}
                            onEditClick={() => setSelectedProductForEdit(productWithStatus)}
                            onDeleteClick={() => setSelectedProductForDelete(productWithStatus)}
                            isAlertLoading={!alert}
                        />
                    );
                })}
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
                    orders={orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                    isLoading={isLoading}
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

      {selectedProductForEdit && (
        <EditProductDialog
            isOpen={!!selectedProductForEdit}
            onOpenChange={() => setSelectedProductForEdit(null)}
            onProductEdit={handleEditProduct}
            isPending={isPending}
            product={selectedProductForEdit}
        />
       )}
      
      <RegisterOrderSheet
        isOpen={isRegisterOrderSheetOpen}
        onOpenChange={setRegisterOrderSheetOpen}
        products={products}
        onOrderSubmit={handleOrderSubmit}
        isPending={isPending}
      />
      
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
