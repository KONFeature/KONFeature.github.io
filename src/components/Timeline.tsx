import React, { useState } from 'react';
import { 
  Train, 
  Smartphone, 
  Car, 
  Rocket, 
  ShieldCheck, 
  Trophy, 
  Code, 
  Calendar,
  Filter,
  Feather
} from 'lucide-react';

const Timeline = () => {
  const [filter, setFilter] = useState<'all' | 'work' | 'achievement'>('all');

  const events = [
    {
      type: "achievement",
      date: "May 2024",
      title: "Global Gas Golfing Silver",
      company: "NodeGuardians Contest",
      description: "Ranked 2nd worldwide in an extreme EVM optimization challenge. Deep dive into assembly, memory management, and opcode-level optimizations.",
      icon: Trophy,
      color: "text-yellow-400",
      tech: ["Yul", "Assembly", "EVM"]
    },
    {
      type: "achievement",
      date: "Mar 2024",
      title: "Technical Thought Leader",
      company: "Medium / Frak-Defi",
      description: "Authored a highly-cited series on 'ERC-2612 Gasless Approvals' and 'Solidity Gas Efficiency', gathering over 1k+ reads. Recognized for deep-dives into Account Abstraction and Hardhat vs Foundry benchmarks.",
      icon: Feather, // Suggested icon: Feather or PenTool
      color: "text-teal-400",
      tech: ["Technical Writing", "Community", "Education"]
    },
    {
      type: "achievement",
      date: "Jan 2024",
      title: "WebAuthn Validator Pioneer",
      company: "ZeroDev Kernel",
      description: "Implemented one of the first ERC-4337 compatible WebAuthn validators. Enabled biometric signing for smart wallets, still running in production today.",
      icon: ShieldCheck,
      color: "text-green-400",
      tech: ["Cryptography", "ERC-4337", "Biometrics"]
    },
    {
      type: "work",
      date: "2022 - Present",
      title: "Co-Founder & CTO",
      company: "Frak Labs",
      description: "Building the future of content monetization. Started with a 'Watch-to-Earn' MVP (sniffing Youtube data) which became a top Polygon gas guzzler. Pivoted to a sovereign, non-custodial wallet infrastructure for referral marketing.",
      icon: Rocket,
      color: "text-purple-400",
      tech: ["Solidity", "SST", "TypeScript", "DeFi"]
    },
    {
      type: "work",
      date: "2021 - 2023",
      title: "Lead Android Engineer",
      company: "Sybel",
      description: "Spearheaded the Android and Android Automotive apps. Partnered with Renault for their onboard system launch, delivering one of the first apps for the Android Automotive OS ecosystem.",
      icon: Car,
      color: "text-blue-400",
      tech: ["Android", "Kotlin", "Automotive"]
    },
    {
      type: "work",
      date: "2019 - 2020",
      title: "Freelance Android Developer",
      company: "Various Clients",
      description: "Built custom mobile experiences for various clients, including the Coyali app to help seniors use smartphones.",
      icon: Smartphone,
      color: "text-pink-400",
      tech: ["Android", "Java/Kotlin"]
    },
    {
      type: "work",
      date: "2017 - 2020",
      title: "Mobile Engineer Consultant",
      company: "Capgemini / SNCF",
      description: "Digitizing the French railway system. Built robust Android applications for onboard agents and ticket validation terminals (SNCF).",
      icon: Train,
      color: "text-red-400",
      tech: ["Android", "Enterprise", "Hardware Integration"]
    },
    {
      type: "work",
      date: "2016 - 2017",
      title: "Full Stack Freelancer",
      company: "Construction Sector (BTP)",
      description: "The early days. Built PHP-based automation tools for inventory management and vehicle mileage tracking for small construction firms.",
      icon: Code,
      color: "text-gray-400",
      tech: ["PHP", "Web", "Automation"]
    }
  ];

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      
      {/* Filter Controls */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-white/5 p-1 rounded-lg border border-white/10">
          {['all', 'work', 'achievement'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-4 py-2 text-xs font-medium rounded-md capitalize transition-all ${
                filter === tab 
                  ? 'bg-white/10 text-white shadow-sm border border-white/10' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="relative border-l border-white/10 ml-3 md:ml-6 space-y-12">
        {filteredEvents.map((event, index) => (
          <div key={index} className="relative pl-8 md:pl-12 group animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Timeline Dot */}
            <span className={`absolute -left-3 md:-left-3 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#0a0a0a] border border-white/10 group-hover:border-white/30 transition-colors ${event.color}`}>
                <event.icon size={14} />
            </span>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-1 uppercase tracking-wider">
                <Calendar size={12} />
                {event.date}
            </div>

            {/* Content Card */}
            <div className={`bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all ${event.type === 'achievement' ? 'border-l-4 border-l-current' : ''} ${event.color.replace('text-', 'border-l-')}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                    <div>
                        <h3 className="text-xl font-bold text-white">{event.title}</h3>
                        <span className="text-sm text-gray-400 font-medium">{event.company}</span>
                    </div>
                    <div className={`p-2 rounded-lg bg-white/5 w-fit ${event.color}`}>
                        <event.icon size={20} />
                    </div>
                </div>
                
                <p className="text-gray-400 mb-4 leading-relaxed">
                    {event.description}
                </p>

                <div className="flex flex-wrap gap-2">
                    {event.tech.map((t) => (
                        <span key={t} className="px-2 py-1 bg-black/50 border border-white/10 rounded text-[10px] font-mono text-gray-300 uppercase">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;
