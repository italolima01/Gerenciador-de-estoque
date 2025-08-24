'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Order, Product } from '@/lib/types';
import { Package } from 'lucide-react';

interface SalesDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  orders: Order[];
  products: Product[];
  title: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function SalesDetailDialog({ isOpen, onOpenChange, orders, products, title }: SalesDetailDialogProps) {
  const calculateTotalValue = (order: Order) => {
    return order.items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
             <Package className="h-6 w-6 text-primary" />
             {title}
          </DialogTitle>
          <DialogDescription>
            Lista de pedidos concluídos no período selecionado.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor do Pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.map((order) => (
                    <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(calculateTotalValue(order))}</TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                        Nenhum pedido encontrado para este período.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
