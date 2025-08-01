'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  FormDescription
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Product, Order } from '@/lib/types';

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

export function OrderRegistrationForm({ products, isPending, onSubmit }: OrderRegistrationFormProps) {
  const { toast } = useToast();
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

  function handleSubmit(values: FormValues) {
    // Validate stock availability before submitting
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
    
    const newOrderData = {
        customerName: values.customerName,
        deliveryDate: format(values.deliveryDate, 'yyyy-MM-dd'),
        items: values.items.map(item => ({
            productId: item.productId,
            productName: products.find(p => p.id === item.productId)?.name || 'Produto desconhecido',
            quantity: item.quantity,
        })),
        notes: values.notes,
    };
    
    onSubmit(newOrderData);

    toast({
        title: "Pedido Registrado!",
        description: "O novo pedido foi criado com sucesso.",
    });
    form.reset({
        customerName: '',
        items: [{ productId: '', quantity: 1 }],
        notes: '',
        deliveryDate: undefined
    });
  }

  return (
    <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
                        <Popover>
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
                                selected={field.value}
                                onSelect={field.onChange}
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

                            return (
                                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg bg-muted/50">
                                    <div className="flex-1">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.productId`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Produto</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma bebida" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableProducts.map(product => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name} (Estoque: {product.quantity})
                                                </SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    </div>
                                    <div className="w-32">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantidade</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} min={1} max={maxQuantity > 0 ? maxQuantity : undefined}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
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
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => append({ productId: '', quantity: 1 })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Item
                    </Button>
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

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Pedido
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
