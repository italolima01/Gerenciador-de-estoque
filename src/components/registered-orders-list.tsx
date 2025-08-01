'use client';

import type { Order } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/ui/dropdown-menu';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from './ui/button';
import { MoreHorizontal } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RegisteredOrdersListProps {
  orders: Order[];
  onStatusChange: (orderId: string, status: Order['status']) => void;
}

const statusVariantMap: { [key in Order['status']]: BadgeProps['variant'] } = {
  Pendente: 'secondary',
  Concluído: 'success',
  Cancelado: 'destructive',
};

export function RegisteredOrdersList({ orders, onStatusChange }: RegisteredOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-muted-foreground">Nenhum Pedido Registrado</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Vá para a aba "Registrar Pedido" para criar o primeiro.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Data do Pedido</TableHead>
              <TableHead className="hidden md:table-cell">Data de Entrega</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-sm text-muted-foreground md:hidden">
                    Entrega: {format(parseISO(order.deliveryDate), 'dd/MM/yyyy')}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {format(parseISO(order.createdAt), 'dd/MM/yyyy')}
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
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Mais ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onStatusChange(order.id, 'Concluído')}>
                            Marcar como Concluído
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(order.id, 'Pendente')}>
                            Marcar como Pendente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(order.id, 'Cancelado')}>
                            Cancelar Pedido
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
