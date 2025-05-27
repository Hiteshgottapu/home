"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { HealthGoal } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const HealthGoalSchema = z.object({
  description: z.string().min(5, "Goal description must be at least 5 characters.").max(150, "Description too long."),
  targetDate: z.date().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

type HealthGoalFormValues = z.infer<typeof HealthGoalSchema>;

interface HealthGoalModalProps {
  goal?: HealthGoal | null; // For editing existing goal
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (goalData: Omit<HealthGoal, 'id'> | HealthGoal) => void;
}

export function HealthGoalModal({ goal, isOpen, onClose, onSaveGoal }: HealthGoalModalProps) {
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<HealthGoalFormValues>({
    resolver: zodResolver(HealthGoalSchema),
    defaultValues: {
      description: '',
      status: 'pending',
    }
  });

  const targetDate = watch("targetDate");

  useEffect(() => {
    if (goal) {
      reset({
        description: goal.description,
        targetDate: goal.targetDate ? parseISO(goal.targetDate) : undefined,
        status: goal.status,
      });
    } else {
      reset({
        description: '',
        targetDate: undefined,
        status: 'pending',
      });
    }
  }, [goal, isOpen, reset]);

  const onSubmit: SubmitHandler<HealthGoalFormValues> = (data) => {
    const goalDataToSave = {
      ...data,
      targetDate: data.targetDate ? data.targetDate.toISOString().split('T')[0] : undefined, // Store as YYYY-MM-DD string
    };
    
    if (goal?.id) { // Editing existing goal
      onSaveGoal({ ...goalDataToSave, id: goal.id });
    } else { // Adding new goal
      onSaveGoal(goalDataToSave as Omit<HealthGoal, 'id'>);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{goal ? 'Edit Health Goal' : 'Add New Health Goal'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Update your health goal details below.' : 'Set a new health goal to track your progress.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="description">Goal Description</Label>
            <Textarea
              id="description"
              placeholder="e.g., Drink 8 glasses of water daily"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={(date) => setValue("targetDate", date, {shouldValidate: true})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
             {errors.targetDate && <p className="text-sm text-destructive mt-1">{errors.targetDate.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={goal?.status || 'pending'}
              onValueChange={(value: HealthGoal['status']) => setValue('status', value)}
            >
              <SelectTrigger id="status" className={errors.status ? "border-destructive" : ""}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button type="submit"><CheckCircle className="mr-2 h-4 w-4" />{goal ? 'Save Changes' : 'Add Goal'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
