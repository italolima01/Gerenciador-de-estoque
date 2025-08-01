
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

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
import type { Product } from '@/lib/types';

interface SelectQuantityDialogProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (productId: string, quantity: number) => void;
  isPending: boolean;
}

export function SelectQuantityDialog({ product, isOpen, onOpenChange, onConfirm, isPending }: SelectQuantityDialogProps) {
    
  const formSchema = z.object({
    quantity: z.coerce
      .number()
      .int()
      .positive('A quantidade deve ser positiva.')
      .max(product?.quantity ?? 0, `Máximo de ${product?.quantity} em estoque.`),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
    },
  });
  
  React.useEffect(() => {
    if (product) {
       form.reset({ quantity: 1 });
    }
  }, [product, form, isOpen]);

  if (!product) return null;

  function onSubmit(values: FormValues) {
    if(product) {
      onConfirm(product.id, values.quantity);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Selecionar Quantidade para {product.name}</DialogTitle>
          <DialogDescription>
            Insira a quantidade que deseja adicionar ao pedido. O estoque atual é de {product.quantity} unidades.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} autoFocus min={1} max={product.quantity} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
