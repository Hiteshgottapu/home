import { Sparkles } from 'lucide-react'; // Using Sparkles as a placeholder for a futuristic/AI feel

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showText?: boolean;
}

export function AppLogo({ className, iconSize = 24, textSize = "text-xl", showText = true }: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Sparkles className="text-primary" size={iconSize} strokeWidth={2} />
      {showText && <h1 className={`font-bold ${textSize} text-foreground`}>VitaLog Pro</h1>}
    </div>
  );
}
