
"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PhoneCall } from "lucide-react";

interface EmergencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function EmergencyDialog({
  isOpen,
  onClose,
  message = "Your symptoms may indicate a serious condition. Please seek immediate medical attention or contact emergency services.",
}: EmergencyDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="border-destructive bg-destructive/5">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-destructive text-xl gap-2">
            <AlertTriangle className="h-8 w-8" />
            Emergency Alert!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-destructive-foreground/90 text-base py-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
            I Understand
          </Button>
          <AlertDialogAction
            onClick={() => {
              window.location.href = "tel:911"; // Or your local emergency number
              onClose();
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            <PhoneCall className="mr-2 h-5 w-5" /> Call Emergency Services
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
