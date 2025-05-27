
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Timer, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ActiveGoalTaskMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveGoalTaskMenu({ isOpen, onClose }: ActiveGoalTaskMenuProps) {
  const [timerDuration, setTimerDuration] = useState<number>(25);
  const { toast } = useToast();

  const handleStartTimer = () => {
    // Placeholder for actual timer logic
    toast({
      title: "Timer Action", // More generic title
      description: `Conceptual: A focus timer for ${timerDuration} minutes would start now. Full timer feature coming soon!`,
    });
    // onClose(); // Optionally close modal after action, or let user close manually
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg border-border">
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle className="text-2xl font-semibold text-foreground text-center">
            Goal Quick Actions
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-1">
            Manage your goals or start a focus session.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Set a New Health Goal Section */}
          <div className="p-5 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
            <h3 className="text-lg font-medium text-primary mb-2 flex items-center">
              <Target className="mr-2.5 h-5 w-5 flex-shrink-0" />
              Set a New Goal
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Define a new health objective to work towards and track your progress.
            </p>
            <Button 
              asChild 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base rounded-md transition-all duration-300 ease-in-out transform hover:shadow-lg"
              onClick={onClose} // Close modal when navigating
            >
              <Link href="/profile#goals">
                Go to Health Goals
              </Link>
            </Button>
          </div>

          {/* Start a Focus Timer Section */}
          <div className="p-5 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
            <h3 className="text-lg font-medium text-accent mb-3 flex items-center">
              <Timer className="mr-2.5 h-5 w-5 flex-shrink-0" />
              Start a Focus Timer
            </h3>
            <div className="space-y-3 mb-4">
              <div>
                <Label htmlFor="timer-duration" className="text-sm font-medium text-foreground">
                  Duration (minutes)
                </Label>
                <Input
                  id="timer-duration"
                  type="number"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  min="1"
                  className="mt-1 bg-card border-input focus:ring-accent text-base"
                />
              </div>
            </div>
            <Button 
              onClick={handleStartTimer} 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base rounded-md transition-all duration-300 ease-in-out transform hover:shadow-lg"
            >
              Start Focus Session
            </Button>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full text-base py-3 rounded-md hover:bg-muted">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
