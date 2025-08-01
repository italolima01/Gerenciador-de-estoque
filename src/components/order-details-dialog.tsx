
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
import { Package, User, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface OrderDetailsDialogProps {
  order: Order;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const statusInfoMap: { [key in Order['status']]: { variant: BadgeProps['variant'], Icon: React.ElementType } } = {
  Pendente: { variant: 'secondary', Icon: Clock },
  Concluído: { variant: 'success', Icon: CheckCircle },
  Cancelado: { variant: 'destructive', Icon: XCircle },
};

export function OrderDetailsDialog({ order, isOpen, onOpenChange }: OrderDetailsDialogProps) {
    const statusInfo = statusInfoMap[order.status];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Detalhes do Pedido
          </DialogTitle>
          <DialogDescription>
            ID do Pedido: {order.id}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid gap-6">
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
                    {order.items.map((item, index) => (
                        <div key={item.productId} className={`flex justify-between p-3 ${index < order.items.length - 1 ? 'border-b' : ''}`}>
                            <span>{item.productName}</span>
                            <span className="font-medium">x {item.quantity}</span>
                        </div>
                    ))}
                </div>
            </div>

            {order.notes && (
                 <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Anotações</p>
                        <p className="text-sm">{order.notes}</p>
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
