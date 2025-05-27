"use client";

import type { HealthGoal } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Edit3, Trash2, CheckCircle, RotateCcw, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';


interface HealthGoalItemProps {
  goal: HealthGoal;
  onUpdateGoalStatus: (goalId: string, status: HealthGoal['status']) => void;
  onEditGoal: (goal: HealthGoal) => void; // To open a modal for editing
  onDeleteGoal: (goalId: string) => void;
}

export function HealthGoalItem({ goal, onUpdateGoalStatus, onEditGoal, onDeleteGoal }: HealthGoalItemProps) {
  
  const handleStatusChange = () => {
    const newStatus = goal.status === 'completed' ? 'in_progress' : 'completed';
    onUpdateGoalStatus(goal.id, newStatus);
  };

  const getStatusBadgeVariant = (status: HealthGoal['status']) => {
    if (status === 'completed') return 'default'; // Default is usually primary, good for success
    if (status === 'in_progress') return 'outline'; // Use outline for active state, maybe with accent text
    return 'secondary'; // For pending or other states
  };
  
  const getStatusIcon = (status: HealthGoal['status']) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'in_progress') return <RotateCcw className="h-4 w-4 text-blue-600 animate-spin-slow" />; // slow spin for active
    return <CalendarClock className="h-4 w-4 text-muted-foreground" />;
  };


  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
           <Checkbox 
            id={`goal-${goal.id}`} 
            checked={goal.status === 'completed'} 
            onCheckedChange={handleStatusChange}
            aria-label={`Mark goal ${goal.description} as ${goal.status === 'completed' ? 'incomplete' : 'complete'}`}
          />
          <div className="flex-1 min-w-0">
            <Label htmlFor={`goal-${goal.id}`} className={`text-base font-medium cursor-pointer ${goal.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {goal.description}
            </Label>
            {goal.targetDate && isValid(parseISO(goal.targetDate)) && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <CalendarClock size={12}/> Target: {format(parseISO(goal.targetDate), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <Badge variant={getStatusBadgeVariant(goal.status)} className="capitalize hidden sm:flex items-center gap-1">
                {getStatusIcon(goal.status)}
                {goal.status.replace('_', ' ')}
            </Badge>
          <Button variant="ghost" size="icon" onClick={() => onEditGoal(goal)} className="h-8 w-8" aria-label="Edit goal">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDeleteGoal(goal.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete goal">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
