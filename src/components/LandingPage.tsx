import React, { useMemo } from 'react';
import { 
  Github, 
  Twitter,
  Linkedin,
  Search,
  Users,
  Rocket,
  ArrowRight,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import Navigation from './Navigation';
import Footer from './Footer';
import { links, CALENDLY_URL, TELEGRAM_URL, TAGLINE } from '../consts';

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
  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [articles]);

  const trackRecord = [
    {
      title: "Frak Labs",
      role: "Co-Founder & CTO",
      outcome: "Built WebAuthn smart wallet processing 100k+ daily loads. Cut infra costs from $200k/year to $200/month.",
      link: "https://frak.id/",
      tech: ["Account Abstraction", "Kubernetes", "Smart Contracts"]
    },
    {
      title: "Account Abstraction",
      role: "Production Expert",
      outcome: "Production WebAuthn validator, Smart Sessions, ERC-7579 modules. Contributed to ZeroDev & Pimlico SDKs.",
      link: "/articles/frak/4337-webauthn",
      tech: ["ERC-4337", "ERC-7579", "WebAuthn"]
    },
    {
      title: "Infrastructure",
      role: "Cost Optimization",
      outcome: "Multi-cloud K8s without YAML. Contributors to eRPC, Ponder, SST. AWS to self-hosted migrations.",
      link: "/articles/frak/cost-effective-infra",
      tech: ["Pulumi", "Kubernetes", "eRPC"]
    },
    {
      title: "Gas Golfing",
      role: "Ranked #2 Global",
      outcome: "Extreme EVM optimization contest. Deep assembly & memory management expertise.",
      link: "https://x.com/QNivelais/status/1791490793913413832",
      tech: ["Yul", "Assembly", "EVM"]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 font-sans selection:bg-gray-200 dark:selection:bg-white/20">
      
      <Navigation />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="mb-20">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
            Quentin Nivelais
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium mb-6">
            Web3 Infrastructure Architect<span className="text-gray-400 dark:text-gray-600 mx-2">&</span>Account Abstraction Specialist
          </p>

          <div className="mb-8 py-3 border-y border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] -mx-6 px-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-mono text-gray-500 dark:text-gray-400">
            <a href="https://frak.id" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-400 dark:text-gray-500">FOCUS:</span>
              <span className="text-gray-900 dark:text-white">Frak Labs</span>
            </a>
            <div className="hidden md:block w-px h-4 bg-gray-300 dark:bg-white/10" />
            <a href="https://x.com/QNivelais/status/1791490793913413832" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors">
              <span className="text-gray-400 dark:text-gray-500">RANK:</span>
              <span className="text-yellow-600 dark:text-yellow-500">#2 Global Gas Golfing</span>
            </a>
            <div className="hidden md:block w-px h-4 bg-gray-300 dark:bg-white/10" />
            <a href="/articles/frak/cost-effective-infra" className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors">
              <span className="text-gray-400 dark:text-gray-500">INFRA:</span>
              <span className="text-emerald-600 dark:text-emerald-500">-85% Cost</span>
            </a>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4 max-w-xl">
            {TAGLINE}
          </p>
          
          <p className="text-sm text-gray-500 mb-6">
            Currently CTO at <a href="https://frak.id" className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">Frak Labs</a>.
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <a 
              href="/services" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              View Services
              <ArrowRight size={16} />
            </a>
            <a 
              href="#articles" 
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Read Articles
            </a>
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

        {/* Services */}
        <section className="mb-24">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-6 border-b border-gray-300 dark:border-white/10 pb-2">
            Services
          </h2>
          
          <div className="grid gap-6">
            <a href="/services#audit" className="group block p-5 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 shrink-0">
                  <Search size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
                    Technical Audit
                  </h3>
                  <p className="text-sm text-gray-500">
                    Infrastructure review, gas optimization, cost analysis. Find what's broken before your users do.
                  </p>
                </div>
              </div>
            </a>

            <a href="/services#fractional" className="group block p-5 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 shrink-0">
                  <Users size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
                    Fractional CTO
                  </h3>
                  <p className="text-sm text-gray-500">
                    Ongoing technical leadership without the full-time overhead. Strategy, architecture, and mentorship.
                  </p>
                </div>
              </div>
            </a>

            <a href="/services#project" className="group block p-5 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 shrink-0">
                  <Rocket size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
                    Project-Based
                  </h3>
                  <p className="text-sm text-gray-500">
                    Account Abstraction, infrastructure migration, SDK development. End-to-end delivery.
                  </p>
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* Selected Work */}
        <section id="track-record" className="mb-24">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
            Selected Work
          </h2>

          <div className="grid gap-8">
            {trackRecord.map((item, i) => (
              <a key={i} href={item.link} className="group block">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-gray-900 dark:text-white font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {item.title}
                  </h3>
                  <span className="text-xs font-mono text-gray-600">
                    {item.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3 max-w-2xl">
                  {item.outcome}
                </p>
                <div className="flex flex-wrap gap-3">
                  {item.tech.map(t => (
                    <span key={t} className="text-xs font-mono text-gray-600">
                      #{t}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Latest Articles */}
        <section id="articles" className="mb-24">
          <div className="flex items-center justify-between mb-8 border-b border-gray-300 dark:border-white/10 pb-2">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500">
              Latest Articles
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

        {/* Engineering Impact */}
        <section className="mb-24">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-6 border-b border-gray-300 dark:border-white/10 pb-2">
            Engineering Impact
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">IaC:</span>
              <span className="text-gray-900 dark:text-white">
                <a href={links.sst} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">SST</a> + <a href={links.pulumi} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Pulumi</a> + K8s
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">Backend:</span>
              <span className="text-gray-900 dark:text-white">
                <a href={links.bun} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Bun</a> + <a href={links.elysia} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Elysia</a>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">Frontend:</span>
              <span className="text-gray-900 dark:text-white">
                <a href={links.tanstack} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">TanStack</a> + <a href={links.nitro} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Nitro</a>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">EVM:</span>
              <span className="text-gray-900 dark:text-white">
                <a href={links.foundry} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Foundry</a> + <a href={links.viem} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Viem</a> + <a href={links.pounder} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Ponder</a>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">AA:</span>
              <span className="text-gray-900 dark:text-white">
                <a href={links.kernel} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Kernel</a> + <a href={links.permissionless} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Permissionless</a> + <a href={links.pimlico} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Pimlico</a>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">Mobile:</span>
              <span className="text-gray-900 dark:text-white">
                <a href={links.tauri} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Tauri</a> <span className="text-gray-500 text-xs">(React + Rust)</span>
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            I don't just use the tools—I write the code for the tools you use.
          </p>
          
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <a href={links.kernel} className="text-gray-900 dark:text-white font-medium hover:text-green-600 dark:hover:text-green-400 transition-colors">ZeroDev Kernel</a>
                <span className="text-xs text-gray-500">Account Abstraction</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a href="https://github.com/zerodevapp/kernel/pull/68" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  WebAuthn validator
                </a>
                <span className="text-gray-400">·</span>
                <a href="https://github.com/zerodevapp/kernel/pull/55" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  EIP-712 typed data
                </a>
                <span className="text-gray-400">·</span>
                <a href="https://github.com/zerodevapp/kernel/pull/50" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Gas optimizations
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <a href={links.erpc} className="text-gray-900 dark:text-white font-medium hover:text-green-600 dark:hover:text-green-400 transition-colors">eRPC</a>
                <span className="text-xs text-gray-500">RPC Load Balancer</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a href="https://github.com/erpc/erpc/pull/123" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  JS/TS config
                </a>
                <span className="text-gray-400">·</span>
                <a href="https://github.com/erpc/erpc/pull/143" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  CLI tooling
                </a>
                <span className="text-gray-400">·</span>
                <a href="https://github.com/erpc/erpc/pull/139" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Config validation
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <a href={links.permissionless} className="text-gray-900 dark:text-white font-medium hover:text-green-600 dark:hover:text-green-400 transition-colors">Permissionless.js</a>
                <span className="text-xs text-gray-500">Pimlico SDK</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a href="https://github.com/pimlicolabs/permissionless.js/pull/42" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Kernel wallet support
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-900 dark:text-white font-medium">Other</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a href="https://github.com/sst/sst/pull/5268" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  SST
                </a>
                <span className="text-gray-400">·</span>
                <a href="https://github.com/elizaOS/eliza/pull/1810" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Eliza
                </a>
                <span className="text-gray-400">·</span>
                <a href="https://github.com/jk-labs-inc/jokerace/issues/1170" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Jokerace
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24 py-12 border-t border-gray-200 dark:border-white/10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Let's Build Something
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Need help with Web3 infrastructure or Account Abstraction? Let's talk.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              <Calendar size={18} />
              Book a call
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <MessageCircle size={18} />
              Telegram
            </a>
          </div>
        </section>

        <Footer />

      </main>
    </div>
  );
};

export default LandingPage;
