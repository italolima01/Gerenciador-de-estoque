
'use client';

import { MoreVertical, Trash2, Edit } from 'lucide-react';
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

function getExpirationInfo(expirationDate: string): { variant: BadgeProps['variant']; text: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only, not time
    const expiry = parseISO(expirationDate);
    const daysUntilExpiration = differenceInDays(expiry, today);

    if (daysUntilExpiration < 0) {
        return { variant: 'destructive', text: 'Vencido' };
    }
    if (daysUntilExpiration <= 30) {
        return { variant: 'warning', text: 'Vence em breve' };
    }
    return { variant: 'outline', text: `Vence em ${new Date(expirationDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` };
}

function getZoneForQuantity(quantity: number): { zone: 'red' | 'yellow' | 'green'; variant: BadgeProps['variant'] } {
    if (quantity <= 20) {
        return { zone: 'red', variant: 'destructive' };
    }
    if (quantity <= 50) {
        return { zone: 'yellow', variant: 'warning' };
    }
    return { zone: 'green', variant: 'success' };
}


export function ProductCard({ product, onAlertClick, onEditClick, onDeleteClick, isAlertLoading }: ProductCardProps) {
  const expirationInfo = getExpirationInfo(product.expirationDate);
  const quantityZone = getZoneForQuantity(product.quantity);

  const getStockDisplay = () => {
    const { quantity, unitsPerPack, packType } = product;
    if (!unitsPerPack || unitsPerPack <= 1) {
      return <p className="text-2xl font-bold">{quantity} <span className="text-base font-normal text-muted-foreground">unidades</span></p>;
    }
    
    const fullPacks = Math.floor(quantity / unitsPerPack);
    const looseUnits = quantity % unitsPerPack;
    
    return (
      <div>
        <p className="text-2xl font-bold">{fullPacks} <span className="text-base font-normal text-muted-foreground">{packType}(s)</span></p>
        {looseUnits > 0 && (
          <p className="text-sm font-medium text-muted-foreground">+ {looseUnits} unidade(s)</p>
        )}
      </div>
    )
  }

  const getPriceDisplay = () => {
    const { packType, price, packPrice, unitsPerPack } = product;

    if (packType === 'Unidade') {
        return `${formatCurrency(price)} / un.`;
    }

    // For packs, prioritize packPrice. Fallback to calculating from unit price if needed.
    const priceToShow = packPrice ?? price * unitsPerPack;
    return `${formatCurrency(priceToShow)} / ${packType.toLowerCase()}`;
  };


  return (
    <Card 
        className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
        onClick={onAlertClick}
    >
      <CardHeader className="flex flex-row items-start p-4 pb-2">
        <div className="flex-grow">
            <div className="flex items-start justify-between">
                <CardTitle className="font-headline text-lg leading-tight mb-1">{product.name}</CardTitle>
                <Badge variant={quantityZone.variant} className="capitalize shrink-0">
                    {zoneTextMap[quantityZone.zone]}
                </Badge>
            </div>
            <p className="font-semibold text-primary">{getPriceDisplay()}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <Badge variant={expirationInfo.variant} className="font-medium">
            {expirationInfo.text}
        </Badge>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
        <div>
            <p className="text-sm text-muted-foreground">Em estoque</p>
            {getStockDisplay()}
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
