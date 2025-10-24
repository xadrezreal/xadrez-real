import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

export const ConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "destructive",
}) => {
  console.log("SimpleConfirmDialog render:", { open, title });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              console.log("Botão cancelar clicado");
              onOpenChange(false);
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              console.log("Botão confirmar clicado");
              onConfirm();
            }}
            className={
              variant === "destructive"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-cyan-500 hover:bg-cyan-600"
            }
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
