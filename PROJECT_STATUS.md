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

## Auction subdirectory preparation — 2026-10-23
- Prepared customer-only files for /auctions/ from the dedicated private auction repository on a review branch. Store homepage, CNAME, service worker and payment code are unchanged.
- Private-repository Pages requires an upgrade on the owner's current plan (confirmed by screenshot); the existing public store Pages deployment is the chosen hosting path.
- Dedicated auction Auth callbacks, Pages source settings and deployed browser/email flows remain to be configured or verified. No real auction or payment launch is claimed.

## Inline customer sign-in fix — 2026-10-23
- Replaced the homepage browser prompt with an inline email form that opens immediately and displays request progress, success and errors. Redirects target the configured auction index page.
- Full isolated suite passed, including a regression check for opening the form and retry after an email request failure. Real email delivery and mobile session completion still require verification.
