
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, parseISO, subMonths, startOfDay, format } from 'date-fns';
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
                Mês/Dia
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

        const today = startOfDay(new Date());
        
        // --- Weekly Data ---
        const weeklyChartData = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(today, i);
            return {
                date: format(date, 'dd/MM', { locale: ptBR }),
                total: 0,
            };
        }).reverse();

        completedOrders.forEach(order => {
            const orderDate = startOfDay(parseISO(order.createdAt));
            const dayDifference = Math.round((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDifference >= 0 && dayDifference < 7) {
                const dayIndex = 6 - dayDifference;
                if(weeklyChartData[dayIndex]) {
                    weeklyChartData[dayIndex].total += calculateTotalValue(order);
                }
            }
        });

        // --- Monthly Data ---
        const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
            const date = subMonths(today, i);
            return {
                month: format(date, 'MMMM', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase()),
                total: 0
            };
        }).reverse();
        
        const monthMap = monthlyChartData.reduce((acc, item, index) => {
            acc[item.month] = index;
            return acc;
        }, {} as Record<string, number>);

        completedOrders.forEach(order => {
            const orderDate = parseISO(order.createdAt);
            const orderMonthKey = format(orderDate, 'MMMM', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
            
            if (orderMonthKey in monthMap) {
                const monthIndex = monthMap[orderMonthKey];
                const orderYear = orderDate.getFullYear();
                const chartYear = subMonths(today, 11 - monthIndex).getFullYear();
                
                // Ensure the sale is within the last 12 months from today
                if (orderDate >= subMonths(today, 11)) {
                   if (monthlyChartData[monthIndex]) {
                        monthlyChartData[monthIndex].total += calculateTotalValue(order);
                   }
                }
            }
        });

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
                    <CardTitle>Vendas dos Últimos 12 Meses</CardTitle>
                    <CardDescription>Total de vendas consolidadas por mês.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
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
