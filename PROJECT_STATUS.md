# ROAD IRON — Project Status and Verification Log
Last reconciled: 2026-10-16
Repository: bhint01/road-iron
Website: https://road-iron.com
Purpose: Source of truth for completed work, verification and remaining work. Check this file and current code before suggesting tasks. Never equate 'code exists' with 'tested'. Do not mark tests passed without evidence.

## VERIFIED / COMPLETED
- Website repository and custom domain road-iron.com established (live status should be rechecked if relevant).
- Google Search Console: ownership verified; sitemap submitted; homepage indexed (reported 2026-10-16).
- Private two-way customer messaging and admin replies: tested working by 2026-10-14.
- Shippo live shipping rate calculation: verified 2026-10-07 using 30 lb, 15×13×11 in, origin 49021, destination 76310; quote matched approximately $30 UPS reference.
- Michigan Treasury business registration: successful submission 2026-10-16; confirmation recorded by owner separately. This does NOT prove license issuance or tax automation.
- Dedicated return-policy.html page: committed to GitHub 2026-10-16 (deployment/URL should be checked).

## BUILT / NOT FULLY VERIFIED
- Product storefront and inventory browsing, cart, admin tools.
- Stripe checkout integration: built, but completed end-to-end paid transaction NOT verified as of 2026-10-16.
- Photo attachments for messaging: feature added; end-to-end upload/delivery NOT verified as of 2026-10-14.
- Advertising packages and admin: built; recurring signup and payments testing unfinished.
- Seller applications/terms: built; multi-seller checkout/payouts NOT enabled.
- Shipping integration: live rate quoting verified; purchasing labels and full checkout shipping flow not established as verified.
- Website store policy page and privacy text exist; legal/compliance review not verified.

## IN PROGRESS / NEEDS WORK
- Add actual product photos, descriptions, prices and inventory; confirm public product indexing.
- Complete Stripe paid order test, refund and fulfillment path.
- Confirm tax configuration and required filings; Michigan registration alone does not configure checkout taxes.
- Test customer messaging photo attachments end-to-end.
- Finish advertising subscription/signup testing.
- Review Supabase security recommendations.
- Google Merchant Center and AdSense setup not confirmed.
- Verify deployed return policy page and link it in relevant footer/checkout areas if not already linked.

## WORKFLOW RULES
1. Read this file and inspect relevant repository code before giving a website status report or changing anything.
2. Check earlier conversation test outcomes when available.
3. Separate VERIFIED, BUILT, IN PROGRESS and BLOCKED; state the date and evidence for each.
4. Update this log after every substantive change or successful test.
5. Never mark a feature broken merely because its test result is missing.
6. Do not publish passwords, personal information, tokens, confirmation IDs or payment secrets in this public repository.

## 2026-10-19 SELLER DEVELOPMENT UPDATE
- Supabase migrations applied: self-registration for pending sellers, private draft submission inserts, and private seller photo upload permissions. Policy existence verified in database; browser end-to-end testing remains outstanding.
- GitHub branch seller-marketplace-automation updates seller.html to allow registered pending sellers to save private drafts with photos. Branch is NOT merged or deployed.
- Automatic public listing, Stripe Connect onboarding, seller payout routing, shipping for third-party orders and complete end-to-end tests remain NOT IMPLEMENTED. Do not enable third-party checkout.

## 2026-10-20 PAYMENT LEDGER UPDATE
- Applied Supabase seller_transfer_ledger_safe_staging migration: internal seller_transfers ledger with unique (order_id,seller_id), commission arithmetic check, idempotency fields, RLS and no anon/authenticated table grants. Verified permissions and RLS.
- Stripe transfer execution is intentionally NOT enabled. No third-party live checkout, automatic listing publication, shipping or payout/refund/dispute workflows are ready. These require further implementation and end-to-end testing.

## 2026-10-20 SELLER PORTAL VALIDATION FIX
- Corrected seller.html submitItem() to allow pending registered sellers to save drafts; previous check incorrectly required approved status. Matched seller name/title validation to Supabase RLS. Stripe account ROAD IRON connection is available but live checkout not activated.
- Browser integration tests still required. Seller listing public publishing, seller-specific shipping, Stripe transfers/refunds/disputes still not complete.

## 2026-10-20 AUTOMATIC NONPUBLIC PRODUCT STAGING
- Applied migration stage_seller_submissions_as_nonpublic_products. Each new seller_submissions pending row triggers creation of a linked products row with status=draft, seller_id and 0.08 commission; staged_product_id links submission to product. Trigger function is not callable by anon/authenticated.
- Verified zero active third-party products. This is private staging ONLY: seller photos, active publishing, checkout transfers and seller fulfillment still need implementation and end-to-end testing.
