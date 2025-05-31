
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ChatUserIcon from '@/components/icons/ChatUserIcon';
import ChatAiIcon from '@/components/icons/ChatAiIcon';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, RefreshCw, Loader2, Hospital, Volume2, VolumeX } from 'lucide-react';
// import type { ExplainSymptomsOutput, MedicineDetailsOutput } from '@/app/actions'; // Assuming these types might be defined elsewhere or not used directly in this version
import ActionFeedbackPopup from './ActionFeedbackPopup';

// Define more generic types if specific ones like ExplainSymptomsOutput are not available/needed for this component's props
interface ExplainSymptomsOutput {
  explanation: string;
  redFlags: string;
  precautionaryMeasures: string;
  homeRemedies: string;
  otcMedications: string;
  encouragement: string;
}

interface MedicineDetailsOutput {
  medicineName: string;
  description: string;
  commonUses: string[];
  howToTake: string;
  commonSideEffects: string[];
  seriousSideEffects: string[];
  importantDisclaimer: string;
}


export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: React.ReactNode;
  timestamp: Date;
  originalQuery?: string;
  isRegenerating?: boolean;
  symptomData?: ExplainSymptomsOutput;
  medicineData?: MedicineDetailsOutput;
}

interface ChatMessageProps {
  message: Message;
  onRegenerate?: (messageId: string, originalQuery: string) => void;
}

const CompactLoader: React.FC = () => (
  <div className="flex items-center justify-center p-2">
    <Loader2 className="h-5 w-5 animate-spin text-primary" />
    <span className="ml-2 text-sm text-muted-foreground">Regenerating...</span>
  </div>
);


