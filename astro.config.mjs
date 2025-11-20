// @ts-check
import { defineConfig } from 'astro/config';
import pagefind from "astro-pagefind";
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';

// https://astro.build/config
export default defineConfig({
  site: 'https://nivelais.com',
  integrations: [mdx(), sitemap(), react(), tailwind(), pagefind()],
  markdown: {
    remarkPlugins: [remarkMath],
   rehypePlugins: [
      rehypeKatex,
      [
        rehypeMermaid,
        {
          strategy: 'img-svg',
          // Generate both light and dark versions
          dark: {
            theme: 'dark',
            themeVariables: {
              darkMode: true,
              background: '#0a0a0a',
              mainBkg: '#1a1a1a',
              secondBkg: '#262626',
              tertiaryBkg: '#333333',
              
              primaryTextColor: '#e5e5e5',
              secondaryTextColor: '#a3a3a3',
              tertiaryTextColor: '#737373',
              
              primaryBorderColor: 'rgba(255, 255, 255, 0.2)',
              secondaryBorderColor: 'rgba(255, 255, 255, 0.1)',
              
              nodeBorder: 'rgba(255, 255, 255, 0.2)',
              clusterBkg: '#1a1a1a',
              clusterBorder: 'rgba(255, 255, 255, 0.1)',
              
              lineColor: 'rgba(255, 255, 255, 0.3)',
              edgeLabelBackground: '#1a1a1a',
              
              primaryColor: '#3b82f6',
              secondaryColor: '#8b5cf6',
              tertiaryColor: '#10b981',
              
              errorBkgColor: '#dc2626',
              errorTextColor: '#ffffff',
              
              git0: '#3b82f6',
              git1: '#8b5cf6',
              git2: '#10b981',
              git3: '#f59e0b',
              git4: '#ef4444',
              git5: '#ec4899',
              git6: '#14b8a6',
              git7: '#f97316',
            },
          },
          // Light mode config (default)
          mermaidConfig: {
            theme: 'base',
            themeVariables: {
              darkMode: false,
              background: 'transparent',
              mainBkg: '#ffffff',
              secondBkg: '#f5f5f5',
              tertiaryBkg: '#e5e5e5',
              
              primaryTextColor: '#171717',
              secondaryTextColor: '#525252',
              tertiaryTextColor: '#737373',
              
              primaryBorderColor: '#a3a3a3',
              secondaryBorderColor: '#d4d4d4',
              
              nodeBorder: '#a3a3a3',
              clusterBkg: '#ffffff',
              clusterBorder: '#d4d4d4',
              
              lineColor: '#737373',
              edgeLabelBackground: '#ffffff',
              
              primaryColor: '#3b82f6',
              secondaryColor: '#8b5cf6',
              tertiaryColor: '#10b981',
              
              errorBkgColor: '#dc2626',
              errorTextColor: '#ffffff',
              
              git0: '#3b82f6',
              git1: '#8b5cf6',
              git2: '#10b981',
              git3: '#f59e0b',
              git4: '#ef4444',
              git5: '#ec4899',
              git6: '#14b8a6',
              git7: '#f97316',
            },
            flowchart: {
              curve: 'basis',
              padding: 20,
            },
            sequence: {
              actorMargin: 50,
              boxMargin: 10,
              boxTextMargin: 5,
              noteMargin: 10,
              messageMargin: 35,
            },
          },
        },
      ],
    ],
    syntaxHighlight: {
      excludeLangs: ['mermaid'],
    },
  },
});
