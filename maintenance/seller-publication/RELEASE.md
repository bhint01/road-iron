# Seller publication release

The seller publication schema was applied on 2026-11-11. The old single-test-product allowlist is replaced by seller, product tax, and delivery readiness checks. Existing inventory and financial records are preserved.

Validation: mobile/desktop browser, PostgreSQL publication and ownership, and live credential selection checks passed in https://github.com/bhint01/road-iron/actions/runs/43043270285. Existing sandbox shipping, pickup, tax and refund evidence was reused without additional financial transactions.

Live backend repairs: stripe-webhook v16 and original checkout v13 select an existing verified live server key when the legacy variable contains a publishable key. Refund endpoints use the same credential-selection repair. Required webhook events were added to the existing destination, preserving its existing events, URL and signing secret. The temporary OIDC maintenance endpoint was disabled after success. No live payment, transfer, refund or seller account was created for testing.

Release control: marketplace_feature_flags.seller_publication_ready is enabled only after the deployed seller page and read-only checkout health checks pass. The flag's live database value is authoritative. seller_checkout remains independently enforced.

Scope: sellers can confirm ordinary tangible parts and accessories for the supported tax classification. Whole vehicles and special-tax items remain private until the appropriate classification is supported. Pickup requires an actual, seller-confirmed US pickup address for sales tax, without parcel measurements. Calculated shipping requires positive package measurements and a valid origin ZIP. Private drafts remain private until publication is requested. Stripe charges and payouts must be enabled for the seller; no administrator approval is required for eligible parts.
