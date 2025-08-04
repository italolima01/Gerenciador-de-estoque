
'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function ProductFilters({
  searchQuery,
  onSearchQueryChange,
}: ProductFiltersProps) {
  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Pesquisar por nome..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full rounded-lg bg-background pl-10"
        />
      </div>
    </div>
  );
}
