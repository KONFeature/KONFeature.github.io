import React, { useState } from 'react';
import { 
  Cpu, 
  Github, 
  ArrowUpRight, 
  Box, 
  ShieldCheck,
  Twitter,
  Linkedin,
  Code2,
  Server,
} from 'lucide-react';
import Icon from './Icon';
import Navigation from './Navigation';
import Footer from './Footer';

interface ArticleData {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  tags: string[];
  readTime: string;
  icon: string;
  iconColor?: string;
  featured: boolean;
  description: string;
  slug: string;
}

interface LandingPageProps {
  articles: ArticleData[];
}

const LandingPage: React.FC<LandingPageProps> = ({ articles }) => {
  const [activeTab, setActiveTab] = useState('all');

  const projects = [
    {
      title: "Frak Labs",
      role: "Co-Founder & CTO",
      desc: "From Polygon's top gas guzzler (Youtube Watch-to-Earn) to DeFi infrastructure & AMMs.",
      link: "#",
      tech: ["Solidity", "SST", "TypeScript"]
    },
    {
      title: "Gas Golfing",
      role: "Ranked #2 Global",
      desc: "Extreme EVM optimization contest. Deep dive into assembly and memory management.",
      link: "#",
      tech: ["Yul", "Assembly", "EVM"]
    },
    {
      title: "Open Source Infra",
      role: "Contributor",
      desc: "Core contributions to eRPC (Load Balancer), Ponder (Indexer), and SST (DevOps).",
      link: "#",
      tech: ["Go", "TypeScript", "Infra"]
    },
    {
      title: "ERC-4337 SDKs",
      role: "Contributor",
      desc: "Helping ZeroDev & Pimlico improve their SDKs. First WebAuthn validator implementation.",
      link: "#",
      tech: ["Cryptography", "AA", "Standards"]
    }
  ];

  const filteredContent = activeTab === 'all' 
    ? articles 
    : articles.filter(a => a.category === activeTab);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans selection:bg-green-500/30">
      
      {/* Navigation / Header */}
      <Navigation />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        
        {/* Hero Section */}
        <section id="about" className="mb-24">
          <div className="grid md:grid-cols-3 gap-12 items-start">
            <div className="md:col-span-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-mono border border-green-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                System Online
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight">
                Building the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">digital</span> & <br />
                hacking the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">physical</span>.
              </h1>
              
              <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
                I'm <strong className="text-white">Quentin Nivelais</strong>, Co-Founder & CTO at Frak Labs. 
                From Android roots to becoming a <strong>Solidity expert</strong> obsessed with gas optimization (ranking 2nd in a global gas golfing challenge).
                Tech enthusiast at heart, I explore the latest stacks to craft instant UX and seamless DevX (CI/CD, faster builds).
                I now build sovereign DevOps infrastructure and contribute to the open-source ecosystem (SST, eRPC, Ponder).
              </p>

              <div className="flex gap-4 pt-4">
                <SocialLink href="#" icon={<Github size={20} />} label="GitHub" />
                <SocialLink href="#" icon={<Twitter size={20} />} label="Twitter" />
                <SocialLink href="#" icon={<Linkedin size={20} />} label="LinkedIn" />
              </div>
            </div>

            {/* Stats / Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm md:mt-8">
              <h3 className="text-xs font-mono text-gray-500 uppercase mb-4">Current Focus</h3>
              <div className="space-y-4">
                <StatusItem icon={<Code2 size={18} />} label="Solidity" value="Golfing" color="text-orange-400" />
                <StatusItem icon={<Server size={18} />} label="DevOps" value="SST & eRPC" color="text-blue-400" />
                <StatusItem icon={<ShieldCheck size={18} />} label="ERC-4337" value="WebAuthn" color="text-green-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Bento Grid */}
        <section id="articles" className="mb-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Recent Logs</h2>
              <p className="text-gray-400 text-sm">Thoughts on engineering, hardware, and sovereignty.</p>
            </div>
            
            {/* Filter Tabs */}
            <div className="hidden md:flex bg-white/5 p-1 rounded-lg">
              {['all', 'devops', 'hardware', 'opinion'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    activeTab === tab 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Big Feature Card */}
            {filteredContent.length > 0 && (
              <div className="md:col-span-2 group relative bg-gradient-to-br from-orange-900/20 to-zinc-900 border border-white/10 rounded-3xl p-8 hover:border-orange-500/30 transition-all cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon name={filteredContent[0].icon} className="text-current" size={120} />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex gap-2 mb-4">
                    {filteredContent[0].tags.map(tag => (
                      <span key={tag} className="text-[10px] font-mono uppercase tracking-wider bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                      {filteredContent[0].title}
                    </h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                      {filteredContent[0].description}
                    </p>
                    <a href={`/articles/${filteredContent[0].slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-white">
                      Read Article <ArrowUpRight size={16} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary Cards */}
            <div className="space-y-6">
              {filteredContent.slice(1).map((article) => (
                <a href={`/articles/${article.slug}`} key={article.id} className="block group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 bg-black/30 rounded-lg border border-white/5 ${article.iconColor}`}>
                      <Icon name={article.icon} className="" size={24} />
                    </div>
                    <span className="text-xs font-mono text-gray-500">{article.readTime}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {article.title}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {article.subtitle}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack & Projects */}
        <section id="projects">
          <h2 className="text-2xl font-bold text-white mb-8">Selected Work</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project, i) => (
              <div key={i} className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-8 overflow-hidden hover:border-white/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{project.title}</h3>
                      <span className="text-sm text-blue-400 font-mono">{project.role}</span>
                    </div>
                    <a href={project.link} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <Github size={18} />
                    </a>
                  </div>
                  
                  <p className="text-gray-400 mb-6 text-sm">
                    {project.desc}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {project.tech.map(t => (
                      <span key={t} className="px-3 py-1 bg-black border border-white/10 rounded-full text-xs text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <Footer />

      </main>
    </div>
  );
};

// Helper Components
const SocialLink = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
  <a 
    href={href} 
    className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:-translate-y-1"
    aria-label={label}
  >
    {icon}
  </a>
);

const StatusItem = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-3 text-gray-300">
      <span className={`${color} opacity-80`}>{icon}</span>
      <span>{label}</span>
    </div>
    <span className="font-mono text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
      {value}
    </span>
  </div>
);

export default LandingPage;
