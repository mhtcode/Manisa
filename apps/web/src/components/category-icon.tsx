import type { LucideIcon } from "lucide-react";
import { Flower2, Gem, Hand, Heart, Palette, Scissors, Sparkles, WandSparkles } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  nail: Hand,
  scissors: Scissors,
  sparkles: Sparkles,
  palette: Palette,
  wand: WandSparkles,
  flower: Flower2,
  gem: Gem,
  heart: Heart,
};

export const categoryIconOptions = [
  ["nail", "Nail / hand"],
  ["scissors", "Hair / scissors"],
  ["sparkles", "Sparkles"],
  ["palette", "Color palette"],
  ["wand", "Beauty wand"],
  ["flower", "Flower"],
  ["gem", "Gem"],
  ["heart", "Heart"],
] as const;

export function CategoryIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Icon = icons[name] || Sparkles;
  return <Icon aria-hidden="true" className={className} size={size} />;
}
