import { Wine } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Wine className="h-6 w-6 text-primary" />
      <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
        Distribuidora Chego Já
      </h1>
    </div>
  );
}
