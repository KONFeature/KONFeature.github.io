import React from 'react';
import { 
  Wallet, 
  Cloud, 
  Zap, 
  Github, 
  ArrowRight, 
  Calendar,
  ChefHat
} from 'lucide-react';
import Navigation from './Navigation';
import Footer from './Footer';
import { CALENDLY_URL, TELEGRAM_URL } from '../consts';

interface Metric {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  metrics: Metric[];
  tech: string[];
  serviceType: 'Project-Based' | 'Fractional CTO' | 'Technical Audit';
  relatedArticles: {
    title: string;
    url: string;
  }[];
}

const caseStudies: CaseStudy[] = [
  {
    id: 'frak-wallet',
    title: 'Frak Wallet',
    subtitle: 'From YouTube MVP to Production WebAuthn Wallet',
    description: 'Pioneered one of the first production-ready Account Abstraction wallets using WebAuthn. Eliminated seed phrases completely while maintaining non-custodial security through P256 verification and RIP-7212.',
    icon: Wallet,
    serviceType: 'Project-Based',
    metrics: [
      { label: 'Daily Loads', value: '100k+' },
      { label: 'Security', value: 'Biometric' },
      { label: 'UX', value: 'Seedless' }
    ],
    tech: ['ERC-4337', 'WebAuthn', 'P256', 'RIP-7212'],
    relatedArticles: [
      { title: 'WebAuthn Integration Deep Dive', url: '/articles/frak/4337-webauthn' },
      { title: 'Wallet Architecture Release', url: '/articles/frak/webauthn-release' }
    ]
  },
  {
    id: 'cmi-cooking-bot',
    title: 'Elle À Table Cooking Bot',
    subtitle: 'AI-Powered Culinary Assistant for CMI Group',
    description: 'Built a safety-first AI cooking assistant processing 35,000+ French recipes for Elle magazine. Deterministic allergen detection, dual-vector semantic search, voice-guided cooking mode, and real-time conversational AI to drive traffic and ad revenue.',
    icon: ChefHat,
    serviceType: 'Project-Based',
    metrics: [
      { label: 'Recipes', value: '35,000+' },
      { label: 'Allergen Safety', value: '100%' },
      { label: 'Parse Accuracy', value: '99.9%' }
    ],
    tech: ['Gemini AI', 'spaCy NLP', 'Qdrant', 'Voice TTS'],
    relatedArticles: [
      { title: 'Safety-First AI Architecture', url: '/articles/cooking-bot/introduction' },
      { title: 'Recipe Processing Pipeline', url: '/articles/cooking-bot/ingestion' },
      { title: 'Real-Time Voice Conversations', url: '/articles/cooking-bot/runtime' }
    ]
  },
  {
    id: 'infra-mastery',
    title: 'Infrastructure Evolution',
    subtitle: 'The 4-Year Journey: AWS Serverless → SST → Kubernetes',
    description: 'A complete infrastructure transformation journey. Started with managed serverless, evolved through SST, and landed on highly optimized self-hosted Kubernetes, reducing costs by 99.9% while improving reliability.',
    icon: Cloud,
    serviceType: 'Fractional CTO',
    metrics: [
      { label: 'Cost Reduction', value: '-85%' },
      { label: 'Uptime', value: '99.99%' },
      { label: 'Monthly Bill', value: '$200' }
    ],
    tech: ['SST', 'Pulumi', 'Kubernetes', 'eRPC', 'Hetzner'],
    relatedArticles: [
      { title: 'Infrastructure IaC', url: '/articles/frak/frak-infrastructure-iac' },
      { title: 'Cost Effective Architecture', url: '/articles/frak/cost-effective-infra' }
    ]
  },
  {
    id: 'devx-revolution',
    title: 'Developer Experience',
    subtitle: '10x Build Speed, 4-Minute Deployments',
    description: 'Overhauled the entire development lifecycle. Migrated to modern tooling (Rolldown, TanStack Start) and optimized CI/CD pipelines to enable rapid iteration without context switching.',
    icon: Zap,
    serviceType: 'Technical Audit',
    metrics: [
      { label: 'Build Speed', value: '10x Faster' },
      { label: 'Test Suite', value: '42sec' },
      { label: 'Bundle Size', value: '-30%' }
    ],
    tech: ['Rolldown', 'TanStack Start', 'Vitest', 'Nginx'],
    relatedArticles: [
      { title: 'Wallet DevX Revolution', url: '/articles/frak/wallet-devx-revolution' },
      { title: 'Frontend Optimization', url: '/articles/frak/frak-frontend-optimization' }
    ]
  },
  {
    id: 'open-source',
    title: 'Open Source Leadership',
    subtitle: 'Contributing to the Tools We Use',
    description: 'Active contributor to the Web3 and infrastructure ecosystem. Improved WebAuthn validators for ZeroDev Kernel, added JS config support to eRPC, and enhanced SST framework capabilities.',
    icon: Github,
    serviceType: 'Technical Audit',
    metrics: [
      { label: 'ZeroDev', value: 'Contributor' },
      { label: 'eRPC', value: 'Contributor' },
      { label: 'SST', value: 'Contributor' }
    ],
    tech: ['TypeScript', 'Rust', 'Go', 'Solidity'],
    relatedArticles: []
  }
];

const CaseStudiesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 font-sans selection:bg-gray-200 dark:selection:bg-white/20">
      <Navigation />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <section className="mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
            Case Studies
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
            Real-world problems, engineered solutions, and measurable results. 
            A deep dive into how I build scalable systems and solving complex technical challenges.
          </p>
        </section>

        <section className="space-y-12 mb-20">
          {caseStudies.map((study) => {
            const Icon = study.icon;
            return (
              <div 
                key={study.id}
                className="border border-gray-200 dark:border-white/10 rounded-lg p-6 md:p-8 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 shrink-0">
                      <Icon size={24} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {study.title}
                      </h2>
                      <p className="text-gray-500 text-sm">
                        {study.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 whitespace-nowrap md:ml-auto">
                    {study.serviceType}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] rounded-lg">
                  {study.metrics.map((metric, idx) => (
                    <div key={idx} className="text-center px-2">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{metric.label}</div>
                      <div className="text-sm md:text-base font-bold text-green-600 dark:text-green-400">{metric.value}</div>
                    </div>
                  ))}
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {study.description}
                </p>

                <div className="mb-6 flex flex-wrap gap-2">
                  {study.tech.map((t) => (
                    <span 
                      key={t}
                      className="px-2 py-1 text-xs font-mono rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {study.relatedArticles.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">
                      Read the details
                    </h3>
                    <div className="space-y-2">
                      {study.relatedArticles.map((article, idx) => (
                        <a 
                          key={idx}
                          href={article.url}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors group"
                        >
                          <ArrowRight size={16} className="text-gray-400 group-hover:text-green-500 transition-colors" />
                          {article.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="text-center py-12 border-t border-gray-200 dark:border-white/10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Want Similar Results?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Whether you need a technical audit, a fractional CTO, or a specific project delivered.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              <Zap size={18} />
              View Services
            </a>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Calendar size={18} />
              Book a call
            </a>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
};

export default CaseStudiesPage;
