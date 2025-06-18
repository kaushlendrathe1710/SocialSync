import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Laugh, Frown, Angry, Lightbulb, ThumbsUp } from "lucide-react";

interface ReactionPickerProps {
  onReaction: (reactionType: string) => void;
  currentReaction?: string | null;
  disabled?: boolean;
  children: React.ReactNode;
}

const reactions = [
  { type: 'like', emoji: '👍', icon: ThumbsUp, color: 'text-blue-500', label: 'Like' },
  { type: 'love', emoji: '❤️', icon: Heart, color: 'text-red-500', label: 'Love' },
  { type: 'laugh', emoji: '😂', icon: Laugh, color: 'text-yellow-500', label: 'Haha' },
  { type: 'wow', emoji: '😮', icon: Lightbulb, color: 'text-orange-500', label: 'Wow' },
  { type: 'sad', emoji: '😢', icon: Frown, color: 'text-blue-400', label: 'Sad' },
  { type: 'angry', emoji: '😡', icon: Angry, color: 'text-red-600', label: 'Angry' },
];

export default function ReactionPicker({ onReaction, currentReaction, disabled, children }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReaction = (reactionType: string) => {
    onReaction(reactionType);
    setIsOpen(false);
  };

  const getCurrentReaction = () => {
    return reactions.find(r => r.type === currentReaction);
  };

  const currentReactionData = getCurrentReaction();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex space-x-1">
          {reactions.map((reaction) => {
            const IconComponent = reaction.icon;
            const isSelected = currentReaction === reaction.type;
            
            return (
              <Button
                key={reaction.type}
                variant="ghost"
                size="sm"
                className={`h-12 w-12 p-0 rounded-full hover:scale-110 transition-all duration-200 ${
                  isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
                onClick={() => handleReaction(reaction.type)}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg" title={reaction.label}>
                    {reaction.emoji}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
        <div className="flex justify-center mt-2">
          <div className="flex space-x-1 text-xs text-gray-500">
            {reactions.map((reaction) => (
              <span key={reaction.type} className="px-1">
                {reaction.label}
              </span>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { reactions };