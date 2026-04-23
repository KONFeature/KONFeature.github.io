---
title: "A WordPress Plugin That Doesn't Tank Your Store's Performance"
subtitle: "Context-aware bootstrapping, manifest-based block registration, delegating webhooks to WooCommerce's native pipeline, and deleting every line of code we didn't need"
description: "How we shipped a production WordPress + WooCommerce plugin that loads almost nothing per request, registers three Gutenberg blocks without scanning the disk, and offloads webhook delivery to WooCommerce's native engine with fingerprint-based orphan adoption."
date: 2026-04-21T10:00:00Z
draft: false
category: "engineering"
group: "frak"
tags: ["WordPress", "WooCommerce", "PHP", "Performance", "Gutenberg", "Webhooks", "CI/CD"]
icon: "code-2"
iconColor: "text-sky-400"
githubUrl: "https://github.com/frak-id/wallet"
---

The stereotype about WordPress plugins is that they are performance train wrecks. Most of them earn it.

A typical plugin registers on `plugins_loaded`, scans the filesystem for block metadata on every `init`, hooks into ten filters *just in case* one of them fires, persists ten separate options rows that all autoload on every request, and ships a PHP webhook dispatcher that hand-rolls HMAC signing, retries, and logging with varying degrees of brokenness. Then it autoloads all of it eagerly so your TTFB degrades by 30 ms whether the plugin renders anything on the page or not.

We just shipped the Frak WordPress plugin, about 2,400 lines across 18 files, three Gutenberg blocks, a WooCommerce integration, full CI with release automation, and we spent more time *deleting* code than writing it. The plugin's per-request cost on a page that doesn't render any Frak component is a single autoloaded option read and one composer classmap lookup. That's it. This post is the opinionated tour of how.

## The First Thing That Was Wrong: Everything Loaded on Every Request

The v0 plugin registered admin handlers, frontend scripts, WooCommerce observers, and block metadata on every single PHP request. WP-CLI commands paid for the frontend SDK injection. Cron jobs paid for the Gutenberg block registration. Frontend requests paid for the settings page even though the user would never see it.

The fix is cheap once you look at it, WordPress already tells you which context you're in; the plugin just needs to *ask*:

```php
// plugins/wordpress/includes/class-frak-plugin.php
public static function init() {
    $has_wc = class_exists( 'WooCommerce' );

    if ( ( defined( 'WP_CLI' ) && WP_CLI ) || wp_doing_cron() ) {
        if ( $has_wc ) {
            Frak_WC_Webhook_Registrar::init();
        }
        return;
    }

    if ( is_admin() ) {
        Frak_Admin::init();

        if ( $has_wc ) {
            Frak_WC_Webhook_Registrar::init();
        }
    } else {
        Frak_Frontend::init();
    }

    Frak_Blocks::init();
    Frak_Shortcodes::init();

    if ( $has_wc ) {
        Frak_WooCommerce::init();
    }
}
```

