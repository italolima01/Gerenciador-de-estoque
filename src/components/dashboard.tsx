
'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { PlusCircle, Search } from 'lucide-react';

import type { Order, Product, ProductWithStatus } from '@/lib/types';
import { 
  addProduct, 
  deleteProduct,
  registerOrder, 
  updateOrder,
  cancelOrder,
  completeOrder
} from '@/app/actions';
import { useProducts } from '@/hooks/use-products';
import { useOrders } from '@/hooks/use-orders';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { AddProductDialog } from '@/components/add-product-dialog';
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


function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


export function Dashboard() {
  const { products, isLoading: isLoadingProducts, refetch: fetchProducts } = useProducts();
  const { orders, isLoading: isLoadingOrders, refetch: fetchOrders } = useOrders();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRegisterOrderSheetOpen, setRegisterOrderSheetOpen] = useState(false);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<ProductWithStatus | null>(null);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<ProductWithStatus | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Order | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [isConfirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [isAddNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('inventory');
  const { toast } = useToast();

  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    startTransition(async () => {
      try {
        await addProduct(newProductData);
        setAddDialogOpen(false);
        toast({
            title: "Produto Adicionado!",
            description: `"${newProductData.name}" foi adicionado ao seu inventário.`,
        });
      } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao Adicionar Produto",
            description: "Não foi possível salvar o novo produto. Tente novamente.",
        });
      }
    });
  };

  const handleDeleteProduct = (productId: string) => {
    startTransition(async () => {
      try {
        await deleteProduct(productId);
        setSelectedProductForDelete(null);
        toast({
            title: "Produto Excluído",
            description: "O produto foi removido do seu inventário.",
        });
      } catch(e) {
         toast({
            variant: "destructive",
            title: "Erro ao Excluir",
            description: "Não foi possível excluir o produto.",
        });
      }
    });
  };
  
  const handleOrderSubmit = (newOrderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    startTransition(async () => {
      const productUpdates: { [productId: string]: number } = {};
      for (const item of newOrderData.items) {
          const product = products.find(p => p.id === item.productId);
          if(product && product.quantity >= item.quantity) {
            productUpdates[item.productId] = product.quantity - item.quantity;
          } else {
             toast({
                variant: "destructive",
                title: "Erro de Estoque",
                description: `O produto "${item.productName}" não tem estoque suficiente.`,
            });
            return;
          }
      }

      await registerOrder(newOrderData, productUpdates);
      setRegisterOrderSheetOpen(false);
    });
  };

  const handleOrderUpdate = (updatedOrderData: Order) => {
    startTransition(async () => {
      const originalOrder = orders.find(o => o.id === updatedOrderData.id);
      if (!originalOrder) return;

      const productQuantityChanges: {[productId: string]: number} = {};
      // Add back original quantities
      for (const item of originalOrder.items) {
          productQuantityChanges[item.productId] = (productQuantityChanges[item.productId] || 0) + item.quantity;
      }
      // Subtract new quantities
      for (const item of updatedOrderData.items) {
          productQuantityChanges[item.productId] = (productQuantityChanges[item.productId] || 0) - item.quantity;
      }

      const productUpdates: { [productId: string]: number } = {};
      for (const productId in productQuantityChanges) {
          const product = products.find(p => p.id === productId);
          if (product) {
              productUpdates[productId] = product.quantity + productQuantityChanges[productId];
          }
      }

      await updateOrder(updatedOrderData, productUpdates);
      setSelectedOrderForEdit(null);
    });
  }
  
  const handleOpenCompleteDialog = (order: Order) => {
    setOrderToComplete(order);
    setConfirmCompleteOpen(true);
  }

  const handleCancelOrder = (orderToCancel: Order) => {
     startTransition(async () => {
      const productUpdates: { [productId: string]: number } = {};
      for (const item of orderToCancel.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
              productUpdates[item.productId] = product.quantity + item.quantity;
          }
      }

      await cancelOrder(orderToCancel, productUpdates);
      setSelectedOrderForCancel(null);

      toast({
          title: "Pedido Cancelado",
          description: `O pedido para ${orderToCancel.customerName} foi cancelado com sucesso.`,
      });
    });
  }

  const handleCompleteOrder = (orderId: string, note?: string) => {
      startTransition(async () => {
        await completeOrder(orderId, note);
        
        setOrderToComplete(null);
        setConfirmCompleteOpen(false);
        setAddNoteDialogOpen(false);
        
         toast({
            title: "Pedido Concluído!",
            description: `O pedido foi marcado como concluído.`,
        });
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

  const isLoading = isLoadingProducts || isLoadingOrders || isPending;

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
            <SalesDashboard orders={orders} products={products} isLoading={isLoadingOrders || isLoadingProducts} />
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
            {isLoadingProducts || isPending ? (
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
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
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
                    isLoading={isLoadingOrders}
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
