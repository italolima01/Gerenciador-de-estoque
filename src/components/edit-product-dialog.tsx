
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addYears, parseISO } from 'date-fns';
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
  packPrice: z.string().refine(value => !isNaN(parseFloat(value.replace('.', '').replace(',', '.'))), { message: 'O preço deve ser um número válido.' }),
  expirationDate: z.date({ required_error: 'A data de vencimento é obrigatória.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProductDialogProps {
  product: Product;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductEdit: (product: Product) => void;
  isPending: boolean;
}

const formatPriceForInput = (price?: number): string => {
    if (price === undefined || price === null) return '';
    return price.toFixed(2).replace('.', ',');
}

export function EditProductDialog({ product, isOpen, onOpenChange, onProductEdit, isPending }: EditProductDialogProps) {
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || '',
      packType: product?.packType || '',
      unitsPerPack: product?.unitsPerPack || 1,
      packQuantity: product?.packQuantity || 0,
      packPrice: formatPriceForInput(product?.packPrice) || '',
      expirationDate: product?.expirationDate ? parseISO(product.expirationDate) : new Date(),
    },
  });
  
  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        packType: product.packType,
        unitsPerPack: product.unitsPerPack,
        packQuantity: product.packQuantity,
        packPrice: formatPriceForInput(product.packPrice),
        expirationDate: parseISO(product.expirationDate),
      });
    }
  }, [product, form]);

  function onSubmit(values: FormValues) {
    const packPriceAsString = values.packPrice || '';
    const packPriceAsNumber = parseFloat(packPriceAsString.replace(/\./g, '').replace(',', '.'));
    const pricePerUnit = values.unitsPerPack > 0 ? packPriceAsNumber / values.unitsPerPack : 0;

    const updatedProduct: Product = {
      ...product,
      name: values.name,
      packType: values.packType,
      unitsPerPack: values.unitsPerPack,
      packQuantity: values.packQuantity,
      packPrice: packPriceAsNumber,
      price: pricePerUnit,
      expirationDate: format(values.expirationDate, 'yyyy-MM-dd'),
      // Total quantity will be recalculated in the parent component
      quantity: product.quantity, 
    };
    onProductEdit(updatedProduct);
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
          <DialogTitle className="font-headline">Editar Produto</DialogTitle>
          <DialogDescription>
            Altere os detalhes do produto abaixo e salve as alterações.
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
                  <FormLabel>Qtd. de Embalagens</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="packPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço por Embalagem (R$)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="77,94"
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
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