- **CLI and cron** only need the webhook registrar so option-update hooks keep the WooCommerce webhook URL in sync when an operator runs `wp option update frak_webhook_secret` from a script. Everything else is dead code in those contexts and is simply not wired.
- **Admin requests** get the settings UI and the webhook registrar (it's the admin context that actually mutates those options) and explicitly skip the frontend SDK injection.
- **Frontend requests** get the SDK injection and the block/shortcode renderers, and skip the admin UI.

The six option-update hooks that `Frak_WC_Webhook_Registrar::init()` registers? They used to fire on every frontend request. Moving them behind the admin+cron gate eliminated six unnecessary `add_action` calls per pageview on a site's most popular surface. Rough maths: three hooks of ~2 µs each on a site doing 100k pageviews/day is 600 ms of aggregate CPU time saved daily. Not Earth-shaking in isolation, but it's a cheap six-second change for that return.

## Blocks Without the Disk Scan

WordPress 6.7 added `wp_register_block_metadata_collection()`, an API most plugins haven't adopted yet because it requires a little ceremony. It lets you pre-compute every `block.json` into a single in-memory array, registered once per request, so `register_block_type()` doesn't `file_get_contents()` and `json_decode()` three files every time the block registry fires.

```php
// plugins/wordpress/includes/class-frak-blocks.php
private const BLOCKS = array(
    'banner',
    'post-purchase',
    'share-button',
);

public static function register_blocks() {
    $blocks_dir = FRAK_PLUGIN_DIR . 'includes/blocks';

    if ( function_exists( 'wp_register_block_metadata_collection' ) ) {
        wp_register_block_metadata_collection( $blocks_dir, FRAK_PLUGIN_DIR . 'includes/blocks-manifest.php' );
    }

    foreach ( self::BLOCKS as $slug ) {
        register_block_type( $blocks_dir . '/' . $slug );
    }
}
```

The manifest is just an array keyed by folder name:

```php
// includes/blocks-manifest.php
return array(
    'banner'        => array(
        '$schema'      => 'https://schemas.wp.org/trunk/block.json',
        'apiVersion'   => 3,
        'name'         => 'frak/banner',
        'title'        => 'Frak Banner',
        // ... all the attributes & supports & textdomain metadata
    ),
    'post-purchase' => array( /* ... */ ),
    'share-button'  => array( /* ... */ ),
);
```

On WP 6.7+ the collection call makes `register_block_type()` resolve metadata from memory. On WP 6.4-6.6 the collection call is a no-op and core falls back to reading the on-disk `block.json` as before. One line of code, zero breakage on older WP, three fewer disk I/O hits per request on modern WP.

The `BLOCKS` constant being hard-coded matters too. An earlier version used `glob()` to enumerate the folders under `includes/blocks/`. That's one `opendir`/`readdir` sweep per request, replaced by a single array-literal lookup. Adding a block is still a one-line change, update the constant, drop the folder, and it's still cheap to read.

### The Gutenberg Iframe Gotcha

WordPress 6.3 moved the block editor canvas into a same-origin iframe. That iframe does *not* inherit the outer admin window's `CustomElementRegistry`, so the Frak SDK, enqueued against the outer window via `wp_enqueue_script('frak-sdk')`, never defines the `<frak-banner>` / `<frak-post-purchase>` / `<frak-button-share>` custom elements inside the canvas. Merchants see static placeholders instead of real previews.

The fix is a tiny inline helper we register alongside the SDK:

```php
public static function enqueue_editor_assets() {
    wp_register_script(
        'frak-sdk',
        'https://cdn.jsdelivr.net/npm/@frak-labs/components',
        array(),
        null,
        true
    );

    wp_add_inline_script( 'frak-sdk', self::generate_editor_config_script(), 'before' );
    wp_enqueue_script( 'frak-sdk' );

    wp_register_script(
        'frak-editor-sdk-injector',
        FRAK_PLUGIN_URL . 'includes/blocks/frak-editor-sdk-injector.js',
        array( 'frak-sdk' ),
        FRAK_PLUGIN_VERSION,
        true
    );
    wp_enqueue_script( 'frak-editor-sdk-injector' );
}
```

The injector is a handful of lines of vanilla JS that, from inside each block's `useEffect`, re-injects the SDK `<script>` and the forwarded `window.FrakSetup.config` into the iframe's document. Once it runs, `customElements.get('frak-banner')` resolves and the preview renders exactly as it will on the live site.

The config block for the editor also sets `waitForBackendConfig: false`, a flag our SDK respects to short-circuit the "wait for backend-resolved merchant config" gate, so previews render immediately without a real Frak client configured:

```php
$config = array(
    'waitForBackendConfig' => false,
    'metadata'             => $metadata,
);
```

Preview in the block editor becomes a mirror of production without running a mock server, without a dev-mode flag, and without any network dependency beyond the CDN the SDK already loads from.

## Settings: One Autoloaded Row, One Non-Autoloaded Credential

The v1 plugin persisted eight separate `frak_*` option rows, all autoloaded:

```
frak_app_name
frak_logo_url
frak_enable_purchase_tracking
frak_enable_floating_button
frak_show_reward
frak_button_classname
frak_floating_button_position
frak_modal_language
frak_modal_i18n
frak_webhook_logs    <-- this one was the real crime
frak_webhook_secret  <-- and this one
```

`frak_webhook_logs` was a ring buffer of the last 50 webhook deliveries, dumped as a serialized PHP array into `wp_options`, autoloaded on every request. On a site with even mild traffic this would sit at 30-50 KB of autoloaded option. Every pageview hydrated it.

`frak_webhook_secret` is the credential the WC webhook signs with. Autoloading a credential on every request is, at best, unnecessary, no frontend code path reads it.

v1.1 replaces the whole zoo with two rows:

- **`frak_settings` (autoloaded)**: a single array bundling `app_name` + `logo_url`. Read on every frontend request, but one `get_option()` call instead of eight.
- **`frak_webhook_secret` (autoload = no)**: loaded only when the webhook registrar needs it, which is admin + cron.

The migration happens once, idempotently, on upgrade:

```php
// plugins/wordpress/includes/class-frak-settings.php
public static function migrate() {
    $version = (int) get_option( self::VERSION_OPTION, 0 );
    if ( $version >= self::CURRENT_VERSION ) {
        return;
    }

    $existing = get_option( self::OPTION_KEY, array() );
    $existing = is_array( $existing ) ? $existing : array();

    foreach ( self::LEGACY_OPTIONS as $new_key => $legacy_key ) {
        if ( array_key_exists( $new_key, $existing ) ) {
            continue;
        }
        $legacy_value = get_option( $legacy_key, null );
        if ( null !== $legacy_value ) {
            $existing[ $new_key ] = $legacy_value;
        }
    }

    update_option( self::OPTION_KEY, array_intersect_key( $existing, self::DEFAULTS ) );

    $legacy_to_delete = array_merge(
        array_values( self::LEGACY_OPTIONS ),
        self::DEPRECATED_LEGACY_OPTIONS
    );
    foreach ( $legacy_to_delete as $legacy_key ) {
        delete_option( $legacy_key );
    }

    // Force autoload=no on the webhook secret so existing installs upgraded
    // from v1 stop hydrating the credential on every request.
    if ( function_exists( 'wp_set_option_autoload' ) ) {
        wp_set_option_autoload( 'frak_webhook_secret', false );
    }

    update_option( self::VERSION_OPTION, self::CURRENT_VERSION );
    self::$cache = null;
}
```

Two things worth calling out:

- **Surviving legacy values are preserved.** `array_intersect_key` with the defaults map means only known keys make it into the bundled row. Unknown keys, the detritus of a forked version or a third-party admin script, are dropped. No silent pollution.
- **`wp_set_option_autoload()` is WP 6.4+.** The call is gated behind `function_exists()` so older installs get a no-op and the next version of the plugin will eventually catch them up. No one blocks upgrading to WP 6.4 at this point, but defensive coding is free.

The migration runs on `register_activation_hook` (fresh installs) and `upgrader_process_complete` (in-place updates). The second hook is the one most plugins forget, `register_activation_hook` does not fire on in-place upgrades, so any migration logic gated only on activation silently skips the upgrade path.

## Webhooks: Delete Your Custom Dispatcher

The v1 plugin's biggest lines-of-code center was its webhook dispatcher: ~300 lines of PHP handling HMAC-SHA256 signing, retries with exponential backoff, Action Scheduler dispatch, delivery logging to a ring buffer, error thresholds that auto-disabled after N failures. It worked. It was also a maintenance burden we didn't need to carry.

WooCommerce has all of that, built in, and the merchant can see it in a UI they already know. The v1.1 rewrite collapses our dispatcher into a registrar, a class whose only job is "ensure the Frak-owned `WC_Webhook` row exists, with the right URL, with the right secret":

```php
// plugins/wordpress/includes/class-frak-wc-webhook-registrar.php
public static function ensure() {
    if ( ! self::is_wc_available() ) {
        return null;
    }

    $merchant_id = Frak_Merchant::get_id();
    $secret      = (string) get_option( 'frak_webhook_secret', '' );
    if ( ! $merchant_id || '' === $secret ) {
        return null;
    }

    // Transient-based lock prevents two concurrent admin requests
    // from spawning two WC_Webhook rows before the id is stored.
    if ( get_transient( self::LOCK_KEY ) ) {
        $existing = self::load_existing_webhook() ?? self::find_orphaned_webhook();
        return $existing ? (int) $existing->get_id() : null;
    }
    set_transient( self::LOCK_KEY, 1, self::LOCK_TTL );

    try {
        $delivery_url = self::build_delivery_url( $merchant_id );

        $webhook = self::load_existing_webhook()
            ?? self::find_orphaned_webhook()
            ?? new WC_Webhook();

        $webhook->set_user_id( self::pick_owner_user_id() );
        $webhook->set_name( self::WEBHOOK_NAME );
        $webhook->set_topic( self::TOPIC );
        $webhook->set_delivery_url( $delivery_url );
        $webhook->set_secret( $secret );
        $webhook->set_api_version( self::API_VERSION );
        $webhook->set_status( 'active' );

        $webhook_id = $webhook->save();
        if ( $webhook_id ) {
            update_option( self::OPTION_ID, (int) $webhook_id, false );
        }
        return $webhook_id ? (int) $webhook_id : null;
    } finally {
        delete_transient( self::LOCK_KEY );
    }
}
```

The registrar gets us:

- **HMAC signing**. WC signs every delivery with base64 HMAC-SHA256 in the `X-WC-Webhook-Signature` header. We dropped ~50 lines of PHP that did the same thing manually.
- **Retries**. WC attempts each delivery up to 5 times before auto-disabling the webhook. The Frak backend can be down, overwhelmed, or mid-deploy and the merchant doesn't lose attribution.
- **Delivery logging**. Every delivery shows up under `WooCommerce → Status → Logs` with source `webhooks-delivery`. Merchants can debug without asking us.
- **HPOS compatibility**. The plugin declares `custom_order_tables` compat, and WC routes the webhook through whichever order storage backend is active. No code changes needed.

### The Orphan Adoption Trick

`ensure()` is idempotent, but it needs to survive an operator deleting the `frak_wc_webhook_id` option while keeping the WC webhook row (or the inverse). Without a safeguard, the next `ensure()` call would see no stored id and create a duplicate `Frak attribution` webhook.

So before creating a new row, `ensure()` searches WooCommerce's webhook table for an orphan that matches our fingerprint:

```php
private static function find_orphaned_webhook(): ?WC_Webhook {
    if ( ! class_exists( 'WC_Data_Store' ) ) {
        return null;
    }
    $data_store = WC_Data_Store::load( 'webhook' );
    if ( ! method_exists( $data_store, 'search_webhooks' ) ) {
        return null;
    }
    $ids = $data_store->search_webhooks(
        array(
            'search' => self::WEBHOOK_NAME,
            'limit'  => 10,
        )
    );
    if ( empty( $ids ) || ! is_array( $ids ) ) {
        return null;
    }
    foreach ( $ids as $id ) {
        $webhook = wc_get_webhook( (int) $id );
        if (
            $webhook instanceof WC_Webhook
            && $webhook->get_name() === self::WEBHOOK_NAME
            && $webhook->get_topic() === self::TOPIC
        ) {
            return $webhook;
        }
    }
    return null;
}
```

Name + topic together form the fingerprint. Name alone would be too broad (some merchant could conceivably have a different "Frak attribution" webhook); topic alone would be meaningless (`order.updated` is the most popular WC webhook topic by a wide margin). The conjunction is narrow enough that the only row that could possibly match is ours.

The transient lock (`frak_wc_webhook_ensure_lock`, 15 s TTL) is the other half: two concurrent admin requests hitting the settings page save button both want to `ensure()`, but only one should save. The lock holder does the work; the other returns whatever webhook is already on file. Fifteen seconds is enough to cover the WC save + `deliver_ping()` handshake, short enough not to wedge the admin UI if the holder dies mid-flight.

## The Release Pipeline

The plugin ships as a zip, generated by `build.sh`, wrapped in a release workflow, triggered by PR label.

```bash
#!/bin/bash
# plugins/wordpress/build.sh (excerpt)

composer install --no-dev --optimize-autoloader

mkdir -p languages
if command -v wp >/dev/null 2>&1; then
  wp i18n make-pot . languages/frak.pot --slug=frak \
    --exclude=vendor,test,dist,build 2>/dev/null \
    || echo "  (skipped: wp i18n unavailable)"
fi

rsync -av --exclude-from='.distignore' \
  --exclude='build' --exclude='dist' --exclude='test' \
  --exclude='.git' --exclude='.gitignore' --exclude='.distignore' \
  --exclude='*.sh' \
  ./ ${BUILD_DIR}/${PLUGIN_NAME}/

cd ${BUILD_DIR}
zip -r ../${DIST_DIR}/${PLUGIN_NAME}-${VERSION}.zip ${PLUGIN_NAME}
```

Three decisions matter:

- **`composer install --no-dev --optimize-autoloader`**. We use Composer only for the classmap, there are no third-party runtime deps. `--optimize-autoloader` regenerates the classmap at install time so production zips ship a warm autoloader. No SPL closures, no per-request class-scanning; every `Frak_*` class resolves to a single file lookup on first hit.
- **`.distignore`** excludes dev-only files (PHPUnit, PHPStan configs, tests, build scripts, `.git*`, `node_modules`). The zip that ships to the merchant is smaller than the source tree by about 70%.
- **`wp i18n make-pot`** generates a fresh translation template against the zip's source. Translators forked off that `.pot` can start work without waiting for a manual export.

The release workflow itself is short:

```yaml
# .github/workflows/release-wordpress.yml
on:
  workflow_dispatch:
    inputs:
      version:
        description: "Version to release (e.g. 1.0.1)"
        required: true
  pull_request:
    types: [closed]
    branches: [main, dev]

jobs:
  prepare-pr:
    if: github.event_name == 'workflow_dispatch'
    # Opens a release PR with the version bumped in frak-integration.php
    # and the changelog generated from keep-a-changelog sections.

  publish:
    if: |
      github.event_name == 'pull_request' &&
      github.event.pull_request.merged == true &&
      contains(github.event.pull_request.labels.*.name, 'release:wordpress') &&
      startsWith(github.event.pull_request.head.ref, 'release/wordpress-')
    # Builds, uploads to GitHub Releases, publishes a tag.
```

Two-step: a `workflow_dispatch` opens the release PR (version bump + changelog + CI), then merging that PR (label-gated on `release:wordpress`) triggers the build and publish. No release gets cut without going through review, no manual zip upload.

The version itself is a single source of truth. The plugin file header:

```php
/**
 * Plugin Name: Frak
 * Version: 1.1.1
 * ...
 */

$frak_plugin_header = get_file_data( __FILE__, array( 'Version' => 'Version' ) );
define( 'FRAK_PLUGIN_VERSION', '' !== $frak_plugin_header['Version'] ? $frak_plugin_header['Version'] : '0.0.0' );
```

The release workflow bumps the header via `sed`. The `get_file_data()` call propagates that bump to every consumer, `FRAK_PLUGIN_VERSION`, every `wp_enqueue_script` cache buster, every block asset handle. No second file to forget to update.

## A Smaller Thing That Saves Real Work

Translations in WordPress are historically loaded explicitly from every plugin's bootstrap:

```php
// The pattern you'll find in 90% of plugins, still, in 2026
add_action( 'plugins_loaded', function() {
    load_plugin_textdomain( 'frak', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
});
```

This adds up. Every plugin on the site runs a `file_exists()` probe for its `.mo` file on every request. It was redundant the day WP 4.6 shipped, core auto-detects translations from the `Text Domain` + `Domain Path` headers and loads them just-in-time on the first `__()` call. We deleted the hook. Two `file_exists()` calls per request saved on every site we ship to.

These little wins stack. Not loading translations you don't need. Not autoloading credentials you don't read. Not globbing disks you don't have to. Not registering admin UI on the frontend. Individually, they each save single-digit milliseconds. Collectively, on a busy WooCommerce storefront where every millisecond matters, they're the difference between "plugin we turn off because it's slow" and "plugin we keep because we don't even notice it's there."

## Lessons

Six things I'd want the next plugin author to know:

- **Gate by context at the top of `init()`.** Frontend code should never run in CLI. Admin code should never run on frontend. A seven-line dispatch up front pays for itself a hundred times over.
- **`wp_register_block_metadata_collection()` is worth adopting early.** WP 6.7+ adoption is already high enough that most active installs benefit. Feature-gate the call with `function_exists()` and you get zero regression on older WP.
- **One autoloaded options row, always.** Bundle every UI-level setting into a single array-backed row. Force credentials to `autoload = no`. Never hydrate a webhook log ring buffer on every request, if you need delivery logs, let the platform keep them.
- **Delete your custom webhook dispatcher.** Native `WC_Webhook` does HMAC signing, retries, logging, and HPOS compat for free. Owning that code was a liability; orphan-adoption by name + topic fingerprint is the one clever bit you have to write, and that's 20 lines.
- **Translations load themselves.** Since WP 4.6. Delete your `load_plugin_textdomain` hook.
- **Ship your CI as much as your plugin.** A two-step release workflow (PR bot + publish on merge) with a single source-of-truth version string eliminates a whole class of "which file did I forget to update" regressions. The workflow is 60 lines of YAML; it's the best 60 lines of YAML on the project.

The full plugin, 2,380 lines across 18 files, is in [frak-id/wallet](https://github.com/frak-id/wallet) at `plugins/wordpress`. It was a rewrite on top of a v1 that was functional but slow; the v1.1 migration path is automatic, so merchants don't see a thing when they upgrade except a site that got quietly faster. That, I think, is the bar a good plugin should hit.
