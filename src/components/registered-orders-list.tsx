'use client';

import type { Order, Product } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from './ui/button';
import { MoreHorizontal, Edit, XCircle, CheckCircle, RotateCcw, GripVertical, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as React from 'react';

interface RegisteredOrdersListProps {
  orders: Order[];
  products: Product[];
  isLoading: boolean;
  onOrderSelect: (order: Order) => void;
  onOrderEdit: (order: Order) => void;
  onOrderStatusChange: (orderId: string, status: Order['status']) => void;
  onMarkAsComplete: (order: Order) => void;
  onOrderDelete: (order: Order) => void;
}

const statusVariantMap: { [key in Order['status']]: BadgeProps['variant'] } = {
  Pendente: 'secondary',
  Concluído: 'success',
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

const DraggableTableRow = ({ order, products, ...props }: { order: Order, products: Product[] } & Omit<RegisteredOrdersListProps, 'orders' | 'isLoading' | 'products'>) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id: order.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const totalOrderValue = React.useMemo(() => {
        return order.items.reduce((total, item) => {
            const product = products.find(p => p.id === item.productId);
            // The price is always per unit, so this calculation is correct.
            const pricePerUnit = product?.price || 0;
            return total + (pricePerUnit * item.quantity);
        }, 0);
    }, [order.items, products]);


    return (
        <TableRow 
            ref={setNodeRef} 
            style={style} 
            {...attributes}
            {...listeners}
            className="cursor-grab"
            onClick={() => props.onOrderSelect(order)}
        >
            <TableCell 
                className="w-12 hidden sm:table-cell"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </TableCell>
            <TableCell>
              <div className="font-medium">{order.customerName}</div>
              <div className="text-sm text-muted-foreground md:hidden">
                {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
              </div>
               <div className="sm:hidden mt-1">
                 <Badge variant={statusVariantMap[order.status]}>
                    {order.status}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell cursor-pointer">
                {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
            </TableCell>
             <TableCell className="hidden sm:table-cell cursor-pointer">
                <Badge variant={statusVariantMap[order.status]}>
                    {order.status}
                </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-right font-medium cursor-pointer">
                {formatCurrency(totalOrderValue)}
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Mais ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onOrderEdit(order)}}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Pedido
                    </DropdownMenuItem>
                    
                    {order.status === 'Pendente' && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onMarkAsComplete(order); }}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como Concluído
                        </DropdownMenuItem>
                    )}

                    {order.status === 'Concluído' && (
                         <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onOrderStatusChange(order.id, 'Pendente')}}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reverter para Pendente
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                     <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); props.onOrderDelete(order)}} 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Pedido
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
          </TableRow>
    )
}

export function RegisteredOrdersList({ orders, products, isLoading, ...props }: RegisteredOrdersListProps) {
  if (isLoading) {
    return (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-muted-foreground">Nenhum Pedido Registrado</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Clique em &quot;Registrar Pedido&quot; para criar o primeiro.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 hidden sm:table-cell"></TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden md:table-cell">Data de Entrega</TableHead>
          <TableHead className="hidden sm:table-cell">Status</TableHead>
          <TableHead className="hidden sm:table-cell text-right">Valor Total</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
            {orders.map((order) => (
              <DraggableTableRow key={order.id} order={order} products={products} {...props} />
            ))}
        </SortableContext>
      </TableBody>
    </Table>
  );
}
