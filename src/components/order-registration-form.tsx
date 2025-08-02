
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { Product, Order } from '@/lib/types';
import { Separator } from './ui/separator';
import { ConfirmOrderDialog } from './confirm-order-dialog';
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

interface OrderRegistrationFormProps {
  products: Product[];
  isPending: boolean;
  onSubmit: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => void;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function OrderRegistrationForm({ products, isPending, onSubmit }: OrderRegistrationFormProps) {
  const { toast } = useToast();
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isSelectProductOpen, setSelectProductOpen] = React.useState(false);
  const [productForQuantity, setProductForQuantity] = React.useState<Product | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      address: '',
      items: [],
      notes: '',
    },
  });
  
  React.useEffect(() => {
    if (!isPending) {
        const hasItems = form.getValues('items').length > 0;
        if (!hasItems) { // Only reset if the form is empty, indicating a successful submission
            form.reset({
                customerName: '',
                address: '',
                items: [],
                notes: '',
                deliveryDate: undefined
            });
        }
    }
  }, [isPending, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = form.watch('items');

  const availableProducts = products.filter(p => p.quantity > 0 && !watchedItems.some(item => item.productId === p.id));

  const totalOrderValue = watchedItems.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    const price = product?.price || 0;
    const quantity = Number(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);


  function handlePreSubmit(values: FormValues) {
    // Validate stock availability before opening confirmation
    for (const item of values.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.quantity < item.quantity) {
        toast({
            variant: "destructive",
            title: "Estoque Insuficiente",
            description: `O produto "${product?.name}" não tem estoque suficiente para este pedido.`,
        })
        return;
      }
    }
    setIsConfirming(true);
  }
  
  const handleSelectProduct = (product: Product) => {
    setSelectProductOpen(false);
    setProductForQuantity(product);
  };
  
  const handleConfirmQuantity = (productId: string, quantity: number) => {
    append({ productId, quantity });
    setProductForQuantity(null);
  };

  function handleFinalSubmit() {
    const values = form.getValues();
    const newOrderData = {
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
    
    onSubmit(newOrderData);
    setIsConfirming(false);
     form.reset({
        customerName: '',
        address: '',
        items: [],
        notes: '',
        deliveryDate: undefined
    });
  }

  return (
    <>
    <Form {...form}>
    <form onSubmit={form.handleSubmit(handlePreSubmit)} className="space-y-8 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 1}
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) field.onChange(date);
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
              {fields.length === 0 ? (
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
              ) : (
                fields.map((field, index) => {
                      const selectedProduct = products.find(p => p.id === field.productId);
                      const maxQuantity = selectedProduct?.quantity ?? 0;
                      const price = selectedProduct?.price ?? 0;
                      const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                      const subtotal = price * currentQuantity;
                      
                    return (
                        <div key={field.id} className="flex items-end gap-2 p-4 border rounded-lg bg-muted/50">
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
                                            <Input
                                                type="number"
                                                {...field}
                                                min={1}
                                                max={maxQuantity > 0 ? maxQuantity : undefined}
                                                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            />
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
                })
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
        <Separator />
        <div className="flex justify-end">
            <Button type="submit" disabled={isPending || totalOrderValue === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Pedido
            </Button>
        </div>
    </form>
    </Form>
    <ConfirmOrderDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        customerName={form.getValues('customerName')}
        totalValue={totalOrderValue}
        onConfirm={handleFinalSubmit}
        isPending={isPending}
    />
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
