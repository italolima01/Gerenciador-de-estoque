
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Product, Order } from '@/lib/types';
import { Separator } from './ui/separator';
import { ConfirmOrderDialog } from './confirm-order-dialog';

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
  const [orderToConfirm, setOrderToConfirm] = React.useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      items: [{ productId: '', quantity: 1 }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const availableProducts = products.filter(p => p.quantity > 0);
  const watchItems = form.watch('items');

  const totalOrderValue = React.useMemo(() => {
    return watchItems.reduce((total, item) => {
        const product = products.find(p => p.id === item.productId);
        const price = product?.price || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
    }, 0);
  }, [watchItems, products]);

  function handleConfirmation(values: FormValues) {
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
    setOrderToConfirm(values);
  }

  function handleFinalSubmit() {
    if (!orderToConfirm) return;

    const newOrderData = {
        customerName: orderToConfirm.customerName,
        deliveryDate: format(orderToConfirm.deliveryDate, 'yyyy-MM-dd'),
        items: orderToConfirm.items.map(item => ({
            productId: item.productId,
            productName: products.find(p => p.id === item.productId)?.name || 'Produto desconhecido',
            quantity: item.quantity,
        })),
        notes: orderToConfirm.notes,
    };
    
    onSubmit(newOrderData);

    toast({
        title: "Pedido Registrado!",
        description: "O novo pedido foi criado com sucesso.",
    });
    setOrderToConfirm(null);
    form.reset({
        customerName: '',
        items: [{ productId: '', quantity: 1 }],
        notes: '',
        deliveryDate: undefined
    });
  }

  return (
    <>
    <Form {...form}>
    <form onSubmit={form.handleSubmit(handleConfirmation)} className="space-y-8">
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
                          field.onChange(date);
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
                      const selectedProductId = watchItems?.[index]?.productId;
                      const selectedProduct = availableProducts.find(p => p.id === selectedProductId);
                      const maxQuantity = selectedProduct?.quantity ?? 0;
                      const price = selectedProduct?.price ?? 0;
                      const quantity = watchItems?.[index]?.quantity ?? 0;
                      const subtotal = price * quantity;

                    return (
                        <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg bg-muted/50">
                            <div className="flex-1 grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Produto</FormLabel>
                                    <Select 
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            form.setValue(`items.${index}.quantity`, 1);
                                        }} 
                                        defaultValue={field.value}
                                    >
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma bebida" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableProducts.map(product => (
                                        <SelectItem key={product.id} value={product.id} disabled={watchItems.some((item, i) => i !== index && item.productId === product.id)}>
                                            {product.name} (Estoque: {product.quantity})
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantidade</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} min={1} max={maxQuantity > 0 ? maxQuantity : undefined} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
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
                            disabled={fields.length <= 1}
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )
                })}
            </div>
            <div className="flex justify-between items-center mt-4">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: '', quantity: 1 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Item
                </Button>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Valor Total do Pedido</p>
                    <p className="font-bold text-2xl text-primary">{formatCurrency(totalOrderValue)}</p>
                </div>
            </div>
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
    {orderToConfirm && (
        <ConfirmOrderDialog
            isOpen={!!orderToConfirm}
            onOpenChange={() => setOrderToConfirm(null)}
            customerName={orderToConfirm.customerName}
            totalValue={totalOrderValue}
            onConfirm={handleFinalSubmit}
            isPending={isPending}
        />
    )}
    </>
  );
}
