
'use client';

import type { Order } from '@/lib/types';
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
import { MoreHorizontal, Edit, XCircle, CheckCircle, Undo2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RegisteredOrdersListProps {
  orders: Order[];
  onOrderSelect: (order: Order) => void;
  onOrderEdit: (order: Order) => void;
  onOrderCancel: (order: Order) => void;
  onMarkAsComplete: (order: Order) => void;
}

const statusVariantMap: { [key in Order['status']]: BadgeProps['variant'] } = {
  Pendente: 'secondary',
  Concluído: 'success',
  Cancelado: 'destructive',
};

export function RegisteredOrdersList({ orders, onOrderSelect, onOrderEdit, onOrderCancel, onMarkAsComplete }: RegisteredOrdersListProps) {
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
  
  const handleReopenOrder = (order: Order) => {
    // This is a placeholder for potential future functionality
    // For now, it could simply call onOrderEdit or a new handler
    onOrderEdit(order); // Or create a new handler to change status back to 'Pendente'
  }


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden sm:table-cell">Endereço</TableHead>
          <TableHead className="hidden md:table-cell">Data de Entrega</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} onClick={() => onOrderSelect(order)} className="cursor-pointer">
            <TableCell>
              <div className="font-medium">{order.customerName}</div>
              <div className="text-sm text-muted-foreground md:hidden">
                Entrega: {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell max-w-xs truncate">
              {order.address}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariantMap[order.status]}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Mais ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOrderEdit(order)}}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Pedido
                    </DropdownMenuItem>
                    {order.status === 'Pendente' && (
                        <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkAsComplete(order); }}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como Concluído
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); onOrderCancel(order)}} 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Pedido
                            </DropdownMenuItem>
                        </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
