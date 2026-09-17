import React, { useMemo } from 'react';
import { GithubIcon, XIcon, LinkedinIcon } from './BrandIcons';
import Navigation from './Navigation';
import Footer from './Footer';
import {
  links,
  CALENDLY_URL,
  TELEGRAM_URL,
  LINKEDIN_URL,
  GITHUB_HANDLE,
  TWITTER_HANDLE,
  HERO_HEADLINE,
  HERO_SUBTEXT,
  CONTACT_LABEL,
} from '../consts';
import { HIGHLIGHTS } from '../data/highlights';
import { CONTRIBUTIONS } from '../data/contributions';

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

/** Trimmed shape of the `projects` collection, built in src/pages/index.astro. */
interface ProjectSummary {
  slug: string;
  name: string;
  tagline: string;
  role: string;
  status: string;
  period: string;
  tech: string[];
  metrics: { label: string; value: string }[];
}

interface LandingPageProps {
  articles: ArticleData[];
  projects: ProjectSummary[];
}

const X_URL = `https://x.com/${TWITTER_HANDLE.replace('@', '')}`;

/** Range is the positioning, so the stack is listed by substrate, not by hype. */
const STACK: { label: string; entries: { name: string; href?: string }[]; note?: string }[] = [
  {
    label: 'IaC',
    entries: [{ name: 'SST', href: links.sst }, { name: 'Pulumi', href: links.pulumi }, { name: 'Kubernetes' }],
  },
  {
    label: 'Backend',
    entries: [{ name: 'Bun', href: links.bun }, { name: 'Elysia', href: links.elysia }],
  },
  {
    label: 'Frontend',
    entries: [{ name: 'TanStack', href: links.tanstack }, { name: 'Nitro', href: links.nitro }],
  },
  {
    label: 'EVM',
    entries: [
      { name: 'Foundry', href: links.foundry },
      { name: 'Viem', href: links.viem },
      { name: 'Ponder', href: links.pounder },
    ],
  },
  {
    label: 'AA',
    entries: [
      { name: 'Kernel', href: links.kernel },
      { name: 'Permissionless', href: links.permissionless },
      { name: 'Pimlico', href: links.pimlico },
    ],
  },
  {
    label: 'Mobile',
    entries: [{ name: 'Tauri', href: links.tauri }],
    note: '(React and Rust)',
  },
];

const isExternal = (href: string) => href.startsWith('http');

/** The accent means "this was measured". The hero readout already spends it, so every
 * metric in the Work section below is set in font-mono ink instead: the readout stays
 * the only accented block on the page. */
const isMeasured = (value: string) => /\d/.test(value);

/**
 * A value only belongs in this grid if it reads as a measurement at a glance.
 * Frontmatter also carries qualitative entries such as "Content, media, Gutenberg,
 * WooCommerce", which set at text-xl in mono overwhelm the record they describe.
 * Those stay on the project page, where there is room to read them.
 */
const MAX_METRIC_CHARS = 22;

const isGlanceable = (value: string) => isMeasured(value) && value.length <= MAX_METRIC_CHARS;

/** Up to two metrics per project, measurements only. */
function pickMetrics(metrics: { label: string; value: string }[]) {
  return metrics.filter((metric) => isGlanceable(metric.value)).slice(0, 2);
}

