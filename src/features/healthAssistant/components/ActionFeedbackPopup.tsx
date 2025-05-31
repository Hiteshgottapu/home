
"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionFeedbackPopupProps {
  isVisible: boolean;
  message: string;
  type: 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

const ActionFeedbackPopup: React.FC<ActionFeedbackPopupProps> = ({
  isVisible,
  message,
  type,
  onClose,
  duration = 2000, // Default duration 2 seconds
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const Icon = type === 'success' ? CheckCircle : Info;
  const iconColor = type === 'success' ? 'text-green-500' : 'text-blue-500';
  const bgColor = type === 'success' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900';
  const borderColor = type === 'success' ? 'border-green-300 dark:border-green-700' : 'border-blue-300 dark:border-blue-700';
  const textColor = type === 'success' ? 'text-green-700 dark:text-green-200' : 'text-blue-700 dark:text-blue-200';


  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95, transition: { duration: 0.2 } }}
          className={cn(
            "absolute bottom-full right-0 mb-2 p-2.5 rounded-md shadow-lg border text-xs font-medium flex items-center space-x-1.5 z-20 min-w-[140px]",
            bgColor,
            borderColor,
            textColor
          )}
          style={{ pointerEvents: 'auto' }}
        >
          <Icon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
          <span>{message}</span>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
                "h-5 w-5 absolute top-0.5 right-0.5 text-muted-foreground hover:bg-transparent",
                type === 'success' ? 'hover:text-green-600' : 'hover:text-blue-600'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close feedback"
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

ActionFeedbackPopup.displayName = 'ActionFeedbackPopup';
export default ActionFeedbackPopup;
