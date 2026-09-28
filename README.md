# shopify-customer-account-extensions

Three free, copy-paste Shopify Customer Account UI Extensions — a one-click reorder button, an order delivery note, and a privacy-consent manager — built against the 2026-01 API with real tests for the logic behind them.

Every merchant we onboard eventually asks for the same handful of post-purchase touches on their customer accounts pages — "let people reorder in one click," "let them leave a note for the courier," "let them manage their own tracking consent" — and there was no single place with working, current-API examples of all three together.

**Free audit for your own store while you're here:** [audit.ecomswiftllc.com](https://audit.ecomswiftllc.com/?utm_source=github&utm_medium=repo&utm_campaign=shopify-customer-account-extensions) checks SEO, speed, CRO and AI-visibility in one pass.

## What's inside

| Extension | Target | What it does |
| --- | --- | --- |
| [`reorder-from-order`](extensions/reorder-from-order) | `customer-account.order-status.block.render` | Reads the order's line items with the read-only Cart Lines API, builds a fresh Storefront API cart with the same variants and quantities, and links the buyer straight to checkout. |
| [`delivery-instructions`](extensions/delivery-instructions) | `customer-account.order-status.block.render` | Lets the buyer add a delivery note (gate code, safe drop spot) to an already-placed order, saved as an order metafield with the Customer Account API's `metafieldsSet` mutation. |
| [`privacy-consent-manager`](extensions/privacy-consent-manager) | `customer-account.profile.block.render` | Shows the buyer's current analytics/marketing/preferences tracking-consent state and lets them change it with `shopify.applyTrackingConsentChange`. |

## Example output

```
┌───────────────────────────────────────────┐
│ Buy it again                                │
│ Start a new cart with the 3 items from      │
│ order #1042.                                │
│ [ Add all items to a new cart ]             │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Delivery instructions                       │
│ ┌─────────────────────────────────────┐    │
│ │ Leave with the doorman, ask for      │    │
│ │ apartment 4B                          │    │
│ └─────────────────────────────────────┘    │
│ [ Save instructions ]                       │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Privacy preferences                         │
│ ☑ Analytics (currently: Granted)            │
│ ☐ Marketing (currently: Denied)             │
│ ☑ Preferences (currently: Granted)          │
│ [ Save preferences ]                        │
└───────────────────────────────────────────┘
```

(Illustrative — the real components render with your account's Polaris theming.)

## Features

- **Three independent extensions**, each in its own folder with its own `shopify.extension.toml` — copy only the one(s) you need.
- **The non-trivial logic is unit tested, not just eyeballed.** `toCartLineInputs`/`buildCartCreateVariables`, `validateDeliveryInstructions`/`buildMetafieldsSetVariables`, and `summarizeConsentState`/`buildConsentChangePayload` live in [`lib/`](lib) as plain, framework-free functions with a 27-case `node --test` suite covering duplicate variants, zero/negative quantities, the 250-line `cartCreate` cap, over-length notes, and consent categories the UI doesn't expose a toggle for.
- **Written against the Order, Cart Lines, Customer Account, and Customer Privacy APIs** at API version `2026-01`, using the current Polaris web-component (`s-*`) syntax, not the deprecated React component set.
- **Honest about what each API actually returns.** The reorder button doesn't pretend `shopify.order` has line items (it doesn't — that's the read-only Cart Lines API's job) and doesn't pretend `cartCreate` always succeeds (out-of-stock variants surface as a `userErrors` banner, not a silent failure).

## Installation

These are extension source files meant to be copied into an existing Shopify app, not a standalone project. You need an app first:

```bash
npm install -g @shopify/cli
shopify app init
cd your-app
shopify app generate extension --template customer_account_ui --name reorder-from-order
```

Then replace the generated `extensions/reorder-from-order/src/*.jsx` and `shopify.extension.toml` with the versions from this repo (adjusting the `../../../lib/...` import path to wherever you put the matching file from [`lib/`](lib) inside your app). Repeat for the other two extensions.

```bash
shopify app dev
```

