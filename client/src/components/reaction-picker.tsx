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
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" side="top">
        <div className="flex space-x-2">
          {reactions.map((reaction) => {
            const isSelected = currentReaction === reaction.type;
            
            return (
              <Button
                key={reaction.type}
                variant="ghost"
                size="sm"
                className={`h-10 w-10 p-0 rounded-full hover:scale-125 transition-all duration-200 ${
                  isSelected ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleReaction(reaction.type);
                }}
                title={reaction.label}
              >
                <span className="text-xl">
                  {reaction.emoji}
                </span>
              </Button>
            );
          })}
        </div>
        <div className="flex justify-center mt-2 space-x-2">
          {reactions.map((reaction) => (
            <span key={reaction.type} className="text-xs text-gray-500 dark:text-gray-400">
              {reaction.label}
            </span>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { reactions };