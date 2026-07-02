---
name: "WordForge"
tagline: "An open-source MCP server that lets WordPress be managed through AI conversation instead of admin-panel clicking."
description: "When my girlfriend needed an online pottery shop, I refused Shopify's centralized, fee-heavy model. Built on a 3€/month Hetzner VPS with WordPress and WooCommerce, then extended with WordForge, a comprehensive MCP server so the store can be managed through Claude conversations instead of admin menus."
status: "personal"
role: "Creator"
period: "Dec 2025"
order: 6
icon: "hammer"
iconColor: "text-cyan-400"
tech: ["PHP", "WordPress", "WooCommerce", "MCP", "Model Context Protocol", "Hetzner"]
metrics:
  - label: "Hosting Cost"
    value: "3€/month"
  - label: "Coverage"
    value: "Content, media, Gutenberg, WooCommerce"
links:
  - label: "GitHub"
    url: "https://github.com/KONFeature/wordforge"
  - label: "Live site"
    url: "https://emmaye.fr"
articleIds: ["side-projects/wordforge"]
featured: false
draft: false
---

My girlfriend started a pottery business and needed an online shop. Rather than lock her into Shopify's subscription and transaction fees, I set her up on a 3€/month Hetzner VPS running WordPress and WooCommerce, giving her real, self-hosted control over her own store.

The gap was tooling: I live in AI-assisted development, but none of my usual tools spoke WordPress. WordPress's own team had shipped the building blocks, an Abilities API and an MCP Adapter bridging it to the Model Context Protocol, but no one had implemented the actual abilities for real-world site management.

So I built WordForge, an open-source MCP server extending WordPress's own adapter with abilities for content (posts, pages, custom post types), the media library, Gutenberg block editing, Full Site Editing theme styles, and full WooCommerce product management, auto-detected only when WooCommerce is active.

The result: she manages her shop through plain-language requests to Claude, "add a product called Bol Rustique at 35€, 3 in stock", while the WordPress admin panel stays available whenever she wants direct control. I open-sourced it because the gap surprised me: WordPress had the foundation for AI-native management, and nobody had filled it in yet.

**My role:** sole creator, from infrastructure setup to the plugin architecture and every registered ability.
