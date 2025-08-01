
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText } from 'lucide-react';

interface ConfirmCompletionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirmWithNote: () => void;
  onConfirmWithoutNote: () => void;
}

export function ConfirmCompletionDialog({
  isOpen,
  onOpenChange,
  onConfirmWithNote,
  onConfirmWithoutNote,
}: ConfirmCompletionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-success" />
            Concluir Pedido
          </AlertDialogTitle>
          <AlertDialogDescription>
            Deseja adicionar uma anotação de conclusão a este pedido antes de marcá-lo como concluído?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
           <AlertDialogCancel>Voltar</AlertDialogCancel>
           <div className="flex flex-col-reverse sm:flex-row sm:gap-2">
             <AlertDialogAction asChild>
                 <Button onClick={onConfirmWithoutNote} variant="secondary">
                    Concluir sem Anotação
                </Button>
            </AlertDialogAction>
            <AlertDialogAction asChild>
                <Button onClick={onConfirmWithNote}>
                    <FileText className="mr-2 h-4 w-4" />
                    Adicionar Anotação
                </Button>
            </AlertDialogAction>
           </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    