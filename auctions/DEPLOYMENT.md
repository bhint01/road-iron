# Auction customer deployment

Prepared from private auction source commit dfe17dbceaeca19037edcc6e53e8d8a850e310ee.
Destination: https://road-iron.com/auctions/

Only the nine browser customer files are copied into this directory. The publishable Supabase key is intentionally public; server credentials, staff screens, SQL, tests and private repository history are excluded. The original store keeps its existing root CNAME, homepage and hosting settings.

Before launch, configure the dedicated auction project's Auth Site URL as https://road-iron.com/auctions/ and allow both exact callback URLs:
- https://road-iron.com/auctions/
- https://road-iron.com/auctions/index.html

Leave the store project's Auth settings unchanged. Staff authentication requires a separately configured staff origin. This shared-domain deployment does not provide browser-origin isolation from the store; all scripts served on road-iron.com must be trusted.

Customer files contain live auction configuration. Publishing them makes sign-in and existing backend bidding RPCs reachable. Payment collection and seller payouts remain unimplemented. Verify email callbacks, sessions and controlled buyer/seller flows before publishing any real auction.

Deploy by merging the customer-file PR into the existing Pages source branch after Auth configuration; no new domain, DNS record, Pages subscription or private-repository Pages deployment is needed. Confirm the existing Pages source is main at the repository root first. Browser/email and deployed URL verification are still pending.
