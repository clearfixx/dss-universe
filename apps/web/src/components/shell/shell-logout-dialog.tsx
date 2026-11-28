"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logoutAction } from "@/features/auth/auth-actions";

/** Logout confirmation (mockup 06). The session ends only on confirm. */
export function ShellLogoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive" aria-hidden="true">
            <LogOut />
          </span>
          <DialogTitle>Вийти з облікового запису?</DialogTitle>
          <DialogDescription>Ви будете розлогінені на цьому пристрої. Сесія буде завершена.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Скасувати</Button>
          </DialogClose>
          <form action={logoutAction}>
            <Button type="submit" variant="destructive" className="w-full">Вийти</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
