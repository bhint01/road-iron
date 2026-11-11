import assert from 'node:assert/strict';
import {liveWebhookKey} from './webhook-stripe-key.mjs';
const get=values=>name=>values[name];
assert.equal(liveWebhookKey(get({STRIPE_SECRET_KEY:'pk_live_fake',STRIPE_CONNECT_SECRET_KEY:'rk_live_fake'})),'rk_live_fake');
assert.equal(liveWebhookKey(get({STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_CONNECT_SECRET_KEY:'sk_live_fake'})),'sk_live_fake');
assert.equal(liveWebhookKey(get({STRIPE_SECRET_KEY:'rk_live_original',STRIPE_CONNECT_SECRET_KEY:'rk_live_other'})),'rk_live_original');
assert.throws(()=>liveWebhookKey(get({STRIPE_SECRET_KEY:'pk_live_fake'})),/not configured/);
assert.throws(()=>liveWebhookKey(get({STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_CONNECT_SECRET_KEY:'rk_test_fake'})),/not configured/);
console.log('PASS: webhook uses live server credentials; publishable/test keys rejected; valid legacy key preserved.');
