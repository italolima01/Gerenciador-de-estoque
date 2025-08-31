
'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { OrderRegistrationForm } from './order-registration-form';
import type { Order, Product } from '@/lib/types';

interface RegisterOrderSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  products: Product[];
  onOrderSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => void;
  isPending: boolean;
}

export function RegisterOrderSheet({
  isOpen,
  onOpenChange,
  products,
  onOrderSubmit,
  isPending,
}: RegisterOrderSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-headline">Registrar Novo Pedido</SheetTitle>
          <SheetDescription>
            Preencha os detalhes abaixo para criar um novo pedido para um cliente.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
            <OrderRegistrationForm
                products={products}
                onSubmit={onOrderSubmit}
                isPending={isPending}
                onCancel={() => onOpenChange(false)}
            />
        </div>
      </SheetContent>
    </Sheet>
  );
}
