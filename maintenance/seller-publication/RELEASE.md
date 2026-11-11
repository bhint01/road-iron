# Seller publication release

Tests passed: https://github.com/bhint01/road-iron/actions/runs/43043270285

Completed live backend repairs: stripe-webhook v16 and original checkout v13 use a verified existing live server key when the legacy secret variable contains a publishable key. Refund endpoints received the same credential-selection-only repair. Required webhook events were added to the existing destination; old events, URL and signing secret were preserved. Temporary OIDC maintenance endpoint disabled after success. No live charge, transfer, refund or seller account was created.

Saved sandbox shipping/pickup/refund evidence was reused rather than repeating completed financial tests. Checkout health passed on 2026-11-11 after repair.

PENDING: apply schema.sql through Supabase, then deploy this seller page, verify served hash, and set private marketplace_feature_flags seller_publication_ready=true after release checks pass. Two connector confirmations expired; no publication migration or activation occurred. Do not claim seller publishing is open yet.

Scope: ordinary tangible parts selected and confirmed by each seller. Whole vehicles/special-tax items remain private until an appropriate classification is supported. Actual pickup location is required for pickup sales tax; no parcel measurements for pickup. Drafts remain private. Stripe account verification and delivery details remain required. Existing inventory and 8% commission are preserved.
