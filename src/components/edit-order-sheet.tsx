
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
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

export function EditOrderSheet({ order, products, isOpen, onOpenChange, onOrderUpdate, isPending }: EditOrderSheetProps) {
  const { toast } = useToast();
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  const [isSelectProductOpen, setSelectProductOpen] = React.useState(false);
  const [productForQuantity, setProductForQuantity] = React.useState<Product | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: order.customerName,
      deliveryDate: parseISO(order.deliveryDate),
      items: order.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      notes: order.notes || '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        customerName: order.customerName,
        deliveryDate: parseISO(order.deliveryDate),
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
  const totalOrderValue = React.useMemo(() => {
    return watchedItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      const price = product?.price || 0;
      const quantity = Number(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  }, [watchedItems, products]);


  function getAvailableStock(productId: string): number {
      const product = products.find(p => p.id === productId);
      const originalOrderItem = order.items.find(item => item.productId === productId);
      const originalQuantity = originalOrderItem?.quantity || 0;
      return (product?.quantity || 0) + originalQuantity;
  }


  function handleSubmit(values: FormValues) {
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
        deliveryDate: format(values.deliveryDate, 'yyyy-MM-dd'),
        items: values.items.map(item => ({
            productId: item.productId,
            productName: products.find(p => p.id === item.productId)?.name || 'Produto desconhecido',
            quantity: item.quantity,
        })),
        notes: values.notes,
    };
    
    onOrderUpdate(updatedOrderData);

    toast({
        title: "Pedido Atualizado!",
        description: "As alterações no pedido foram salvas com sucesso.",
    });
  }
  
  const handleSelectProduct = (product: Product) => {
    setSelectProductOpen(false);
    setProductForQuantity(product);
  };

  const handleConfirmQuantity = (productId: string, quantity: number) => {
    append({ productId, quantity });
    setProductForQuantity(null);
  };

  const availableProducts = products.filter(p => p.quantity > 0 && !watchedItems.some(item => item.productId === p.id));


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
                            fromYear={new Date().getFullYear() - 1}
                            toYear={new Date().getFullYear() + 1}
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
            </div>
             <div>
                <h3 className="text-lg font-medium mb-2">Itens do Pedido</h3>
                <div className="space-y-4">
                    {fields.map((field, index) => {
                          const selectedProduct = products.find(p => p.id === field.productId);
                          const availableStock = getAvailableStock(field.productId);
                          const price = selectedProduct?.price ?? 0;
                          const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                          const subtotal = price * currentQuantity;
                          
                        return (
                            <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg bg-muted/50">
                               <div className="flex-1 grid grid-cols-[1fr_auto] gap-4 items-center">
                                  <div>
                                    <p className="font-semibold">{selectedProduct?.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(price)} / un.</p>
                                  </div>
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                    <FormItem className="w-24">
                                        <FormLabel>Qtd.</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} min={1} max={availableStock > 0 ? availableStock : undefined}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>
                                <div className="w-32 text-right">
                                    <FormLabel>Subtotal</FormLabel>
                                    <p className="font-semibold text-lg h-10 flex items-center justify-end">{formatCurrency(subtotal)}</p>
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
