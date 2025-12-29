---
title: "WordForge: AI-Powered WordPress Management via MCP"
date: 2025-12-29T12:00:00Z
draft: false
subtitle: "Building an open-source MCP server because Shopify fees felt wrong and no free alternatives existed."
category: "tooling"
tags: ["WordPress", "MCP", "AI", "WooCommerce", "Self-Hosting", "Open Source"]
icon: "hammer"
iconColor: "text-cyan-400"
description: "When my girlfriend needed an online pottery shop, I refused Shopify's centralized model. A Hetzner VPS, WordPress, and a custom MCP server later — she now manages her store through Claude conversations."
githubUrl: "https://github.com/KONFeature/wordforge"
group: "side-projects"
---

My girlfriend started doing pottery. Beautiful handcrafted pieces that deserved an online presence. The obvious solution? Shopify. The *actual* solution? A 3€/month VPS, WordPress, and building my own AI integration because apparently nobody had done it properly yet.

---

## The Problem: Shopify Isn't For Me

Don't get me wrong — Shopify is excellent for what it does. But it represents everything I try to avoid:

- **Centralized control**: Your shop lives on their infrastructure, their rules
- **Lock-in**: Moving away means rebuilding everything
- **Fees**: Transaction fees on top of subscription fees add up fast
- **No real control**: Want to customize something deeply? Good luck.

For a small pottery business, these tradeoffs didn't make sense. I'd rather invest time upfront for long-term freedom.

---

## The Setup: Hetzner + WordPress

The alternative was straightforward:

