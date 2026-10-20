# ROAD IRON automatic seller payments

Decision confirmed by owner: sellers receive proceeds automatically through Stripe Connect; ROAD IRON retains an 8% commission on the item price, excluding separately stated shipping and tax. No monthly or listing fees and no manual owner approval of individual listings.

## Required payment design before launch

- Stripe Connect Express connected accounts with completed capabilities and onboarding, validated server-side before enabling a seller product for purchase.
- For each checkout, calculate item subtotal, shipping, tax and marketplace fee on the server from immutable product/order records; do not trust browser-submitted amounts or seller fee rates.
- **Do not use destination charges for mixed-seller carts.** Implement one seller per checkout or a separate-charges-and-transfers architecture with immutable per-seller allocations. A cart with ROAD IRON and third-party products also needs explicit handling.
- On verified successful payment, reserve/finalize inventory exactly once and create idempotent seller transfer records. Never transfer before payment success. Handle async payment, refunds, chargebacks, transfer reversals, Stripe retries, payout failures and negative balances.
- Seller's automatic bank payout schedule is controlled by Stripe and connected-account eligibility; do not promise instant payout or exact deposit date.
- Third-party orders must not purchase a ROAD IRON-owned Shippo label from the seller's shipping charges. Each seller is responsible for shipping, tracking and customer support as defined in final seller terms.
- Test connected-account onboarding, mixed carts, duplicate webhook delivery, stock races, partial refunds, tax/shipping exclusion, failed payouts and disputes in Stripe test mode.

## Launch gate

Keep live third-party checkout OFF until all items above are implemented and verified. Existing live first-party checkout must remain unchanged during development.
