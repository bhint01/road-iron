// Reuse an existing live server key when the legacy variable contains a public
// browser key. Never accept publishable or sandbox keys in the live webhook.
export function liveWebhookKey(env){
 for(const name of ['STRIPE_SECRET_KEY','STRIPE_CONNECT_SECRET_KEY']){
  const key=env(name)||'';
  if(/^(?:sk|rk)_live_/.test(key))return key;
 }
 throw new Error('Live webhook server credentials are not configured');
}
