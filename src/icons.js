import {
  Code2, ServerCog, LayoutPanelLeft, Database, Cloud, Wrench, BrainCircuit, Sparkles,
  GraduationCap, School, Award, Globe, Smartphone, Shield, Terminal, Cpu, Palette, Layers,
  Rocket, Star, Trophy, BookOpen, Link2,
} from "lucide-react";

// Icons the admin panel can assign to skill groups, education and certifications.
export const ICONS = {
  Code2, ServerCog, LayoutPanelLeft, Database, Cloud, Wrench, BrainCircuit, Sparkles,
  GraduationCap, School, Award, Globe, Smartphone, Shield, Terminal, Cpu, Palette, Layers,
  Rocket, Star, Trophy, BookOpen,
};
export const ICON_NAMES = Object.keys(ICONS);
export const getIcon = (name, fallback = Sparkles) => ICONS[name] || fallback;
export { Link2 };
