# ROAD IRON seller marketplace release checklist

## Current state

Development only. Seller private drafts and Stripe Connect onboarding groundwork exist. Live third-party checkout and seller payouts are NOT approved for release.

## Blocking checks

- [ ] Confirm Stripe Connect platform capabilities and connected-account verification using a real test seller.
- [ ] Ensure only connected, charges-enabled, payouts-enabled sellers can publish active items; automate publication without manual owner review after verification.
- [ ] Copy seller photo objects from private seller-review-photos storage into public product-images and create product_photos records, with retry and idempotency.
- [ ] Validate price, condition, inventory, prohibited goods, shipping origin, package weight and dimensions server-side.
- [ ] Prevent seller products from reaching existing first-party checkout until marketplace checkout is fully operational.
- [ ] Implement multi-seller order splitting and correct shipping rate per seller/origin, or explicitly restrict carts to one seller.
- [ ] Wire 8% merchandise-only commission into checkout, ledger, and transfers; quote helper `public.marketplace_commission_quote(bigint)` is deployed and tested with $100 -> $8 fee / $92 seller merchandise proceeds, but not yet integrated into a transaction.
- [ ] Transfer funds automatically with Stripe Connect after verified payment, using idempotent transfer keys and an internal ledger.
- [ ] Ensure third-party orders never trigger ROAD IRON's automatic Shippo label purchase.
- [ ] Seller fulfillment dashboard: shipment confirmation, carrier and tracking, buyer updates and deadlines.
- [ ] Refund, partial refund, cancellation, transfer reversal, chargeback, and webhook retry handling.
- [ ] Seller agreement: processing fees, returns, tax obligations, prohibited parts, recalls, indemnification and disputes.
- [ ] End-to-end test: seller signup, listing, photos, publication, purchase, commission, transfer, shipping, refund and dispute.
- [ ] Verify production keys, webhook signatures, deployment, monitoring and rollback plan.

Do not merge or enable live seller checkout until all blocking checks pass.
