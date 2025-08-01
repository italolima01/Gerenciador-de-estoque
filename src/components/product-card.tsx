'use client';

import Image from 'next/image';
import { MoreVertical, Bell, ShoppingCart } from 'lucide-react';

import type { ProductWithStatus } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: ProductWithStatus;
  onSellClick: () => void;
  onAlertClick: () => void;
}

const zoneVariantMap: { [key: string]: BadgeProps['variant'] } = {
  red: 'destructive',
  yellow: 'secondary',
  green: 'success',
};

const zoneTextMap: { [key: string]: string } = {
    red: 'Crítico',
    yellow: 'Atenção',
    green: 'Ideal',
}


export function ProductCard({ product, onSellClick, onAlertClick }: ProductCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative aspect-square w-full">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={product.imageHint}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <div className="flex items-start justify-between">
           <CardTitle className="font-headline text-lg leading-tight">{product.name}</CardTitle>
            <Badge variant={zoneVariantMap[product.zone] || 'default'} className="capitalize shrink-0">
                {zoneTextMap[product.zone] || product.zone}
            </Badge>
        </div>
        <CardDescription className="mt-2">Vencimento: {new Date(product.expirationDate).toLocaleDateString()}</CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
        <div>
            <p className="text-sm text-muted-foreground">Em estoque</p>
            <p className="text-2xl font-bold">{product.quantity}</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSellClick}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Registrar Venda</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAlertClick}>
              <Bell className="mr-2 h-4 w-4" />
              <span>Ver Alerta de Compra</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