const LandingPage: React.FC<LandingPageProps> = ({ articles, projects }) => {
  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [articles]);

  return (
    <div className="min-h-screen bg-paper font-sans text-ink-2">
      <Navigation />

      <main id="main" className="max-w-page mx-auto px-6 pt-28 pb-20">
        {/* Hero: asymmetric 7/5 split at md, stacked single column below. */}
        <section className="grid gap-12 md:grid-cols-12 md:gap-x-16">
          {/*
            The name is not repeated here: the navigation wordmark already
            carries it, and two identical names 100px apart read as a bug.
            The headline is the positioning, the readout beside it is the proof.
          */}
          <div className="md:col-span-7">
            {/*
              The one display moment on the site. Page h1s are text-3xl md:text-4xl;
              this is deliberately a step larger, and the headline is kept under 40
              characters so it still holds two lines at 60px in this column.
            */}
            <h1 className="text-4xl md:text-5xl font-semibold text-ink">
              {HERO_HEADLINE}
            </h1>

            <p className="mt-5 text-md text-ink-2 max-w-[46ch]">{HERO_SUBTEXT}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/articles/" className="btn btn-primary">
                Read the writing
              </a>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                {CONTACT_LABEL}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a
                href={`https://github.com/${GITHUB_HANDLE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-quiet inline-flex items-center gap-2"
              >
                <GithubIcon size={16} />
                GitHub
              </a>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="link-quiet inline-flex items-center gap-2"
              >
                <XIcon size={16} />
                X
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="link-quiet inline-flex items-center gap-2"
              >
                <LinkedinIcon size={16} />
                LinkedIn
              </a>
            </div>
          </div>

          {/* The readout: the one measured block, and the one animated one. */}
          <div className="md:col-span-5 md:border-l md:border-rule md:pl-8">
            <div className="divide-y divide-rule border-t border-rule md:border-t-0">
              {HIGHLIGHTS.map((highlight, i) => (
                <a
                  key={highlight.href}
                  href={highlight.href}
                  target={isExternal(highlight.href) ? '_blank' : undefined}
                  rel={isExternal(highlight.href) ? 'noopener noreferrer' : undefined}
                  className="reveal group block py-4 md:first:pt-0"
                  style={{ '--reveal-index': i } as React.CSSProperties}
                >
                  <span className="metric-value block text-2xl">{highlight.value}</span>
                  <span className="mt-1 block text-sm text-ink-2 underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-rule-strong">
                    {highlight.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-3">{highlight.source}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Writing: dated list, date column above the title below md. */}
        <section id="articles" className="mt-24">
          <div className="flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="text-xl font-semibold text-ink">Writing</h2>
            <a href="/articles/" className="link-quiet text-sm">
              View all
            </a>
          </div>

          <ul className="divide-y divide-rule">
            {recentArticles.map((article) => (
              <li key={article.id}>
                <a href={`/articles/${article.slug}/`} className="group block py-5">
                  <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-8">
                    <time
                      dateTime={new Date(article.date).toISOString()}
                      className="shrink-0 font-mono text-xs text-ink-3 md:w-24"
                    >
                      {new Date(article.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </time>
                    <div className="min-w-0">
                      <h3 className="text-lg text-ink underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-rule-strong">
                        {article.title}
                      </h3>
                      <p className="mt-1 max-w-[62ch] text-sm text-ink-2 line-clamp-2">
                        {article.description}
                      </p>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Work: a grid of records, two up at md, distinct from the Writing row list above it. */}
        <section id="work" className="mt-24">
          <div className="flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="text-xl font-semibold text-ink">Work</h2>
            <a href="/projects/" className="link-quiet text-sm">
              All projects
            </a>
          </div>

          <ul className="grid gap-x-10 gap-y-10 pt-8 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.slug} className="border-t border-rule pt-5">
                <a href={`/projects/${project.slug}/`} className="group block">
                  <h3 className="text-lg text-ink underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-rule-strong">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-3">
                    {project.role}<span className="font-mono">, {project.period}</span>
                  </p>

                  {project.metrics.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                      {pickMetrics(project.metrics).map((metric) => (
                        <div key={metric.label}>
                          <p className="font-mono text-xl text-ink">{metric.value}</p>
                          <p className="text-xs text-ink-3">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 max-w-[42ch] text-sm text-ink-2">{project.tagline}</p>

                  {project.tech.length > 0 && (
                    <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-ink-3">
                      {project.tech.map((tech) => (
                        <span key={tech} className="font-mono">{tech}</span>
                      ))}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Stack: definition list, two columns at md, one below. */}
        <section className="mt-24">
          <h2 className="border-b border-rule pb-3 text-xl font-semibold text-ink">
            What I work with
          </h2>

          <dl className="mt-6 grid gap-x-12 gap-y-4 md:grid-cols-2">
            {STACK.map((row) => (
              <div key={row.label} className="flex gap-4 text-sm">
                <dt className="w-16 shrink-0 pt-px text-xs text-ink-3">{row.label}</dt>
                <dd className="text-ink-2">
                  {row.entries.map((entry, i) => (
                    <React.Fragment key={entry.name}>
                      {i > 0 && <span className="text-ink-3"> + </span>}
                      {entry.href ? (
                        <a
                          href={entry.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link"
                        >
                          {entry.name}
                        </a>
                      ) : (
                        <span className="text-ink">{entry.name}</span>
                      )}
                    </React.Fragment>
                  ))}
                  {row.note && <span className="text-xs text-ink-3"> {row.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Upstream: inline cluster of links, one row per project, stacked below md. */}
        <section className="mt-24">
          <h2 className="border-b border-rule pb-3 text-xl font-semibold text-ink">
            Upstream work
          </h2>

          <div className="mt-6 space-y-5">
            {CONTRIBUTIONS.map((contribution) => (
              <div
                key={contribution.project}
                className="flex flex-col gap-x-6 gap-y-1 md:flex-row md:items-baseline"
              >
                <p className="shrink-0 md:w-52">
                  <a
                    href={contribution.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 hover:decoration-rule-strong"
                  >
                    {contribution.project}
                  </a>
                  <span className="ml-2 text-xs text-ink-3">{contribution.context}</span>
                </p>
                {/* Hairline separators only once the row stops wrapping, at md. */}
                <p className="flex flex-wrap items-center gap-x-4 text-sm md:gap-x-3">
                  {contribution.items.map((item, i) => (
                    <React.Fragment key={item.url}>
                      {i > 0 && (
                        <span aria-hidden="true" className="hidden h-3 w-px bg-rule md:block" />
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link"
                      >
                        {item.label}
                      </a>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The one centred block on the site. */}
        <section className="mt-24 border-t border-rule pt-12 text-center">
          <h2 className="text-xl font-semibold text-ink">{CONTACT_LABEL}</h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-sm text-ink-2">
            Thirty minutes to talk through a smart wallet, a cluster, a firmware bug, or
            whatever the system in front of you is doing.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              {CONTACT_LABEL}
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Telegram
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
