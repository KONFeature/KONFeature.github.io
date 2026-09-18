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
  Moon,
  MessageCircle,
  Container,
  Hammer,
  Network,
  Zap,
  Brain,
  Bug,
  ChartLine,
  CloudCog,
  Cog,
  Database,
  FileText,
  Gauge,
  GitCompare,
  Layout,
  Lock,
  Share2,
  Ship,
  Smartphone,
  AudioWaveform,
  Workflow
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
  moon: Moon,
  "message-circle": MessageCircle,
  container: Container,
  hammer: Hammer,
  network: Network,
  zap: Zap,
  brain: Brain,
  bug: Bug,
  "chart-line": ChartLine,
  "cloud-cog": CloudCog,
  cog: Cog,
  database: Database,
  "file-text": FileText,
  gauge: Gauge,
  "git-compare": GitCompare,
  layout: Layout,
  lock: Lock,
  "share-2": Share2,
  ship: Ship,
  smartphone: Smartphone,
  waveform: AudioWaveform,
  workflow: Workflow
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
