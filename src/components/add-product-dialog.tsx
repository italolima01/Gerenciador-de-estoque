
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addYears } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  packType: z.string().min(2, { message: 'O tipo de embalagem deve ter pelo menos 2 caracteres.' }),
  unitsPerPack: z.coerce.number().int().min(1, { message: 'Deve haver pelo menos 1 unidade.' }),
  packQuantity: z.coerce.number().int().min(0, { message: 'A quantidade não pode ser negativa.' }),
  price: z.string().refine(value => !isNaN(parseFloat(value.replace('.', '').replace(',', '.'))), { message: 'O preço deve ser um número válido.' }),
  expirationDate: z.date({ required_error: 'A data de vencimento é obrigatória.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductAdd: (product: Omit<Product, 'id' | 'quantity'>) => void;
  isPending: boolean;
}

export function AddProductDialog({ isOpen, onOpenChange, onProductAdd, isPending }: AddProductDialogProps) {
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      packType: '',
      unitsPerPack: 1,
      packQuantity: 0,
      price: '',
    },
  });
  
  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  function onSubmit(values: FormValues) {
    const priceAsString = values.price || '';
    const priceAsNumber = parseFloat(priceAsString.replace(/\./g, '').replace(',', '.'));
    const newProduct: Omit<Product, 'id' | 'quantity'> = {
      name: values.name,
      packType: values.packType,
      unitsPerPack: values.unitsPerPack,
      packQuantity: values.packQuantity,
      price: priceAsNumber,
      expirationDate: format(values.expirationDate, 'yyyy-MM-dd'),
    };
    onProductAdd(newProduct);
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (value: string) => void) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{1,})(\d{2})$/, '$1,$2');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    fieldChange(value);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Adicionar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para adicionar uma nova bebida ao seu inventário.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Cerveja Artesanal IPA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="packType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Embalagem</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Caixa, Fardo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitsPerPack"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidades por Embalagem</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="packQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qtd. de Caixas/Fardos</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço por Unidade (R$)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12,99"
                      {...field}
                      onChange={(e) => handlePriceChange(e, field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col col-span-2">
                  <FormLabel>Data de Vencimento</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Escolha uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="buttons"
                        fromDate={new Date()}
                        toDate={addYears(new Date(), 10)}
                        selected={field.value}
                        onSelect={(date) => {
                          if(date) field.onChange(date);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="col-span-2">
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar Produto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
