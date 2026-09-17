import React from 'react';
import { 
  Terminal, 
  Server, 
  Cpu, 
  Code2, 
  ArrowUpRight, 
  Flame, 
  Box, 
  ShieldCheck, 
  Command, 
  Menu, 
  X,
  MessageSquareWarning,
  Rocket,
  Blocks,
  Wrench,
  Layers,
  ChefHat,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';
import { GithubIcon, TwitterIcon, LinkedinIcon } from './BrandIcons';

export const IconMap: Record<string, React.ElementType> = {
  terminal: Terminal,
  server: Server,
  cpu: Cpu,
  "code-2": Code2,
  code2: Code2,
  github: GithubIcon,
  twitter: TwitterIcon,
  linkedin: LinkedinIcon,
  flame: Flame,
  box: Box,
  "shield-check": ShieldCheck,
  command: Command,
  menu: Menu,
  x: X,
  "arrow-up-right": ArrowUpRight,
  "message-square-warning": MessageSquareWarning,
  rocket: Rocket,
  blocks: Blocks,
  wrench: Wrench,
  layers: Layers,
  "chef-hat": ChefHat,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "external-link": ExternalLink,
  calendar: Calendar,
  sun: Sun,
  moon: Moon
};

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

const Icon: React.FC<IconProps> = ({ name, className, size = 24 }) => {
  const IconComponent = IconMap[name] || Box;
  return <IconComponent className={className} size={size} />;
};

export default Icon;
