
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SortOption = 'name' | 'quantity' | 'expirationDate';
export type SortDirection = 'asc' | 'desc';

interface ProductSortProps {
  sortOption: SortOption;
  onSortOptionChange: (value: SortOption) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (value: SortDirection) => void;
}

export function ProductSort({
  sortOption,
  onSortOptionChange,
  sortDirection,
  onSortDirectionChange,
}: ProductSortProps) {
  return (
    <div className="flex-grow grid grid-cols-2 gap-4">
      <Select value={sortOption} onValueChange={(v) => onSortOptionChange(v as SortOption)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Ordenar por..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="quantity">Quantidade</SelectItem>
          <SelectItem value="expirationDate">Data de Vencimento</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortDirection} onValueChange={(v) => onSortDirectionChange(v as SortDirection)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Ordem..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Crescente</SelectItem>
          <SelectItem value="desc">Decrescente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
