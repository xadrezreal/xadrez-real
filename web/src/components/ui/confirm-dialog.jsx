import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

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
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              variant === "destructive"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-cyan-500 hover:bg-cyan-600 text-white"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
