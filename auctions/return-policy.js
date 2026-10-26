export const RETURN_POLICY_VERSION='auction-returns-2026-10-26';
export const SHIPPING_RETURN_POLICY='Delivered items: report damage, a wrong item, or a material listing mismatch to ROAD IRON within 48 hours after delivery. Change-of-mind sales are final. A report does not guarantee a refund; approved claims are reviewed by ROAD IRON.';
export const PICKUP_RETURN_POLICY='Pickup purchases are final: no returns or refunds. Inspect the item before completing pickup.';
export const REQUIRED_RIGHTS='This policy does not limit rights or remedies required by applicable law.';
export const returnPolicy=method=>(method==='pickup'?PICKUP_RETURN_POLICY:SHIPPING_RETURN_POLICY)+' '+REQUIRED_RIGHTS;
