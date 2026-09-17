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
          // Diagram palettes mirror the design tokens in src/styles/global.css.
          // Mermaid needs literal values at build time, so these are the same
          // hexes the token variables resolve to. Keep them in sync by hand.
          dark: {
            theme: 'base',
            themeVariables: {
              darkMode: true,
              background: '#101418',
              mainBkg: '#191e24',
              secondBkg: '#1f252c',
              tertiaryBkg: '#262d35',

              primaryTextColor: '#eef1f4',
              secondaryTextColor: '#aeb7c0',
              tertiaryTextColor: '#9ba3ac',

              primaryBorderColor: '#3a434d',
              secondaryBorderColor: '#262d35',

              nodeBorder: '#3a434d',
              clusterBkg: '#151a20',
              clusterBorder: '#262d35',

              lineColor: '#5b656f',
              edgeLabelBackground: '#191e24',

              primaryColor: '#191e24',
              secondaryColor: '#1f252c',
              tertiaryColor: '#262d35',

              errorBkgColor: '#2c1a14',
              errorTextColor: '#ff6a3d',

              git0: '#ff6a3d',
              git1: '#aeb7c0',
              git2: '#9ba3ac',
              git3: '#3a434d',
              git4: '#ff6a3d',
              git5: '#aeb7c0',
              git6: '#9ba3ac',
              git7: '#3a434d',
            },
          },
          // Light mode config (default)
          mermaidConfig: {
            theme: 'base',
            themeVariables: {
              darkMode: false,
              background: 'transparent',
              mainBkg: '#ffffff',
              secondBkg: '#f5f6f7',
              tertiaryBkg: '#eceef0',

              primaryTextColor: '#101418',
              secondaryTextColor: '#414951',
              tertiaryTextColor: '#666e77',

              primaryBorderColor: '#b6bcc3',
              secondaryBorderColor: '#d5d9dd',

              nodeBorder: '#b6bcc3',
              clusterBkg: '#f5f6f7',
              clusterBorder: '#d5d9dd',

              lineColor: '#8a939c',
              edgeLabelBackground: '#ffffff',

              primaryColor: '#ffffff',
              secondaryColor: '#f5f6f7',
              tertiaryColor: '#eceef0',

              errorBkgColor: '#f6ded7',
              errorTextColor: '#d23c15',

              git0: '#d23c15',
              git1: '#414951',
              git2: '#666e77',
              git3: '#b6bcc3',
              git4: '#d23c15',
              git5: '#414951',
              git6: '#666e77',
              git7: '#b6bcc3',
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
    // Dual themes with no default colour: Shiki emits both values as CSS
    // variables and global.css picks the dark one under the .dark class.
    shikiConfig: {
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      defaultColor: false,
      wrap: false,
    },
  },
});
