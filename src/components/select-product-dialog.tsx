
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { Search } from 'lucide-react';
import { Input } from './ui/input';

interface SelectProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

function getStockDisplay(product: Product) {
    const { quantity, unitsPerPack, packType } = product;
    if (packType === 'Unidade' || !unitsPerPack || unitsPerPack <= 1) {
        return `${quantity} un.`;
    }
    
    const fullPacks = Math.floor(quantity / unitsPerPack);
    const looseUnits = quantity % unitsPerPack;
    
    if (looseUnits === 0) {
        return `${fullPacks} ${packType.toLowerCase()}(s)`;
    }
    
    return `${fullPacks} ${packType.toLowerCase()}(s) e ${looseUnits} un.`;
}

export function SelectProductDialog({ isOpen, onOpenChange, products, onSelectProduct }: SelectProductDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const getPriceDisplay = (product: Product) => {
    const { packType, price, packPrice } = product;

    if (packType === 'Unidade') {
        return `${formatCurrency(price)} / un.`;
    }

    const priceToShow = packPrice ?? price;
    return `${formatCurrency(priceToShow)} / ${packType.toLowerCase()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Produto</DialogTitle>
          <DialogDescription>
            Escolha um produto da lista para adicionar ao pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
            type="search"
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-background pl-10"
            />
        </div>
        <ScrollArea className="h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{getStockDisplay(product)}</TableCell>
                  <TableCell className="text-right">{getPriceDisplay(product)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => onSelectProduct(product)}
                    >
                      Adicionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredProducts.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                Nenhum produto encontrado.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
