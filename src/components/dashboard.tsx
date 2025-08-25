
'use client';

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import { PlusCircle } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import type { Order, Product, ProductWithStatus, GenerateRestockAlertOutput } from '@/lib/types';
import { getRestockAlert } from '@/app/actions';
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
import { DeleteProductDialog } from './delete-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { EditOrderSheet } from './edit-order-sheet';
import { DeleteOrderDialog } from './cancel-order-dialog';
import { ConfirmCompletionDialog } from './confirm-completion-dialog';
import { AddNoteDialog } from './add-note-dialog';
import { RegisterOrderSheet } from './register-order-sheet';
import { SalesDashboard } from './sales-dashboard';
import { ProductFilters } from './product-filters';
import { ProductSort, type SortOption, type SortDirection } from './product-sort';
import { addProduct, deleteProduct, getProducts, updateProduct } from '@/services/product-service';
import { addOrder, deleteOrder, getOrders, updateOrder } from '@/services/order-service';


function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRegisterOrderSheetOpen, setRegisterOrderSheetOpen] = useState(false);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<ProductWithStatus | null>(null);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<Product | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState<Order | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [isConfirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [isAddNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('inventory');
  const [productAlerts, setProductAlerts] = useState<Record<string, GenerateRestockAlertOutput>>({});
  const { toast } = useToast();
  const [productsToRefresh, setProductsToRefresh] = useState<Product[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [loadedProducts, loadedOrders] = await Promise.all([getProducts(), getOrders()]);
            setProducts(loadedProducts);
            setOrders(loadedOrders);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados',
                description: 'Não foi possível buscar os dados do banco de dados.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [toast]);
  
 const fetchProductAlerts = useCallback((productsToFetch: Product[]) => {
    if (productsToFetch.length === 0) return;

    const completedOrders = orders.filter(o => o.status === 'Concluído');
    
    startTransition(async () => {
        try {
            const alertsToUpdate = productsToFetch.map(p => getRestockAlert(p, completedOrders));
            const results = await Promise.all(alertsToUpdate);
            const newAlerts: Record<string, GenerateRestockAlertOutput> = {};
            productsToFetch.forEach((p, index) => {
                newAlerts[p.id] = results[index];
            });
            setProductAlerts(prev => ({ ...prev, ...newAlerts }));
        } catch (error) {
            console.error("Failed to fetch some restock alerts", error);
        }
    });
}, [orders]);


  // Initial fetch for all products
  useEffect(() => {
    if (products.length > 0 && !isLoading) {
      fetchProductAlerts(products);
    }
  }, [products, isLoading, fetchProductAlerts]);

  // Fetch alerts for specific products when they need a refresh
  useEffect(() => {
    if (productsToRefresh.length > 0) {
      fetchProductAlerts(productsToRefresh);
      setProductsToRefresh([]); // Reset after fetching
    }
  }, [productsToRefresh, fetchProductAlerts]);


  const handleAddProduct = useCallback(async (newProductData: Omit<Product, 'id' | 'quantity'>) => {
    startTransition(async () => {
      try {
        const newProduct = await addProduct(newProductData);
        setProducts(prev => [newProduct, ...prev]);
        setProductsToRefresh([newProduct]);
        setAddDialogOpen(false);
        toast({
            title: "Produto Adicionado!",
            description: `"${newProduct.name}" foi adicionado ao seu inventário.`,
        });
      } catch (error) {
         toast({
            variant: "destructive",
            title: "Erro ao Adicionar Produto",
            description: "Não foi possível salvar o novo produto.",
        });
      }
    });
  }, [toast]);

  const handleEditProduct = useCallback(async (updatedProductData: Product) => {
    startTransition(async () => {
      try {
        const updatedProduct = await updateProduct(updatedProductData);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setProductsToRefresh([updatedProduct]);
        setSelectedProductForEdit(null);
        toast({
            title: "Produto Atualizado!",
            description: `"${updatedProduct.name}" foi atualizado com sucesso.`,
        });
      } catch (error) {
         toast({
            variant: "destructive",
            title: "Erro ao Atualizar Produto",
            description: "Não foi possível salvar as alterações.",
        });
      }
    });
  }, [toast]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    startTransition(async () => {
      try {
        await deleteProduct(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
        setProductAlerts(prev => {
          const newAlerts = { ...prev };
          delete newAlerts[productId];
          return newAlerts;
        });
        setSelectedProductForDelete(null);
        toast({
            title: "Produto Excluído",
            description: "O produto foi removido do seu inventário.",
        });
      } catch(error) {
        toast({
            variant: "destructive",
            title: "Erro ao Excluir Produto",
            description: "Não foi possível remover o produto.",
        });
      }
    });
  }, [toast]);
  
  const handleOrderSubmit = useCallback(async (newOrderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    startTransition(async () => {
      try {
        const { newOrder, updatedProducts } = await addOrder(newOrderData);
        setOrders(prev => [newOrder, ...prev]);
        setProducts(prev => prev.map(p => updatedProducts.find(up => up.id === p.id) || p));
        setProductsToRefresh(updatedProducts);
        setRegisterOrderSheetOpen(false);
        toast({
          title: "Pedido Registrado!",
          description: "O novo pedido foi criado e o estoque foi atualizado.",
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
  }, [toast]);

  const handleOrderUpdate = useCallback(async (updatedOrderData: Order) => {
    startTransition(async () => {
       try {
        const { updatedOrder, updatedProducts } = await updateOrder(updatedOrderData);
        setOrders(prevOrders => prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setProducts(prev => prev.map(p => updatedProducts.find(up => up.id === p.id) || p));
        setProductsToRefresh(updatedProducts);
        setSelectedOrderForEdit(null);
        toast({
          title: "Pedido Atualizado!",
          description: "O pedido foi atualizado e o estoque foi ajustado.",
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
  }, [toast]);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) {
        toast({ variant: "destructive", title: "Erro", description: "Pedido não encontrado." });
        return;
    }
    
    startTransition(async () => {
      try {
        const updatedProducts = await deleteOrder(orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (updatedProducts.length > 0) {
            setProducts(prev => prev.map(p => updatedProducts.find(up => up.id === p.id) || p));
            setProductsToRefresh(updatedProducts);
        }
        setSelectedOrderForDelete(null);
        toast({
            title: "Pedido Excluído!",
            description: "O pedido foi removido e o estoque foi ajustado.",
        });
      } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao Excluir Pedido",
            description: "Não foi possível remover o pedido.",
        });
      }
    });
    
  }, [orders, toast]);
  
  const handleOpenCompleteDialog = useCallback((order: Order) => {
    setOrderToComplete(order);
    setConfirmCompleteOpen(true);
  }, []);
  
 const handleChangeOrderStatus = useCallback(async (orderId: string, newStatus: Order['status'], note?: string) => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      toast({ variant: "destructive", title: "Erro", description: "Pedido não encontrado." });
      return;
    }
    const originalOrder = orders[orderIndex];

    startTransition(async () => {
        try {
            const notePrefix = `Anotação (${new Date().toLocaleString('pt-BR')}):`;
            const newNoteContent = note ? `${notePrefix}\n${note}` : '';
            
            const newNotes = newNoteContent
            ? (originalOrder.notes ? `${originalOrder.notes}\n\n${newNoteContent}` : newNoteContent)
            : originalOrder.notes;

            const orderToUpdate = { ...originalOrder, status: newStatus, notes: newNotes };

            const updatedOrder = await updateOrder(orderToUpdate, false); // No stock change
            
            setOrders(prevOrders => prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            
            const productsToUpdate = products.filter(p => 
                updatedOrder.items.some(item => item.productId === p.id)
            );
            if (productsToUpdate.length > 0) {
            setProductsToRefresh(current => [...new Set([...current, ...productsToUpdate])]);
            }
            toast({
                title: "Status do Pedido Alterado!",
                description: `O pedido foi atualizado para "${newStatus}".`,
            });

        } catch (error) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar o status do pedido." });
        }
    });

  }, [orders, products, toast]);

  const handleCompleteOrderWithNote = useCallback((note: string) => {
    if (!orderToComplete) return;
    handleChangeOrderStatus(orderToComplete.id, 'Concluído', note);
    setOrderToComplete(null);
    setAddNoteDialogOpen(false);
  }, [orderToComplete, handleChangeOrderStatus]);
  
  const handleCompleteOrderWithoutNote = useCallback(() => {
      if (!orderToComplete) return;
      handleChangeOrderStatus(orderToComplete.id, 'Concluído');
      setOrderToComplete(null);
      setConfirmCompleteOpen(false);
  }, [orderToComplete, handleChangeOrderStatus]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (active.id !== over?.id) {
      setOrders((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);


  const processedProducts = useMemo(() => {
    let filtered = products;

    // Name filter
    if (searchQuery) {
        filtered = filtered.filter(product =>
        removeAccents(product.name.toLowerCase()).includes(removeAccents(searchQuery.toLowerCase()))
      );
    }
    
    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let compareResult = 0;

      switch (sortOption) {
        case 'name':
          // Use localeCompare for proper alphabetical sorting of accented characters
          compareResult = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
          break;
        case 'quantity':
          compareResult = a.quantity - b.quantity;
          break;
        case 'expirationDate':
          compareResult = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return sorted;

  }, [products, searchQuery, sortOption, sortDirection]);


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
          <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="orders">Pedidos</TabsTrigger>
              <TabsTrigger value="inventory">Estoque</TabsTrigger>
              <TabsTrigger value="dashboard">Vendas</TabsTrigger>
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
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <ProductFilters
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                />
                <ProductSort
                sortOption={sortOption}
                onSortOptionChange={setSortOption}
                sortDirection={sortDirection}
                onSortDirectionChange={setSortDirection}
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
                {processedProducts.map((product) => {
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
                            isAlertLoading={isPending && !alert}
                        />
                    );
                })}
              </div>
            )}
            {!isLoading && processedProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center mt-6">
                    <h3 className="text-xl font-semibold tracking-tight text-muted-foreground">Nenhum Produto Encontrado</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Tente ajustar os filtros ou adicione um novo produto.
                    </p>
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
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <RegisteredOrdersList 
                        orders={orders}
                        products={products}
                        isLoading={isLoading}
                        onOrderSelect={(order) => setSelectedOrderForDetails(order)}
                        onOrderEdit={setSelectedOrderForEdit}
                        onOrderStatusChange={handleChangeOrderStatus}
                        onMarkAsComplete={handleOpenCompleteDialog}
                        onOrderDelete={setSelectedOrderForDelete}
                    />
                </DndContext>
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
          onConfirm={() => handleDeleteProduct(selectedProductForDelete.id)}
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

      {selectedOrderForDelete && (
        <DeleteOrderDialog
          order={selectedOrderForDelete}
          isOpen={!!selectedOrderForDelete}
          onOpenChange={() => setSelectedOrderForDelete(null)}
          onConfirm={() => handleDeleteOrder(selectedOrderForDelete.id)}
          isPending={isPending}
        />
      )}

      {orderToComplete && (
        <ConfirmCompletionDialog
            isOpen={isConfirmCompleteOpen}
            onOpenChange={setConfirmCompleteOpen}
            onConfirmWithoutNote={handleCompleteOrderWithoutNote}
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
            onSave={handleCompleteOrderWithNote}
            isPending={isPending}
        />
      )}
    </>
  );
}
