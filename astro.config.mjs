// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import pagefind from "astro-pagefind";
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import { remarkModifiedTime } from './remark-modified-time.mjs';
import { remarkWordCount } from './remark-word-count.mjs';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';

// https://astro.build/config
export default defineConfig({
  site: 'https://nivelais.com',
  integrations: [mdx(), sitemap(), react(), pagefind()],
  redirects: {
    '/case-studies': '/projects',

    // 2026-09 taxonomy migration: article folders now match their `group`,
    // so /articles/<folder>/ hub pages always resolve. Old URLs kept alive here.
    // devops/ + mobile/ -> frak/
    '/articles/devops/bun-memory-leak-kubernetes-restart': '/articles/frak/bun-memory-leak-kubernetes-restart',
    '/articles/mobile/native-webauthn-tauri-plugin-ios-android': '/articles/frak/native-webauthn-tauri-plugin-ios-android',
    '/articles/mobile/tauri-native-sharing-rich-previews': '/articles/frak/tauri-native-sharing-rich-previews',
    '/articles/mobile/tauri-recovery-hint-uninstall-survival': '/articles/frak/tauri-recovery-hint-uninstall-survival',
    // opinion/ -> web3/
    '/articles/opinion/erc7579-uncomfortable-truth': '/articles/web3/erc7579-uncomfortable-truth',
    // side-projects/atelier-* -> atelier/
    '/articles/side-projects/atelier-kubernetes-migration': '/articles/atelier/atelier-kubernetes-migration',
    '/articles/side-projects/atelier-prebuilds': '/articles/atelier/atelier-prebuilds',
    '/articles/side-projects/atelier-slack-mcp': '/articles/atelier/atelier-slack-mcp',
    '/articles/side-projects/atelier-stop-babysitting': '/articles/atelier/atelier-stop-babysitting',
    '/articles/side-projects/atelier-supporting-infrastructure': '/articles/atelier/atelier-supporting-infrastructure',
    // Old folder segments that used to 404 outright
    '/articles/devops': '/articles/frak',
    '/articles/mobile': '/articles/frak',
    '/articles/opinion': '/articles/web3',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  experimental: {
    clientPrerender: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkModifiedTime, remarkWordCount],
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
    }),
    syntaxHighlight: {
      excludeLangs: ['mermaid'],
    },
  },
});
