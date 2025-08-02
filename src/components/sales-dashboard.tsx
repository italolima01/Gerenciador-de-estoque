
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Order, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';

interface SalesDashboardProps {
    orders: Order[];
    products: Product[];
    isLoading: boolean;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                Data
                </span>
                <span className="font-bold text-muted-foreground">
                {label}
                </span>
            </div>
            <div className="flex flex-col space-y-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                Vendas
                </span>
                <span className="font-bold">
                {formatCurrency(payload[0].value)}
                </span>
            </div>
            </div>
        </div>
        );
    }

  return null;
};


export function SalesDashboard({ orders, products, isLoading }: SalesDashboardProps) {

    const salesData = React.useMemo(() => {
        const completedOrders = orders.filter(o => o.status === 'Concluído');
        
        const calculateTotalValue = (order: Order) => {
            return order.items.reduce((total, item) => {
                const product = products.find(p => p.id === item.productId);
                return total + (product?.price || 0) * item.quantity;
            }, 0);
        };

        const today = new Date();
        
        // Weekly Data (last 7 days)
        const weeklySales: { [key: string]: number } = {};
        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const formattedDate = format(date, 'dd/MM');
            weeklySales[formattedDate] = 0;
        }

        completedOrders.forEach(order => {
            const orderDate = parseISO(order.createdAt);
            if (orderDate >= subDays(today, 7)) {
                const formattedDate = format(orderDate, 'dd/MM');
                if (weeklySales[formattedDate] !== undefined) {
                    weeklySales[formattedDate] += calculateTotalValue(order);
                }
            }
        });
        
        const weeklyChartData = Object.keys(weeklySales).map(date => ({
            date,
            total: weeklySales[date]
        }));


        // Monthly Data (last 30 days)
        const monthlySales: { [key: string]: number } = {};
        for (let i = 29; i >= 0; i--) {
            const date = subDays(today, i);
            const formattedDate = format(date, 'dd/MM');
            monthlySales[formattedDate] = 0;
        }

        completedOrders.forEach(order => {
            const orderDate = parseISO(order.createdAt);
            if (orderDate >= subDays(today, 30)) {
                const formattedDate = format(orderDate, 'dd/MM');
                 if (monthlySales[formattedDate] !== undefined) {
                    monthlySales[formattedDate] += calculateTotalValue(order);
                }
            }
        });

        const monthlyChartData = Object.keys(monthlySales).map(date => ({
            date,
            total: monthlySales[date]
        }));


        return { weeklyChartData, monthlyChartData };

    }, [orders, products]);

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Vendas da Última Semana</CardTitle>
                    <CardDescription>Total de vendas nos últimos 7 dias.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.weeklyChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value as number)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Vendas do Último Mês</CardTitle>
                    <CardDescription>Total de vendas nos últimos 30 dias.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value as number)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