**Infrastructure**: A [Hetzner](https://www.hetzner.com/) VPS for 3€/month. More powerful than most managed cloud instances, with full SSH access. Later I'll spawn a second one as backup.

**Platform**: WordPress with WooCommerce. Battle-tested, extensible, and my girlfriend can manage it herself through the admin panel. She wanted full control, not to depend on me for every change.

**The catch**: Manual configuration. No managed services means setting up everything yourself — SSL, backups, security, updates. Worth it for the control, but it adds friction.

The real friction, though, came from an unexpected place: I couldn't use my AI dev tools with WordPress.

---

## The Frustration: AI Tools Don't Speak WordPress

I live in AI-assisted development. Claude, OpenCode, cursor — they're part of my daily workflow. But when it came to helping my girlfriend update her WordPress site, I was stuck in the admin panel clicking through menus like it's 2010.

I could have built a custom theme with code she'd never touch. But she explicitly didn't want that — she wanted to understand and control her own site. Fair enough.

So I looked for MCP (Model Context Protocol) servers for WordPress. The concept is simple: expose WordPress functionality through a standardized protocol that AI tools can consume. Let Claude update posts, manage products, tweak styles — all through conversation.

**What I found**: Nothing. Or more precisely, nothing free and comprehensive.

WordPress's own team had started working on this with two projects:
- [**Abilities API**](https://github.com/WordPress/abilities-api): A standardized way to register WordPress capabilities
- [**MCP Adapter**](https://github.com/WordPress/mcp-adapter): Bridges the Abilities API to the MCP protocol

Great foundation. But the Abilities API is just that — an API. You still need to actually *register* abilities for the things you want to do. Content management, WooCommerce products, Gutenberg blocks, theme styling... none of that was implemented.

---

## The Solution: WordForge

So I built [WordForge](https://github.com/KONFeature/wordforge).

WordForge extends the WordPress MCP Adapter with a comprehensive set of abilities for real-world WordPress management:

### Content Management
- List, create, update, delete posts, pages, and custom post types
- Full support for taxonomies, meta fields, and featured images
- Pagination and filtering built-in

### Media Library
- Upload, update, delete media files
- Update alt text, captions, descriptions (critical for SEO)
- Support for URL and base64 uploads

### Gutenberg Blocks
- Get and update page block structures
- Auto-create revisions before changes
- Parse blocks in full or simplified format

### Theme Styling (FSE)
- Global styles (theme.json) — colors, typography, spacing
- Block styles — view registered block variations
- Full Site Editing compatible

### WooCommerce
- Product CRUD — simple, variable, grouped, external products
- Stock management, pricing, categories, tags
- Auto-detected: abilities only register when WooCommerce is active

---

## Architecture: Standing on WordPress's Shoulders

WordForge follows the official WordPress MCP Adapter's ability pattern:

```
wordforge.php              → Plugin bootstrap
includes/
├── AbilityRegistry.php    → Registers all abilities with MCP
└── Abilities/
    ├── AbstractAbility.php → Base class with helpers
    ├── Content/            → Post/page CRUD
    ├── Media/              → Media library management
    ├── Taxonomy/           → Categories, tags, custom taxonomies
    ├── Blocks/             → Gutenberg operations
    ├── Templates/          → FSE templates management
    ├── Styles/             → Theme styling
    ├── Prompts/            → AI prompt templates
    └── WooCommerce/        → Product management
```

Each ability defines:
- `get_title()` / `get_description()` — Metadata for MCP
- `get_input_schema()` — JSON Schema for parameters
- `get_capability()` — Required WordPress capability
- `execute()` — The actual operation

The beauty of this architecture: it's fully declarative. Add a new ability, register it, and it's immediately available to any MCP client.

---

## Installation: Two Parts

### 1. WordPress Plugin

Install WordForge on your WordPress via uploading the `wordforge.zip` from the GitHub releases

The plugin requires:
- PHP 8.0+
- WordPress 6.4+

### 2. MCP Client Configuration

**For Claude Desktop**: Download `wordforge.mcpb` from the releases and double-click to install.

**For OpenCode** (my daily driver): Add to your `.opencode.json`:

```json
{
  "mcp": {
    "wordpress": {
      "enabled": true,
      "type": "local",
      "command": ["node", "./path/to/wordforge-server.js"],
      "environment": {
        "WORDPRESS_URL": "https://emmaye.fr/wp-json/wp-abilities/v1",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

Generate an Application Password in WordPress under **Users → Profile → Application Passwords**.

---

## Real Usage: Managing emmaye.fr

Now my girlfriend manages [emmaye.fr](https://emmaye.fr) — her pottery shop — through Claude conversations:

> "Add a new product called 'Bol Rustique' priced at 35€, in the 'Bols' category, with 3 items in stock"

Claude calls `wordforge/save-product` with the right parameters. Done.

> "Update the homepage hero section to say 'Pièces uniques façonnées à la main'"

Claude fetches the page blocks, updates the content, creates a revision. Done.

> "What products are running low on stock?"

Claude lists products filtered by stock status. Done.

She's not a developer. She doesn't need to be. The WordPress admin panel is still there when she wants fine-grained control. But for quick updates, product additions, content tweaks — a conversation is faster.

And personally, I use OpenCode to help her with more complex changes. Same tools I use for development, now applied to WordPress management.

---

## What's Next

WordForge is open source and actively maintained. Current priorities:

1. **More WooCommerce abilities**: Orders, customers, coupons
2. **Better prompts**: AI-optimized prompts for common tasks
3. **Multi-site support**: Managing multiple WordPress instances
4. **Backup integration**: Before making changes, snapshot the state

The goal isn't to replace WordPress's admin interface — it's to augment it with conversational AI for those who want it.

---

## Why Open Source This?

I was genuinely surprised that no free, comprehensive WordPress MCP integration existed. The WordPress team built the foundation (Abilities API + MCP Adapter), but the actual abilities were missing.

So I built what I needed and open-sourced it. Maybe someone else has a partner starting a small business, or wants to manage their blog through Claude, or just prefers conversation over clicking.

The WordPress ecosystem deserves AI tooling that isn't locked behind paywalls.

---

## Links

- **WordForge**: [github.com/KONFeature/wordforge](https://github.com/KONFeature/wordforge)
- **WordPress Abilities API**: [github.com/WordPress/abilities-api](https://github.com/WordPress/abilities-api)
- **WordPress MCP Adapter**: [github.com/WordPress/mcp-adapter](https://github.com/WordPress/mcp-adapter)
- **Emmaye (the pottery shop)**: [emmaye.fr](https://emmaye.fr)

---

**Tech Stack**:
- **Server**: Hetzner VPS (3€/month)
- **Platform**: WordPress 6.9 with WooCommerce
- **MCP Integration**: WordForge
- **AI Clients**: Claude Desktop, OpenCode
