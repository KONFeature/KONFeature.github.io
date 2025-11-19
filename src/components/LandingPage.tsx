import React from 'react';
import { 
  Github, 
  Twitter,
  Linkedin,
} from 'lucide-react';
import Navigation from './Navigation';
import Footer from './Footer';

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
  featured: boolean;
  description: string;
  slug: string;
}

interface LandingPageProps {
  articles: ArticleData[];
}

const LandingPage: React.FC<LandingPageProps> = ({ articles }) => {
  const projects = [
    {
      title: "Frak Labs",
      role: "Co-Founder & CTO",
      desc: "DeFi infrastructure & AMMs. Previously Polygon's top gas guzzler.",
      link: "#",
      tech: ["Solidity", "SST", "TypeScript"]
    },
    {
      title: "Gas Golfing",
      role: "Ranked #2 Global",
      desc: "Extreme EVM optimization contest. Assembly & memory management.",
      link: "#",
      tech: ["Yul", "Assembly", "EVM"]
    },
    {
      title: "Open Source Infra",
      role: "Contributor",
      desc: "Core contributions to eRPC (Load Balancer), Ponder (Indexer), and SST.",
      link: "#",
      tech: ["Go", "TypeScript", "Infra"]
    },
    {
      title: "ERC-4337 SDKs",
      role: "Contributor",
      desc: "SDK improvements for ZeroDev & Pimlico. WebAuthn validator impl.",
      link: "#",
      tech: ["Cryptography", "AA"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans selection:bg-white/20">
      
      <Navigation />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="mb-24">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
            Quentin Nivelais
          </h1>
          
          <div className="prose prose-invert prose-lg text-gray-400 leading-relaxed mb-8">
            <p>
              CTO at Frak Labs. I build sovereign infrastructure and optimize EVM bytecode.
              My work focuses on the intersection of high-performance distributed systems and cryptography.
            </p>
            <p className="text-base">
              Currently obsessed with bare metal DevOps, gas golfing, and making the decentralized web actually usable.
            </p>
          </div>

          <div className="flex gap-6 text-sm font-mono">
            <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
              <Github size={16} />
              <span>GitHub</span>
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
              <Twitter size={16} />
              <span>Twitter</span>
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
              <Linkedin size={16} />
              <span>LinkedIn</span>
            </a>
          </div>
        </section>

        {/* Articles / Logs */}
        <section id="articles" className="mb-24">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-8 border-b border-white/10 pb-2">
            Engineering Logs
          </h2>

          <div className="space-y-8">
            {articles.map((article) => (
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
                  <div>
                    <h3 className="text-lg font-medium text-white group-hover:text-green-400 transition-colors mb-1">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xl">
                      {article.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section id="projects">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-8 border-b border-white/10 pb-2">
            Selected Works
          </h2>

          <div className="grid gap-8">
            {projects.map((project, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-white font-medium group-hover:text-green-400 transition-colors">
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
