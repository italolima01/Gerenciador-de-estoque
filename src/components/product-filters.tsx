
'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  quantityFilter: string;
  onQuantityFilterChange: (value: string) => void;
  expirationFilter: string;
  onExpirationFilterChange: (value: string) => void;
}

export function ProductFilters({
  searchQuery,
  onSearchQueryChange,
  quantityFilter,
  onQuantityFilterChange,
  expirationFilter,
  onExpirationFilterChange,
}: ProductFiltersProps) {
  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <Select value={quantityFilter} onValueChange={onQuantityFilterChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Filtrar por quantidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tudo (Quantidade)</SelectItem>
          <SelectItem value="low">Estoque Baixo (≤ 20)</SelectItem>
          <SelectItem value="medium">Estoque Médio (21-50)</SelectItem>
          <SelectItem value="high">Estoque Alto (> 50)</SelectItem>
        </SelectContent>
      </Select>
      <Select value={expirationFilter} onValueChange={onExpirationFilterChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Filtrar por vencimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tudo (Vencimento)</SelectItem>
          <SelectItem value="expired">Vencidos</SelectItem>
          <SelectItem value="7days">Vence em 7 dias</SelectItem>
          <SelectItem value="30days">Vence em 30 dias</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