export default function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [feedbackPopup, setFeedbackPopup] = useState<{ isVisible: boolean; message: string; type: 'success' | 'info' }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  // Effect to load voices and listen for changes
  useEffect(() => {
    const loadVoices = () => {
      try {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          setAvailableVoices(newVoices);
        }
      } catch (e) {
        console.warn("Error getting voices (might be due to browser restrictions):", e);
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Call it once to try and load initial voices
      loadVoices();
      // Add event listener for subsequent changes
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        // Cancel speech if component unmounts while speaking
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      };
    }
    return () => {}; // No-op cleanup if speech synth not available
  }, []);

  // Effect to cancel speech if the message content changes while speaking
   useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
         window.speechSynthesis.cancel();
      }
    };
  }, [message.id]);


  const handleLike = () => {
    setFeedbackPopup({ isVisible: true, message: 'Liked!', type: 'success' });
  };

  const handleDislike = () => {
    setFeedbackPopup({ isVisible: true, message: 'Feedback noted', type: 'info' });
  };

  const handleRegenerate = () => {
    if (onRegenerate && message.originalQuery) {
      onRegenerate(message.id, message.originalQuery);
    } else {
      console.warn("Regenerate called on message without originalQuery or handler", message);
    }
  };

  const handleConnectDoctor = () => {
    setFeedbackPopup({ isVisible: true, message: 'Connecting Doctor...', type: 'info' });
  };

  const getTextToRead = (): string => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (message.symptomData) {
      const { explanation, redFlags, precautionaryMeasures, homeRemedies, otcMedications, encouragement } = message.symptomData;
      let text = "";
      if (encouragement) text += `${encouragement}. `;
      text += `Regarding your symptoms: ${explanation}. `;
      if (redFlags && redFlags.toLowerCase() !== "none" && redFlags.toLowerCase() !== "none identified based on current information.") text += `Potential red flags to watch for: ${redFlags}. `;
      if (precautionaryMeasures) text += `Some helpful precautions: ${precautionaryMeasures}. `;
      if (homeRemedies) text += `Suggested home remedies include: ${homeRemedies}. `;
      if (otcMedications) text += `For over-the-counter ideas: ${otcMedications}. `;
      text += "Please see the card for full details and disclaimers.";
      return text;
    }
    if (message.medicineData) {
      const { medicineName, description, commonUses, howToTake, commonSideEffects, seriousSideEffects, importantDisclaimer } = message.medicineData;
      let text = `Details for ${medicineName}: ${description}. `;
      if (commonUses && commonUses.length > 0) text += `It is commonly used for: ${commonUses.join(', ')}. `;
      if (howToTake) text += `Regarding how to take it: ${howToTake}. `;
      if (commonSideEffects && commonSideEffects.length > 0) text += `Some common side effects are: ${commonSideEffects.join(', ')}. `;
      if (seriousSideEffects && seriousSideEffects.length > 0)  text += `Serious side effects to be aware of include: ${seriousSideEffects.join(', ')}. Seek immediate medical attention if these occur. `;
      text += `Important disclaimer: ${importantDisclaimer}. `;
      text += "Please review the full details in the card.";
      return text;
    }
    return "This content cannot be read aloud.";
  }

  const handleReadAloud = () => {
    try {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error("Speech synthesis not supported by this browser.");
            setFeedbackPopup({ isVisible: true, message: 'Speech not supported', type: 'info' });
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false); // Will be reset by onend/onerror anyway, but good for immediate UI
            return;
        }

        const textToRead = getTextToRead();
        if (textToRead === "This content cannot be read aloud." || !textToRead.trim()) {
            console.warn("Content not suitable for reading aloud or is empty.");
            setFeedbackPopup({ isVisible: true, message: 'Nothing to read', type: 'info' });
            return;
        }

        const utterance = new SpeechSynthesisUtterance(textToRead);
        
        utterance.rate = 0.9;
        utterance.lang = 'en-US'; // Default language

        // Use the voices from state, populated by the useEffect hook
        if (availableVoices.length > 0) {
            let preferredVoice = availableVoices.find(voice => voice.lang.startsWith('en-IN') && /female/i.test(voice.name.toLowerCase()));
            if (!preferredVoice) {
                preferredVoice = availableVoices.find(voice => voice.lang.startsWith('en') && /female/i.test(voice.name.toLowerCase()));
            }
            if (!preferredVoice) {
                preferredVoice = availableVoices.find(voice => voice.lang.startsWith('en-IN'));
            }
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
                utterance.lang = preferredVoice.lang; // Set lang to match the voice
            } else {
                // console.warn("Preferred voice not found. Using browser default for 'en-US'.");
            }
        } else {
            // console.warn("Voice list not yet populated from state. Using browser default for 'en-US'.");
        }
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (event) => {
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
                console.error("Speech synthesis error:", event.error, "Message ID:", message.id, "Text snippet:", utterance.text.substring(0,100)+"...");
                setFeedbackPopup({ isVisible: true, message: 'Speech error', type: 'info' });
            }
            setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);

    } catch (e) {
        console.error("Error in handleReadAloud:", e);
        setFeedbackPopup({ isVisible: true, message: 'Speech init error', type: 'info' });
        setIsSpeaking(false);
    }
  };


  const messageVariants = {
    hidden: {
      opacity: 0,
      x: isUser ? 40 : -40,
      scale: 0.85,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 22,
        duration: 0.5,
      },
    },
  };

  const messageContentTypeElement = message.content as React.ReactElement;
  const messageContentType = messageContentTypeElement?.type?.displayName || (typeof message.content === 'string' ? 'string' : 'unknown');

  const isComplexReport =
    messageContentType === 'ComprehensiveSymptomReport' ||
    messageContentType === 'MedicineInfoReport';

  const showActionBar = !isUser;


  return (
    <motion.div
      className={cn("flex items-end space-x-3 w-full", isUser ? "justify-end" : "justify-start")}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      {!isUser && (
         <motion.div whileHover={{ scale: 1.15 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
          <Avatar className="h-8 w-8 self-start shadow-md border border-primary/30">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <ChatAiIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </motion.div>
      )}
      <div
        className={cn(
          "p-3 md:p-4 rounded-xl shadow-lg break-words transition-shadow duration-200 relative",
           isComplexReport ? "max-w-[95%] md:max-w-[85%]" : "max-w-[80%] md:max-w-[70%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none hover:shadow-primary/40"
            : "bg-card text-card-foreground rounded-bl-none border border-border hover:shadow-md"
        )}
      >
        {message.isRegenerating ? (
          <CompactLoader />
        ) : (
          <>
            {typeof message.content === 'string' ? (
              <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
            ) : (
              message.content
            )}

            {showActionBar && (
              <div className="mt-2 pt-2 border-t border-border/20 flex items-center justify-end space-x-1 relative">
                <ActionFeedbackPopup
                    isVisible={feedbackPopup.isVisible}
                    message={feedbackPopup.message}
                    type={feedbackPopup.type}
                    onClose={() => setFeedbackPopup({ ...feedbackPopup, isVisible: false })}
                />
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-500" onClick={handleLike} aria-label="Like response">
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={handleDislike} aria-label="Dislike response">
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
                {(messageContentType === 'ComprehensiveSymptomReport') && (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-500" onClick={handleConnectDoctor} aria-label="Connect with doctor">
                      <Hospital className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-purple-500" onClick={handleReadAloud} aria-label={isSpeaking ? "Stop reading" : "Read aloud"}>
                    {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </Button>
                </motion.div>
                {message.originalQuery && onRegenerate && (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-accent" onClick={handleRegenerate} aria-label="Regenerate response">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}

        { !isComplexReport && (
          <p className={cn(
              "text-xs mt-2 text-right",
              isUser ? "text-primary-foreground/60" : "text-muted-foreground/60"
            )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      {isUser && (
        <motion.div whileHover={{ scale: 1.15 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
          <Avatar className="h-8 w-8 self-start shadow-md border border-accent/30">
            <AvatarFallback className="bg-accent text-accent-foreground">
              <ChatUserIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </motion.div>
      )}
    </motion.div>
  );
}

ChatMessage.displayName = 'ChatMessage';
