'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

const getFormSchema = (maxQuantity: number, unitsPerPack: number) => z.object({
    quantity: z.coerce
      .number()
      .int()
      .positive('A quantidade deve ser positiva.'),
    unitType: z.enum(['unit', 'pack']),
}).refine(
    (data) => {
        const totalUnits = data.unitType === 'pack' ? data.quantity * unitsPerPack : data.quantity;
        return totalUnits <= maxQuantity;
    },
    {
        message: `Estoque insuficiente. Máximo: ${Math.floor(maxQuantity / (unitsPerPack > 0 ? unitsPerPack : 1))} embalagens ou ${maxQuantity} unidades.`,
        path: ['quantity'],
    }
);


export function SelectQuantityDialog({ product, isOpen, onOpenChange, onConfirm, isPending }: SelectQuantityDialogProps) {
    
  const formSchema = getFormSchema(product?.quantity ?? 0, product?.unitsPerPack ?? 1);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      unitType: 'unit',
    },
  });
  
  React.useEffect(() => {
    if (isOpen && product) {
       form.reset({ quantity: 1, unitType: 'unit' });
       // Re-initialize resolver if product changes while dialog is open (edge case)
       form.trigger();
    }
  }, [isOpen, product, form]);

  if (!product) return null;
  
  const canSellAsPack = product.unitsPerPack > 1;
  const currentUnitType = form.watch('unitType');

  function onSubmit(values: FormValues) {
    const totalUnits = values.unitType === 'pack' ? values.quantity * product!.unitsPerPack : values.quantity;
    onConfirm(product!.id, totalUnits);
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
              name="unitType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Vender como:</FormLabel>
                   {canSellAsPack && (
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="unit" id="unit"/>
                            </FormControl>
                            <FormLabel htmlFor="unit" className="font-normal cursor-pointer">Unidade</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="pack" id="pack" />
                            </FormControl>
                            <FormLabel htmlFor="pack" className="font-normal cursor-pointer">{product.packType} ({product.unitsPerPack} un.)</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        {...field} 
                        autoFocus 
                        min={1} 
                    />
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
