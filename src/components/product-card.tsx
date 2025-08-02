
'use client';

import { MoreVertical, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

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
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: ProductWithStatus;
  onAlertClick: () => void;
  onDeleteClick: () => void;
}

const zoneTextMap: { [key: string]: string } = {
    red: 'Crítico',
    yellow: 'Atenção',
    green: 'Ideal',
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

function getExpirationDateColor(expirationDate: string): string {
    const today = new Date();
    const expiry = parseISO(expirationDate);
    const daysUntilExpiration = differenceInDays(expiry, today);

    if (daysUntilExpiration <= 14) {
        return 'text-destructive'; // Red for 14 days or less
    }
    if (daysUntilExpiration <= 30) {
        return 'text-yellow-600'; // Yellow for 15-30 days
    }
    return 'text-green-600'; // Green for more than 30 days
}

function getZoneForQuantity(quantity: number): { zone: 'red' | 'yellow' | 'green'; variant: BadgeProps['variant'] } {
    if (quantity <= 20) {
        return { zone: 'red', variant: 'destructive' };
    }
    if (quantity <= 50) {
        return { zone: 'yellow', variant: 'secondary' };
    }
    return { zone: 'green', variant: 'success' };
}


export function ProductCard({ product, onAlertClick, onDeleteClick }: ProductCardProps) {
  const expirationDateColor = getExpirationDateColor(product.expirationDate);
  const formattedExpirationDate = new Date(product.expirationDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
  const { zone, variant } = getZoneForQuantity(product.quantity);

  return (
    <Card 
        className="flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer"
    >
      <CardHeader className="flex flex-row items-start p-4 pb-2" onClick={onAlertClick}>
        <div className="flex-grow">
            <div className="flex items-start justify-between">
            <CardTitle className="font-headline text-lg leading-tight">{product.name}</CardTitle>
                <Badge variant={variant} className="capitalize shrink-0">
                    {zoneTextMap[zone]}
                </Badge>
            </div>
            <p className="mt-1 font-semibold text-primary">{formatCurrency(product.price)}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0" onClick={onAlertClick}>
        <CardDescription className={cn("font-medium", expirationDateColor)}>
            Vencimento: {formattedExpirationDate}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
        <div>
            <p className="text-sm text-muted-foreground">Em estoque</p>
            <p className="text-2xl font-bold">{product.quantity}</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onDeleteClick} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Excluir Produto</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