Requires Node.js 18+, a Partner account with a development store, and — for `delivery-instructions` — an app with the `customer_read_customers` and `customer_write_customers` access scopes plus [protected customer data access](https://shopify.dev/docs/apps/store/data-protection/protected-customer-data) approved by Shopify. Neither is granted to a new app by default.

## Usage

Each `shopify.extension.toml` under [`extensions/`](extensions) targets one customer account page slot and points at its source file. `reorder-from-order` also declares the `api_access` capability (Storefront API) and `privacy-consent-manager` declares `collect_buyer_consent.customer_privacy` — both required or the corresponding API call is rejected at runtime. See [Enable extension capabilities for customer accounts](https://shopify.dev/docs/apps/build/customer-accounts/capabilities) if you haven't set these before.

Run the logic tests on their own, no Shopify CLI required:

```bash
npm install
npm test
```

## What it does NOT do

- **`reorder-from-order` can't check stock or availability before building the cart.** The Cart Lines API doesn't expose an `availableForSale` field, so a variant that's sold out or been deleted since the original purchase surfaces as a `userErrors` message from `cartCreate`, not a pre-flight warning.
- **It can't apply the order's original price, discounts, or selling plan pricing to the new cart.** `cartCreate` prices the new cart at today's price for each variant. A subscription line's `sellingPlanId` is passed through, but a one-time discount code on the original order is not reapplied.
- **`delivery-instructions` doesn't notify the merchant.** The note lands on an order metafield, visible in the admin and to any app or Flow that reads it — this repo doesn't add an email/Slack alert on save.
- **`privacy-consent-manager` doesn't expose the sale-of-data toggle**, since that control should only appear in regions where `shopify.customerPrivacy.value.saleOfDataRegion` is `true` and this simple version doesn't add that region gate. Add it yourself before shipping to a region where sale-of-data opt-out is required.
- **No server, no database, no webhook handling.** These are pure customer account UI extensions; state lives in Shopify's own metafields and consent store, not in a database you host.
- **Not deployed or run against a live store by us in CI.** Every component, API field, and mutation shape here was checked against the live 2026-01 customer-account-extensions documentation (component reference, Order/Cart Lines/Customer Account/Customer Privacy API pages) and the current Storefront API schema. The skill's own `validate.mjs` type-checker returned a "cannot find module" error against even a one-line smoke-test extension in this environment — an existing, unrelated bug in that tool's virtual type resolution, not a defect in the code below. Run `shopify app dev` against your own development store to confirm before shipping to production.

## FAQ

**Why three separate extensions instead of one?**
Customer account extensions are installed and positioned independently by merchants in the checkout and accounts editor. A merchant who only wants the reorder button shouldn't also get a consent manager they didn't ask for.

**Does `reorder-from-order` add the items to the buyer's existing cart, or start a new one?**
A new one. Customer accounts and the storefront don't share a live cart session the extension can reach into, so `cartCreate` starts a fresh cart and the extension links straight to its `checkoutUrl`.

**Why `fetch('shopify://storefront/...')` instead of a Shopify-provided GraphQL client?**
That's the documented way to call the Storefront and Customer Account APIs from inside a customer account extension — authentication is handled automatically by the `shopify:` / `shopify://` protocol, no session token wiring required.

**Can the delivery note be edited by the merchant, too?**
Yes — it's a standard order metafield (`custom.delivery_instructions`), visible and editable from the Shopify admin like any other metafield once the definition exists.

If you'd rather have someone else wire these into your app and match your accounts branding, our [free Shopify tools](https://www.ecomswiftllc.com/free-tools) and [store audit](https://audit.ecomswiftllc.com/?utm_source=github&utm_medium=repo&utm_campaign=shopify-customer-account-extensions) are a good starting point.

## Related Shopify tools

- [`shopify-checkout-ui-extensions`](https://github.com/Ecom-Swift-LLC/shopify-checkout-ui-extensions) — four free Checkout UI Extensions (delivery note, free-shipping bar, PO Box guard, Thank You recap).
- [`shopify-accessible-components`](https://github.com/Ecom-Swift-LLC/shopify-accessible-components) — WCAG-conscious drop-in Liquid theme components (modal, cart drawer, tabs, accordion).
- [`shopify-theme-performance-auditor`](https://github.com/Ecom-Swift-LLC/shopify-theme-performance-auditor) — audits a live theme for render-blocking and oversized assets.
- [`shopify-storefront-graphql-examples`](https://github.com/Ecom-Swift-LLC/shopify-storefront-graphql-examples) — reference library and CLI for the raw Storefront GraphQL API, including the full cart lifecycle.
- [`shopify-app-starter-remix`](https://github.com/Ecom-Swift-LLC/shopify-app-starter-remix) — an embedded Remix app starter with the OAuth, session storage, and GDPR webhooks these extensions would live inside.
- [`shopify-webhook-toolkit`](https://github.com/EcomswiftLLC/shopify-webhook-toolkit) — verify, log and replay Shopify webhooks locally.
- [`shopify-audit-mcp`](https://github.com/EcomswiftLLC/shopify-audit-mcp) — the same audit as a tool for Claude, Cursor and other MCP clients.

## Contributing

Issues and PRs welcome — more extensions (an order-status return request, a loyalty-points display, a saved-address quick-editor), region-aware sale-of-data handling for `privacy-consent-manager`, more `lib/` test coverage, and reports of any breakage on newer API versions (`2026-04`, `2026-07`) are all useful.

## Roadmap

- A region-gated sale-of-data toggle for `privacy-consent-manager`, using `shopify.customerPrivacy.value.saleOfDataRegion`.
- An `order.action.render` variant of the reorder flow that opens in a modal from the order actions menu, for stores that want it off the main order-status page.
- Locale files beyond English.

## License

MIT © Ecom Swift LLC

## Need help?

This project is maintained by **Ecom Swift LLC**, a Shopify Partner.

- 🛍️ Shopify Partner Directory: https://www.shopify.com/partners/directory/partner/waowy
- ✉️ Email: support@ecomswiftllc.com
- 💬 WhatsApp: https://wa.me/16312511767

---

Want your customer accounts customized without doing it yourself? [Get a free store audit](https://audit.ecomswiftllc.com/?utm_source=github&utm_medium=repo&utm_campaign=shopify-customer-account-extensions) (SEO, speed, CRO, AI visibility) or browse our other [free Shopify tools](https://www.ecomswiftllc.com/free-tools). We're **Ecom Swift LLC**, a Shopify Partner Agency — [www.ecomswiftllc.com](https://www.ecomswiftllc.com).
