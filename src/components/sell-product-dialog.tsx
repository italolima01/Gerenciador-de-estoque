'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { ProductWithStatus } from '@/lib/types';

interface SellProductDialogProps {
  product: ProductWithStatus;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSell: (product: ProductWithStatus, quantitySold: number) => void;
  isPending: boolean;
}

export function SellProductDialog({ product, isOpen, onOpenChange, onSell, isPending }: SellProductDialogProps) {
  const formSchema = z.object({
    quantitySold: z.coerce.number().int().positive('A quantidade deve ser positiva.').max(product.quantity, `Máximo de ${product.quantity} em estoque.`),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantitySold: 1,
    },
  });

  function onSubmit(values: FormValues) {
    onSell(product, values.quantitySold);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Registrar Venda de {product.name}</DialogTitle>
          <DialogDescription>
            Insira a quantidade vendida. O estoque atual é de {product.quantity} unidades.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantitySold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade Vendida</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Venda
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
