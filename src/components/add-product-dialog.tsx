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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  packType: z.enum(['Caixa', 'Fardo', 'Unidade'], { required_error: 'Selecione um tipo de embalagem.' }),
  quantity: z.coerce.number().int().min(0, { message: 'A quantidade não pode ser negativa.' }).optional(),
  price: z.string().refine(value => !isNaN(parseFloat(value.replace('.', '').replace(',', '.'))), { message: 'O preço deve ser um número válido.' }).optional(),
  unitsPerPack: z.coerce.number().int().min(1, { message: 'Deve haver pelo menos 1 unidade.' }).optional(),
  packQuantity: z.coerce.number().int().min(0, { message: 'A quantidade não pode ser negativa.' }).optional(),
  packPrice: z.string().refine(value => !isNaN(parseFloat(value.replace('.', '').replace(',', '.'))), { message: 'O preço deve ser um número válido.' }).optional(),
  expirationDate: z.date({ required_error: 'A data de vencimento é obrigatória.' }),
}).superRefine((data, ctx) => {
    if (data.packType === 'Unidade') {
        if (data.quantity === undefined || data.quantity === null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A quantidade é obrigatória.', path: ['quantity'] });
        }
        if (!data.price) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O preço é obrigatório.', path: ['price'] });
        }
    } else {
        if (data.unitsPerPack === undefined || data.unitsPerPack === null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'As unidades são obrigatórias.', path: ['unitsPerPack'] });
        }
        if (data.packQuantity === undefined || data.packQuantity === null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A quantidade é obrigatória.', path: ['packQuantity'] });
        }
        if (!data.packPrice) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O preço é obrigatório.', path: ['packPrice'] });
        }
    }
});


type FormValues = z.infer<typeof formSchema>;

interface AddProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductAdd: (product: Omit<Product, 'id'>) => void;
  isPending: boolean;
}

export function AddProductDialog({ isOpen, onOpenChange, onProductAdd, isPending }: AddProductDialogProps) {
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: '',
        packType: undefined,
      });
    }
  }, [isOpen, form]);

  function onSubmit(values: FormValues) {
    let newProduct: Omit<Product, 'id'>;

    if (values.packType === 'Unidade') {
        const unitPrice = parseFloat(values.price!.replace(/\./g, '').replace(',', '.'));
        newProduct = {
            name: values.name,
            packType: 'Unidade',
            unitsPerPack: 1,
            packQuantity: values.quantity!,
            quantity: values.quantity!,
            packPrice: unitPrice,
            price: unitPrice,
            expirationDate: format(values.expirationDate, 'yyyy-MM-dd'),
        };
    } else {
        const packPriceAsNumber = parseFloat(values.packPrice!.replace(/\./g, '').replace(',', '.'));
        const pricePerUnit = values.unitsPerPack! > 0 ? packPriceAsNumber / values.unitsPerPack! : 0;
        newProduct = {
            name: values.name,
            packType: values.packType!,
            unitsPerPack: values.unitsPerPack!,
            packQuantity: values.packQuantity!,
            quantity: values.packQuantity! * values.unitsPerPack!,
            packPrice: packPriceAsNumber,
            price: pricePerUnit,
            expirationDate: format(values.expirationDate, 'yyyy-MM-dd'),
        };
    }

    onProductAdd(newProduct);
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (value: string) => void) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');

    // Convert to number, divide by 100, then format back to string.
    const numericValue = (parseInt(value, 10) / 100).toFixed(2);
    value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(parseFloat(numericValue));

    fieldChange(value);
  };
  
  const watchedPackType = form.watch('packType');

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Caixa">Caixa</SelectItem>
                      <SelectItem value="Fardo">Fardo</SelectItem>
                      <SelectItem value="Unidade">Unidade</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchedPackType === 'Unidade' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantidade Total</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="50" {...field} value={field.value ?? ''} />
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
                            placeholder="5,99"
                            {...field}
                             value={field.value ?? ''}
                            onChange={(e) => handlePriceChange(e, field.onChange)}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>
            )}

            {(watchedPackType === 'Caixa' || watchedPackType === 'Fardo') && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="unitsPerPack"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Unidades por Embalagem</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="12" {...field} value={field.value ?? ''} />
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
                                <Input type="number" placeholder="50" {...field} value={field.value ?? ''}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="packPrice"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                            <FormLabel>Preço por Embalagem (R$)</FormLabel>
                            <FormControl>
                                <Input
                                placeholder="77,94"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => handlePriceChange(e, field.onChange)}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
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
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !watchedPackType}>
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
