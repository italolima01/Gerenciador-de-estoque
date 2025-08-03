
'use client';

import { MoreVertical, Trash2, Loader2, Edit } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface ProductCardProps {
  product: ProductWithStatus;
  onAlertClick: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  isAlertLoading: boolean;
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


export function ProductCard({ product, onAlertClick, onEditClick, onDeleteClick, isAlertLoading }: ProductCardProps) {
  const expirationDateColor = getExpirationDateColor(product.expirationDate);
  const formattedExpirationDate = new Date(product.expirationDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
  
  // Use AI-driven zone if available, otherwise fallback to quantity-based zone
  const quantityZone = getZoneForQuantity(product.quantity);
  const displayZone = isAlertLoading ? quantityZone.zone : product.zone;
  const displayVariant = isAlertLoading ? quantityZone.variant : zoneTextMap[product.zone] === 'Crítico' ? 'destructive' : zoneTextMap[product.zone] === 'Atenção' ? 'secondary' : 'success';


  return (
    <Card 
        className="flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer"
    >
      <CardHeader className="flex flex-row items-start p-4 pb-2" onClick={onAlertClick}>
        <div className="flex-grow">
            <div className="flex items-start justify-between">
            <CardTitle className="font-headline text-lg leading-tight">{product.name}</CardTitle>
              {isAlertLoading ? (
                 <Skeleton className="h-6 w-20 rounded-full" />
              ) : (
                <Badge variant={displayVariant} className="capitalize shrink-0">
                    {zoneTextMap[displayZone]}
                </Badge>
              )}
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
             <DropdownMenuItem onClick={onEditClick}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Editar Produto</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
