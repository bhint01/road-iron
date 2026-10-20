# ROAD IRON seller marketplace implementation

Status: implementation branch; NOT production-ready. Do not merge or enable third-party checkout until end-to-end payment tests pass.

## Owner-approved business rules
- Sellers can publish without per-listing administrator approval after completing onboarding.
- No listing charge or monthly seller fee.
- ROAD IRON charges 8% of the merchandise sale price, excluding separately charged shipping and sales tax.
- Seller is responsible for accurate fitment, lawful inventory, fulfillment, and returns.
- Platform retains authority to remove prohibited listings or suspend sellers.

## Launch gates
1. Stripe Connect: create a connected account for each seller, use hosted onboarding, and verify account capabilities before enabling sales. Store account IDs server-side; never accept a seller-provided destination account for checkout.
2. Payment routing: calculate the 8% fee on the server from authoritative product prices. Decide the Stripe charge model and processing fee responsibility; handle mixed-seller carts either by separate checkouts or an explicitly designed split-payment flow.
3. Fulfillment: use each seller's shipping origin, package dimensions and delivery rules; avoid charging shipping from ROAD IRON's origin for third-party inventory.
4. Database: restrict seller writes to their own listings with RLS; forbid seller-controlled commission rate, payment destination and order status. Add seller onboarding/payout status and published product provenance.
5. Publishing: allow authenticated, eligible sellers to publish and edit their own products immediately after validation. Require title, condition, category, price, shipping origin, and at least one uploaded image. Block unsafe/prohibited categories and provide reporting/takedown.
6. Payment lifecycle: verify signed Stripe webhooks, enforce idempotency, decrement inventory after successful payment, and handle refunds, chargebacks, canceled orders and fee reversals.
7. Legal/tax: publish final seller terms, collect consent version, confirm marketplace-facilitator tax treatment, seller reporting and payment provider compliance.
8. Testing: run isolated sandbox tests for onboarding, listing, checkout, commission, seller payout, refund, chargeback, inventory and permissions. Verify production settings separately.

## Existing architecture (2026-10-19)
- Static GitHub Pages frontend: seller.html, index.html, product.html, admin.html.
- Supabase project: sblnblmcvyvmllyvrnbb.
- Tables include marketplace_sellers, seller_submissions, products, product_photos, orders, order_items.
- products already has seller_id and marketplace_commission_rate (default 0.0800).
- Current seller.html still uses approval and review submissions; no automatic publishing.
- Existing create-checkout-session and stripe-webhook functions need review before modification.
