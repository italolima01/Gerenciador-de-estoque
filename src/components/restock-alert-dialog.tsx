
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ProductWithStatus } from '@/lib/types';
import { CheckCircle, AlertTriangle, XCircle, BarChart } from 'lucide-react';

interface RestockAlertDialogProps {
  product: ProductWithStatus;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const zoneInfoMap: { [key: string]: { variant: BadgeProps['variant'], text: string, Icon: React.ElementType } } = {
  red: { variant: 'destructive', text: 'Crítico', Icon: XCircle },
  yellow: { variant: 'secondary', text: 'Atenção', Icon: AlertTriangle },
  green: { variant: 'success', text: 'Ideal', Icon: CheckCircle },
};

const recommendationMap: { [key: string]: string } = {
    red: 'Nível de estoque crítico. Recomenda-se reabastecimento imediato para evitar ruptura.',
    yellow: 'Nível de estoque em atenção. Monitore as vendas e planeje o reabastecimento para breve.',
    green: 'Nível de estoque ideal. Nenhuma ação de reabastecimento é necessária no momento.',
};

export function RestockAlertDialog({ product, isOpen, onOpenChange }: RestockAlertDialogProps) {
    const zoneInfo = zoneInfoMap[product.zone] || zoneInfoMap.yellow;
    const recommendation = recommendationMap[product.zone] || recommendationMap.yellow;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" />
            Alerta de Reabastecimento
          </DialogTitle>
          <DialogDescription>
            Análise e recomendação para {product.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <span className="text-sm font-medium text-muted-foreground">Nível de Estoque Atual</span>
                <Badge variant={zoneInfo.variant} className="text-sm">
                    <zoneInfo.Icon className="mr-2 h-4 w-4"/>
                    {zoneInfo.text}
                </Badge>
            </div>
          <div className="rounded-lg border bg-background p-4">
            <h4 className="font-semibold text-foreground">Recomendação</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {recommendation}
            </p>
          </div>
           <div className="flex items-center justify-between rounded-lg border p-4">
                <span className="text-sm font-medium text-muted-foreground">Nível de Confiança</span>
                <span className="font-semibold capitalize text-foreground">{product.confidenceLevel}</span>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
