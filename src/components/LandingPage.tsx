import React, { useState, useMemo } from 'react';
import { 
  Github, 
  Twitter,
  Linkedin,
} from 'lucide-react';
import Navigation from './Navigation';
import Footer from './Footer';
import ArticleGroups from './ArticleGroups';
import { links } from '../consts';

interface ArticleData {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  tags: string[];
  readTime: string;
  date: Date;
  icon: string;
  iconColor?: string;
  description: string;
  slug: string;
  githubUrl?: string;
  group?: string;
}

interface LandingPageProps {
  articles: ArticleData[];
}

const LandingPage: React.FC<LandingPageProps> = ({ articles }) => {
  // Show only the 5 most recent articles on landing page
  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [articles]);

  const projects = [
    {
      title: "Frak Labs",
      role: "Co-Founder & CTO",
      desc: "DeFi infrastructure & AMMs. Previously Polygon's top gas guzzler.",
      link: "https://frak.id/",
      tech: ["Solidity", "SST", "TypeScript"]
    },
    {
      title: "Gas Golfing",
      role: "Ranked #2 Global",
      desc: "Extreme EVM optimization contest. Assembly & memory management.",
      link: "https://x.com/QNivelais/status/1791490793913413832",
      tech: ["Yul", "Assembly", "EVM"]
    },
    {
      title: "ERC-4337 SDKs",
      role: "Contributor",
      desc: "Wallet and SDK improvements for ZeroDev & Pimlico. WebAuthn validator impl.",
      link: "#",
      tech: ["Cryptography", "AA", "Solidity"]
    },
    {
      title: "Open Source Infra",
      role: "Contributor",
      desc: "Contributors to eRPC (RPC Load Balancer), Ponder (Indexer), SST.",
      link: "#",
      tech: ["Go", "TypeScript", "Infra"]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 font-sans selection:bg-gray-200 dark:selection:bg-white/20">
      
      <Navigation />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="mb-24">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
            Quentin Nivelais
          </h1>
          
          <div className="prose dark:prose-invert prose-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            <p>
              CTO at Frak Labs. I build sovereign infrastructure and optimize EVM bytecode.
              My work focuses on the intersection of high-performance distributed systems and cryptography.
            </p>
            <p className="text-base">
              Currently obsessed with bare metal DevOps, gas golfing, and making the decentralized web actually usable.
            </p>
          </div>

          <div className="flex gap-6 text-sm font-mono">
            <a href="https://github.com/KONFeature" className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Github size={16} />
              <span>GitHub</span>
            </a>
            <a href="https://x.com/QNivelais" className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Twitter size={16} />
              <span>Twitter</span>
            </a>
            <a href="https://www.linkedin.com/in/quentin-nivelais-5081a4141/" className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Linkedin size={16} />
              <span>LinkedIn</span>
            </a>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-24">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-6 border-b border-gray-300 dark:border-white/10 pb-2">
            Tech Stack
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {/* IaC */}
            <div className="flex gap-2">
              <span className="text-gray-600 dark:text-gray-500 shrink-0 w-20">IaC:</span>
              <div className="flex flex-wrap gap-1.5">
                <a href={links.sst} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">SST</a>
                <span className="text-gray-600">+</span>
                <a href={links.pulumi} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Pulumi</a>
                <span className="text-gray-600">+</span>
                <span className="text-gray-900 dark:text-white">Kubernetes</span>
              </div>
            </div>

            {/* Backend */}
            <div className="flex gap-2">
              <span className="text-gray-600 dark:text-gray-500 shrink-0 w-20">Backend:</span>
              <div className="flex flex-wrap gap-1.5">
                <a href={links.bun} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Bun</a>
                <span className="text-gray-600">+</span>
                <a href={links.elysia} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Elysia.js</a>
              </div>
            </div>

            {/* Frontend */}
            <div className="flex gap-2">
              <span className="text-gray-600 dark:text-gray-500 shrink-0 w-20">Frontend:</span>
              <div className="flex flex-wrap gap-1.5">
                <a href={links.tanstack} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">TanStack</a>
                <span className="text-gray-600">+</span>
                <a href={links.rolldown} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Rolldown</a>
                <span className="text-gray-600">/</span>
                <a href={links.nitro} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Nitro</a>
              </div>
            </div>

            {/* Mobile */}
            <div className="flex gap-2">
              <span className="text-gray-600 dark:text-gray-500 shrink-0 w-20">Mobile:</span>
              <div className="flex flex-wrap gap-1.5">
                <a href={links.tauri} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Tauri</a>
                <span className="text-gray-600 text-xs">(React + Rust)</span>
              </div>
            </div>

            {/* Blockchain */}
            <div className="flex gap-2">
              <span className="text-gray-600 dark:text-gray-500 shrink-0 w-20">EVM:</span>
              <div className="flex flex-wrap gap-1.5">
                <a href={links.foundry} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Foundry</a>
                <span className="text-gray-600">+</span>
                <a href={links.viem} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Viem</a>
                <span className="text-gray-600">+</span>
                <a href={links.pounder} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Ponder</a>
                <span className="text-gray-600">+</span>
                <a href={links.erpc} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">eRPC</a>
              </div>
            </div>

            {/* Smart Wallet */}
            <div className="flex gap-2">
              <span className="text-gray-600 dark:text-gray-500 shrink-0 w-20">AA:</span>
              <div className="flex flex-wrap gap-1.5">
                <a href={links.kernel} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Kernel</a>
                <span className="text-gray-600">+</span>
                <a href={links.permissionless} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Permissionless</a>
                <span className="text-gray-600">+</span>
                <a href={links.pimlico} className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Pimlico</a>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Articles */}
        <section id="articles" className="mb-24">
          <div className="flex items-center justify-between mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500">
              Recent Articles
            </h2>
            <a 
              href="/articles" 
              className="font-mono text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              View all →
            </a>
          </div>

          <div className="space-y-8">
            {recentArticles.map((article) => (
              <a 
                key={article.id} 
                href={`/articles/${article.slug}`}
                className="group block"
              >
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8">
                  <time className="font-mono text-xs text-gray-500 shrink-0 w-24">
                    {new Date(article.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric',
                      day: 'numeric'
                    })}
                  </time>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xl line-clamp-2">
                      {article.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Article Groups */}
        <ArticleGroups articles={articles} compact={true} />

        {/* Projects */}
        <section id="projects">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
            Selected Works
          </h2>

          <div className="grid gap-8">
            {projects.map((project, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-gray-900 dark:text-white font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {project.title}
                  </h3>
                  <span className="text-xs font-mono text-gray-600">
                    {project.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3 max-w-2xl">
                  {project.desc}
                </p>
                <div className="flex gap-3">
                  {project.tech.map(t => (
                    <span key={t} className="text-xs font-mono text-gray-600">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Footer />

      </main>
    </div>
  );
};

export default LandingPage;
