'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, parseISO, subMonths, isSameDay, isSameMonth, startOfDay } from 'date-fns';
import { format, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import type { Order, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { SalesDetailDialog } from './sales-detail-dialog';

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
    const [detailOrders, setDetailOrders] = React.useState<Order[] | null>(null);
    const [detailTitle, setDetailTitle] = React.useState('');

    const salesData = React.useMemo(() => {
        const timeZone = 'America/Sao_Paulo';
        const completedOrders = orders.filter(o => o.status === 'Concluído');
        
        const calculateTotalValue = (order: Order) => {
            return order.items.reduce((total, item) => {
                const product = products.find(p => p.id === item.productId);
                return total + (product?.price || 0) * item.quantity;
            }, 0);
        };

        const todayInTimeZone = toZonedTime(new Date(), timeZone);
        
        // --- Weekly Data ---
        const weeklySalesMap = new Map<string, number>(); // Key: 'YYYY-MM-DD', Value: total sales
        for (const order of completedOrders) {
            const orderDateZoned = toZonedTime(parseISO(order.createdAt), timeZone);
            const dateKey = format(orderDateZoned, 'yyyy-MM-dd', { timeZone });
            const currentTotal = weeklySalesMap.get(dateKey) || 0;
            weeklySalesMap.set(dateKey, currentTotal + calculateTotalValue(order));
        }

        const weeklyChartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(todayInTimeZone, i);
            const dateKey = format(date, 'yyyy-MM-dd', { timeZone });
            const label = format(date, 'dd/MM', { timeZone, locale: ptBR });
            weeklyChartData.push({
                date: label,
                fullDate: startOfDay(date),
                total: weeklySalesMap.get(dateKey) || 0
            });
        }

        // --- Monthly Data ---
        const monthlySalesMap = new Map<string, number>(); // Key: 'YYYY-MM', Value: total sales
         for (const order of completedOrders) {
            const orderDateZoned = toZonedTime(parseISO(order.createdAt), timeZone);
            const monthKey = format(orderDateZoned, 'yyyy-MM', { timeZone });
            const currentTotal = monthlySalesMap.get(monthKey) || 0;
            monthlySalesMap.set(monthKey, currentTotal + calculateTotalValue(order));
        }

        const monthlyChartData = [];
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(todayInTimeZone, i);
            const monthKey = format(date, 'yyyy-MM', { timeZone });
            const label = format(date, 'MMMM', { locale: ptBR, timeZone }).replace(/^\w/, (c) => c.toUpperCase());
             monthlyChartData.push({
                month: label,
                fullDate: date,
                total: monthlySalesMap.get(monthKey) || 0
            });
        }


        return { weeklyChartData, monthlyChartData, completedOrders };

    }, [orders, products]);


    const handleBarClick = (data: any, type: 'day' | 'month') => {
        if (!data || !data.activePayload || data.activePayload.length === 0) {
            return;
        }

        const payload = data.activePayload[0].payload;
        const clickedDate = payload.fullDate as Date;
        
        let filteredOrders: Order[] = [];
        if (type === 'day') {
            setDetailTitle(`Vendas de ${payload.date}`);
            filteredOrders = salesData.completedOrders.filter(order => isSameDay(parseISO(order.createdAt), clickedDate));
        } else {
            setDetailTitle(`Vendas de ${payload.month}`);
            filteredOrders = salesData.completedOrders.filter(order => isSameMonth(parseISO(order.createdAt), clickedDate));
        }
        
        setDetailOrders(filteredOrders);
    };

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
        <>
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Vendas da Última Semana</CardTitle>
                    <CardDescription>Total de vendas nos últimos 7 dias. Clique em uma barra para ver detalhes.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.weeklyChartData} onClick={(data) => handleBarClick(data, 'day')}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value as number)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Vendas dos Últimos 12 Meses</CardTitle>
                    <CardDescription>Total de vendas consolidadas por mês. Clique em uma barra para ver detalhes.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.monthlyChartData} onClick={(data) => handleBarClick(data, 'month')}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value as number)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}/>
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
        <SalesDetailDialog 
            isOpen={!!detailOrders}
            onOpenChange={(isOpen) => { if (!isOpen) setDetailOrders(null) }}
            orders={detailOrders || []}
            products={products}
            title={detailTitle}
        />
        </>
    );
}
