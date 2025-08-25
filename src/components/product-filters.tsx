
'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StockZone } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  stockZoneFilter: StockZone | 'all';
  onStockZoneFilterChange: (value: StockZone | 'all') => void;
}

export function ProductFilters({
  searchQuery,
  onSearchQueryChange,
  stockZoneFilter,
  onStockZoneFilterChange,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Pesquisar por nome..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full rounded-lg bg-background pl-10"
        />
      </div>
       <RadioGroup
        value={stockZoneFilter}
        onValueChange={(value) => onStockZoneFilterChange(value as StockZone | 'all')}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="font-normal cursor-pointer">Todas</Label>
        </div>
        <div className="flex items-center space-x-2">
            <RadioGroupItem value="green" id="green" />
            <Label htmlFor="green" className="font-normal cursor-pointer">
                <Badge variant="success" className="pointer-events-none">Ideal</Badge>
            </Label>
        </div>
        <div className="flex items-center space-x-2">
            <RadioGroupItem value="yellow" id="yellow" />
            <Label htmlFor="yellow" className="font-normal cursor-pointer">
                <Badge variant="warning" className="pointer-events-none">Atenção</Badge>
            </Label>
        </div>
         <div className="flex items-center space-x-2">
            <RadioGroupItem value="red" id="red" />
            <Label htmlFor="red" className="font-normal cursor-pointer">
                <Badge variant="destructive" className="pointer-events-none">Crítico</Badge>
            </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
