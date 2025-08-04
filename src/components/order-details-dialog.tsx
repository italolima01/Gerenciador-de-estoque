
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Separator } from './ui/separator';
import { Package, User, Calendar, FileText, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react';
import type { Product } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

interface OrderDetailsDialogProps {
  order: Order;
  products: Product[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const statusInfoMap: { [key in Order['status']]: { variant: BadgeProps['variant'], Icon: React.ElementType } } = {
  Pendente: { variant: 'secondary', Icon: Clock },
  Concluído: { variant: 'success', Icon: CheckCircle },
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function OrderDetailsDialog({ order, products, isOpen, onOpenChange }: OrderDetailsDialogProps) {
    const statusInfo = statusInfoMap[order.status];
    const totalOrderValue = order.items.reduce((total, item) => {
        const product = products.find(p => p.id === item.productId);
        return total + (product?.price || 0) * item.quantity;
    }, 0);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Detalhes do Pedido
          </DialogTitle>
          <DialogDescription>
            ID do Pedido: {order.id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="pr-6 -mr-6">
        <div className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-semibold">{order.customerName}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Data de Entrega</p>
                        <p className="font-semibold">{format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                    <p className="text-sm text-muted-foreground">Endereço de Entrega</p>
                    <p className="font-semibold">{order.address}</p>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
                <span className="text-sm font-medium text-muted-foreground">Status do Pedido</span>
                <Badge variant={statusInfo.variant} className="text-sm">
                    <statusInfo.Icon className="mr-2 h-4 w-4"/>
                    {order.status}
                </Badge>
            </div>

            <div>
                <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                <div className="rounded-lg border">
                    {order.items.map((item, index) => {
                        const product = products.find(p => p.id === item.productId);
                        const subtotal = (product?.price || 0) * item.quantity;
                        return (
                            <div key={item.productId} className={`flex justify-between items-center p-3 ${index < order.items.length - 1 ? 'border-b' : ''}`}>
                                <div>
                                    <p>{item.productName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(product?.price || 0)} x {item.quantity}
                                    </p>
                                </div>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                        )
                    })}
                    <div className="flex justify-between items-center p-3 font-bold border-t-2 bg-muted/50">
                        <span>Valor Total da Compra</span>
                        <span>{formatCurrency(totalOrderValue)}</span>
                    </div>
                </div>
            </div>

            {order.notes && (
                 <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Anotações</p>
                        <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                    </div>
                </div>
            )}
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
