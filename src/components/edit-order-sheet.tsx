'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO, parse } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Product, Order, OrderItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { SelectProductDialog } from './select-product-dialog';
import { SelectQuantityDialog } from './select-quantity-dialog';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  quantity: z.coerce.number().int().min(1, 'A quantidade mínima é 1.'),
});

const formSchema = z.object({
  customerName: z.string().min(2, { message: 'O nome do cliente deve ter pelo menos 2 caracteres.' }),
  address: z.string().min(5, { message: 'O endereço deve ter pelo menos 5 caracteres.' }),
  deliveryDate: z.date({ required_error: 'A data de entrega é obrigatória.' }),
  items: z.array(orderItemSchema).min(1, 'O pedido deve ter pelo menos um item.'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditOrderSheetProps {
  order: Order;
  products: Product[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOrderUpdate: (orderData: Order) => void;
  isPending: boolean;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

function getReadableQuantity(quantity: number, unitsPerPack: number, packType: string) {
    if (packType === 'Unidade' || !unitsPerPack || unitsPerPack <= 1 || quantity < unitsPerPack) {
      return `${quantity} un.`;
    }
    const packs = Math.floor(quantity / unitsPerPack);
    const units = quantity % unitsPerPack;
    if (units === 0) {
        return `${packs} ${packType.toLowerCase()}(s)`;
    }
    return `${packs} ${packType.toLowerCase()}(s) e ${units} un.`;
}

export function EditOrderSheet({ order, products, isOpen, onOpenChange, onOrderUpdate, isPending }: EditOrderSheetProps) {
  const { toast } = useToast();
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  const [isSelectProductOpen, setSelectProductOpen] = React.useState(false);
  const [productForQuantity, setProductForQuantity] = React.useState<Product | null>(null);
  const [dateInput, setDateInput] = React.useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: order.customerName,
      address: order.address,
      deliveryDate: parseISO(order.deliveryDate),
      items: order.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      notes: order.notes || '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        const deliveryDate = parseISO(order.deliveryDate);
        setDateInput(format(deliveryDate, 'dd/MM/yyyy'));
      form.reset({
        customerName: order.customerName,
        address: order.address,
        deliveryDate,
        items: order.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        notes: order.notes || '',
      });
    }
  }, [order, form, isOpen]);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch('items');
  const totalOrderValue = watchedItems.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    const price = product?.price || 0;
    const quantity = Number(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);


  function getAvailableStock(productId: string): number {
    const product = products.find(p => p.id === productId);
    const itemInOriginalOrder = order.items.find(item => item.productId === productId);
    // Available stock is the current quantity in inventory PLUS what was in the original order
    return (product?.quantity || 0) + (itemInOriginalOrder?.quantity || 0);
  }


  function handleSubmit(values: FormValues) {
    // Check stock availability before submitting
    for (const item of values.items) {
      const product = products.find(p => p.id === item.productId);
      const availableStock = getAvailableStock(item.productId);

      if (!product || availableStock < item.quantity) {
        toast({
            variant: "destructive",
            title: "Estoque Insuficiente",
            description: `O produto "${product?.name}" não tem estoque suficiente. Disponível: ${availableStock}`,
        })
        return;
      }
    }
    
    const updatedOrderData: Order = {
        ...order,
        customerName: values.customerName,
        address: values.address,
        deliveryDate: format(values.deliveryDate, 'yyyy-MM-dd'),
        items: values.items.map(item => ({
            productId: item.productId,
            productName: products.find(p => p.id === item.productId)?.name || 'Produto desconhecido',
            quantity: item.quantity,
        })),
        notes: values.notes,
    };
    
    onOrderUpdate(updatedOrderData);
  }
  
  const handleSelectProduct = (product: Product) => {
    setSelectProductOpen(false);
    const availableStock = getAvailableStock(product.id);
    setProductForQuantity({ ...product, quantity: availableStock });
  };

  const handleConfirmQuantity = (productId: string, quantity: number) => {
    append({ productId, quantity });
    setProductForQuantity(null);
  };

  const availableProducts = products.filter(p => {
    const isAlreadyInOrder = watchedItems.some(item => item.productId === p.id);
    if (isAlreadyInOrder) return false;
    
    const availableStock = getAvailableStock(p.id);
    return availableStock > 0;
  });
  
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
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-headline">Editar Pedido</SheetTitle>
          <SheetDescription>
            Modifique os detalhes do pedido e salve as alterações.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-grow space-y-4 overflow-y-auto pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Entrega</FormLabel>
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
                            toYear={new Date().getFullYear() + 10}
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
            </div>
            <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Endereço de Entrega</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Rua das Flores, 123, Bairro, Cidade - Estado" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <div>
                <h3 className="text-lg font-medium mb-2">Itens do Pedido</h3>
                <div className="space-y-4">
                    {fields.map((field, index) => {
                          const selectedProduct = products.find(p => p.id === field.productId);
                          const availableStock = getAvailableStock(field.productId);
                          const price = selectedProduct?.price ?? 0;
                          const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                          
                        return (
                            <div key={field.id} className="flex items-end gap-2 p-4 border rounded-lg bg-muted/50">
                               <div className="flex-1 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-4 items-center">
                                  <div>
                                    <p className="font-semibold">{selectedProduct?.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(price)} / un.</p>
                                  </div>
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                    <FormItem className="w-24">
                                        <FormLabel>Qtd. (un)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                {...field} 
                                                min={1} 
                                                max={availableStock > 0 ? availableStock : undefined}
                                                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="w-32 text-right hidden sm:block">
                                    <FormLabel>Subtotal</FormLabel>
                                    <p className="font-semibold text-lg h-10 flex items-center justify-end">{formatCurrency(price * currentQuantity)}</p>
                                </div>
                                </div>
                                <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => remove(index)}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                     {fields.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
                            <p className="text-muted-foreground mb-4">Nenhum item no pedido.</p>
                            <Button
                                type="button"
                                onClick={() => setSelectProductOpen(true)}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Produto
                            </Button>
                        </div>
                    )}
                </div>
                {fields.length > 0 && (
                  <div className="flex justify-between items-center mt-4">
                      <Button
                          type="button"
                          size="sm"
                          onClick={() => setSelectProductOpen(true)}
                          disabled={availableProducts.length === 0}
                      >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar Produto
                      </Button>
                      <div className="text-right">
                          <p className="text-sm text-muted-foreground">Valor Total do Pedido</p>
                          <p className="font-bold text-2xl text-primary">{formatCurrency(totalOrderValue)}</p>
                      </div>
                  </div>
                )}
                 <FormMessage>{form.formState.errors.items?.root?.message || form.formState.errors.items?.message}</FormMessage>
            </div>
             <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Anotações</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Alguma observação sobre o pedido? Ex: Entregar na portaria."
                        className="resize-none"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
          </form>
        </Form>
        <SheetFooter className="mt-auto pt-4">
           <SheetClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </SheetClose>
          <Button onClick={form.handleSubmit(handleSubmit)} disabled={isPending || totalOrderValue === 0}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
     <SelectProductDialog
        isOpen={isSelectProductOpen}
        onOpenChange={setSelectProductOpen}
        products={availableProducts}
        onSelectProduct={handleSelectProduct}
      />
    <SelectQuantityDialog
        isOpen={!!productForQuantity}
        onOpenChange={() => setProductForQuantity(null)}
        product={productForQuantity}
        onConfirm={handleConfirmQuantity}
        isPending={isPending}
    />
    </>
  );
}
