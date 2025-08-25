'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addYears, parseISO, parse } from 'date-fns';
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

interface EditProductDialogProps {
  product: Product;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductEdit: (product: Product) => void;
  isPending: boolean;
}

const formatPriceForInput = (price?: number): string => {
    if (price === undefined || price === null) return '';
    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    return formatted;
}

export function EditProductDialog({ product, isOpen, onOpenChange, onProductEdit, isPending }: EditProductDialogProps) {
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  const [dateInput, setDateInput] = React.useState('');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
    if (product && isOpen) {
        const expirationDate = parseISO(product.expirationDate);
        setDateInput(format(expirationDate, 'dd/MM/yyyy'));

      if (product.packType === 'Unidade') {
        form.reset({
          packType: 'Unidade',
          name: product.name,
          quantity: product.quantity,
          price: formatPriceForInput(product.price),
          expirationDate,
        });
      } else {
        form.reset({
          packType: product.packType,
          name: product.name,
          unitsPerPack: product.unitsPerPack,
          packQuantity: product.packQuantity,
          packPrice: formatPriceForInput(product.packPrice),
          expirationDate,
        });
      }
    }
  }, [product, form, isOpen]);

  function onSubmit(values: FormValues) {
    let updatedProduct: Product;
    
    if (values.packType === 'Unidade') {
        const unitPrice = parseFloat(values.price!.replace(/\./g, '').replace(',', '.'));
        updatedProduct = {
            ...product,
            name: values.name,
            packType: 'Unidade',
            unitsPerPack: 1,
            packQuantity: values.quantity!,
            packPrice: unitPrice,
            price: unitPrice,
            expirationDate: format(values.expirationDate, 'yyyy-MM-dd'),
            quantity: values.quantity!, // Direct quantity
        };
    } else {
        const packPriceAsNumber = parseFloat(values.packPrice!.replace(/\./g, '').replace(',', '.'));
        const pricePerUnit = values.unitsPerPack! > 0 ? packPriceAsNumber / values.unitsPerPack! : 0;
        updatedProduct = {
            ...product,
            name: values.name,
            packType: values.packType!,
            unitsPerPack: values.unitsPerPack!,
            packQuantity: values.packQuantity!,
            packPrice: packPriceAsNumber,
            price: pricePerUnit,
            expirationDate: format(values.expirationDate, 'yyyy-MM-dd'),
            quantity: values.packQuantity! * values.unitsPerPack!, // Recalculated quantity
        };
    }
    
    onProductEdit(updatedProduct);
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (value: string) => void) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    
    const numericValue = (parseInt(value, 10) / 100);
    if(isNaN(numericValue)) {
        fieldChange('');
        return;
    }
    value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(numericValue);

    fieldChange(value);
  };
  
  const watchedPackType = form.watch('packType');

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (date?: Date) => void) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    if (value.length > 5) {
      value = `${value.slice(0, 5)}/${value.slice(5, 9)}`;
    }

    setDateInput(value);

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const date = parse(value, 'dd/MM/yyyy', new Date());
        if (!isNaN(date.getTime())) {
            fieldChange(date);
        } else {
            fieldChange(undefined);
        }
    } else {
        fieldChange(undefined);
    }
  };

  const handleDateSelect = (date: Date | undefined, fieldChange: (date?: Date) => void) => {
      if(date) {
        fieldChange(date);
        setDateInput(format(date, 'dd/MM/yyyy'));
        setCalendarOpen(false);
      } else {
        fieldChange(undefined);
        setDateInput('');
      }
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
                   <Select onValueChange={(value) => {
                      field.onChange(value);
                       form.trigger();
                   }} value={field.value}>
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
                                <Input type="number" placeholder="12" {...field} value={field.value ?? ''}/>
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
                                <Input type="number" placeholder="50" {...field} value={field.value ?? ''} />
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
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="dd/mm/aaaa"
                          value={dateInput}
                          onChange={(e) => handleDateInputChange(e, field.onChange)}
                          className="pr-8"
                        />
                      </FormControl>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          aria-label="Abrir calendário"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                    </div>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="buttons"
                        fromDate={new Date()}
                        toDate={addYears(new Date(), 10)}
                        selected={field.value}
                        onSelect={(date) => handleDateSelect(date, field.onChange)}
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
