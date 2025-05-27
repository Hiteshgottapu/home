
import { Sparkles } from 'lucide-react'; // Using Sparkles as a placeholder for a futuristic/AI feel

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showText?: boolean;
}

export function AppLogo({ className, iconSize = 24, textSize = "text-xl", showText = true }: AppLogoProps) {
  return (
    <div className={`group flex items-center gap-2 transition-all duration-300 ease-in-out ${className}`}>
      <Sparkles
        className="text-primary transition-all duration-300 ease-in-out group-hover:text-accent group-hover:rotate-[15deg] group-hover:scale-110"
        size={iconSize}
        strokeWidth={2.5} // Slightly thicker for better visibility
      />
      {showText && (
        <h1
          className={`font-bold ${textSize} text-foreground whitespace-nowrap transition-all duration-300 ease-in-out group-hover:text-primary`}
        >
          VitaLog Pro
        </h1>
      )}
    </div>
  );
}
