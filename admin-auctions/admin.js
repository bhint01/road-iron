import {createAuctionGallery} from './auction-gallery.js';
import { db } from './supabase-client.js';
import { describeOutcome } from './auction-status.js';

const status = document.querySelector('#status');
const queue = document.querySelector('#queue');
const holder = document.querySelector('#auctions');
const filter = document.querySelector('#filter');
const login = document.querySelector('#login');
const loginForm = document.querySelector('#loginform');
const loginStatus = document.querySelector('#loginstatus');
const signOut = document.querySelector('#signout');
if (db.previewOnly) loginForm.querySelectorAll('input,button').forEach(input => { input.disabled = true; });
const money = cents => (Number(cents) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const displayTime = value => new Date(value).toLocaleString();
const localInput = value => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
let generation = 0;

function clearAccess() {
  generation++;
  queue.hidden = true;
  login.hidden = true;
  signOut.hidden = true;
  holder.replaceChildren();
}

async function load() {
  clearAccess();
  const current = generation;
  status.textContent = 'Checking administrator access…';
  try {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (current !== generation) return;
    if (authError || !user) {
      login.hidden = false;
      status.textContent = 'Sign in with your auction administrator account.';
      return;
    }
    signOut.hidden = false;
    signOut.disabled = Boolean(db.previewOnly);
    const { data: allowed, error: accessError } = await db.rpc('is_auction_admin');
    if (current !== generation) return;
    if (accessError) throw accessError;
    if (!allowed) {
      status.textContent = 'This account does not have auction administrator access.';
      return;
    }
    const { data, error } = await db.rpc('admin_list_auctions', { p_status: filter.value });
    if (current !== generation) return;
    if (error) throw error;
    const reviewed = await Promise.all((data || []).map(async auction => {
      if (auction.status !== 'published' || Date.parse(auction.ends_at) > Date.now()) return auction;
      const { data: result, error: resultError } = await db.rpc('auction_outcome', { p_auction_id: auction.id });
      return { ...auction, result: result?.[0] || null, resultError: Boolean(resultError) };
    }));
    if (current !== generation) return;
    for (const auction of reviewed) holder.append(renderAuction(auction));
    queue.hidden = false;
    status.textContent = data?.length ? `${data.length} auction(s) ready to review.` : 'No auctions match this status.';
  } catch (error) {
    if (current === generation) status.textContent = `Unable to load auctions: ${error.message || 'Please try again.'}`;
  }
}

function renderAuction(auction) {
  const card = element('article');
  card.append(element('h2', auction.title), element('p', auction.description || 'No description supplied.', 'description'));
  const details = element('dl');
  for (const [name, value] of [
    ['Status', auction.status], ['Seller ID', auction.seller_id], ['Opening bid', money(auction.opening_bid_cents)],
    ['Bid increment', money(auction.increment_cents)], ['Reserve', auction.reserve_cents === null ? 'None' : money(auction.reserve_cents)],
    ['Starts', displayTime(auction.starts_at)], ['Closes', displayTime(auction.ends_at)]
  ]) details.append(element('dt', name), element('dd', value));
  card.append(details);
  const closed = auction.status === 'published' && Date.parse(auction.ends_at) <= Date.now();
  if (auction.result) { card.append(element('p', describeOutcome(auction.result))); return card; }
  const gallery=createAuctionGallery(auction);if(gallery)card.append(gallery);

  if (auction.status === 'cancelled') return card;

  const form = element('form');
  const controls = element('fieldset');
  const actions = element('div', undefined, 'actions');
  let starts, ends;
  if (auction.status === 'draft') {
    for (const [labelText, value, assign] of [
      ['Start (your local time)', auction.starts_at, input => { starts = input; }],
      ['Close (your local time)', auction.ends_at, input => { ends = input; }]
    ]) {
      const label = element('label', labelText);
      const input = element('input');
      input.type = 'datetime-local';
      input.required = true;
      input.value = localInput(value);
      assign(input);
      label.append(input);
      actions.append(label);
    }
    const publish = element('button', 'Approve and schedule');
    publish.type = 'submit';
    publish.disabled = Boolean(db.previewOnly);
    actions.append(publish);
  }
  const cancel = element('button', 'Cancel auction', 'secondary');
  cancel.type = 'button';
  cancel.disabled = Boolean(db.previewOnly) || closed;
  if (!closed) actions.append(cancel);
  if (closed) {
    const finish = element('button', 'Record auction result');
    finish.type = 'button';
    finish.disabled = Boolean(db.previewOnly) || auction.resultError;
    finish.addEventListener('click', () => {
      if (!confirm(`Record the final result for “${auction.title}”? This does not collect a payment.`)) return;
      run('admin_finalize_auction', { p_auction_id: auction.id }, 'Auction result recorded. No payment was collected.');
    });
    actions.append(finish);
  }
  controls.append(actions);
  form.append(controls);
  card.append(form);

  async function run(name, parameters, success) {
    controls.disabled = true;
    status.textContent = 'Saving auction decision…';
    try {
      const { error } = await db.rpc(name, parameters);
      if (error) throw error;
      await load();
      if (!queue.hidden) status.textContent = success;
    } catch (error) {
      status.textContent = `Unable to save: ${error.message || 'Please try again.'}`;
      controls.disabled = false;
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!starts || !ends) return;
    const start = new Date(starts.value), end = new Date(ends.value);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.getTime() <= Date.now() || end <= start) {
      status.textContent = 'Choose a future start and a closing time after the start.';
      return;
    }
    if (!confirm(`Approve “${auction.title}” for publication?\nStarts: ${start.toLocaleString()}\nCloses: ${end.toLocaleString()}`)) return;
    run('admin_publish_auction', { p_auction_id: auction.id, p_expected_updated_at: auction.updated_at, p_starts_at: start.toISOString(), p_ends_at: end.toISOString() }, 'Auction approved and scheduled.');
  });
  cancel.addEventListener('click', () => {
    if (!confirm(`Cancel “${auction.title}”? Auctions with bids cannot be cancelled here.`)) return;
    run('admin_cancel_auction', { p_auction_id: auction.id, p_expected_updated_at: auction.updated_at }, 'Auction cancelled.');
  });
  return card;
}

filter.addEventListener('change', load);
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = loginForm.querySelector('button');
  submit.disabled = true;
  loginStatus.textContent = 'Sending sign-in link…';
  try {
    const { error } = await db.auth.signInWithOtp({
      email: document.querySelector('#email').value.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: new URL('/auctions/index.html', location.href).href }
    });
    if (error) throw error;
    loginStatus.textContent = 'Open the sign-in link in your email, then return to this admin app and tap Refresh.';
  } catch (error) {
    loginStatus.textContent = `Unable to sign in: ${error.message || 'Please try again.'}`;
  } finally {
    submit.disabled = false;
  }
});
signOut.addEventListener('click', async () => {
  signOut.disabled = true;
  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    await load();
  } catch (error) {
    status.textContent = `Unable to sign out: ${error.message || 'Please try again.'}`;
  } finally {
    signOut.disabled = false;
  }
});
document.querySelector('#refresh').addEventListener('click', load);
db.auth.onAuthStateChange(() => {
  clearAccess();
  setTimeout(load, 0);
});
load();


