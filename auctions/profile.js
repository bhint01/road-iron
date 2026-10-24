import { db } from './supabase-client.js';

const form = document.querySelector('#profile-form');
const fields = document.querySelector('#profile-fields');
const status = document.querySelector('#status');
const help = document.querySelector('#signin-help');
const keys = ['full_name', 'phone', 'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'country'];
let userId = null;
let generation = 0;
let saving = false;

function clearProfile() {
  generation++;
  userId = null;
  form.reset();
  form.hidden = true;
  fields.disabled = true;
}

async function load() {
  clearProfile();
  const current = generation;
  status.textContent = 'Loading your profile…';
  help.hidden = true;
  try {
    const { data, error } = await db.auth.getUser();
    if (current !== generation) return;
    if (error || !data?.user) {
      status.textContent = 'Please sign in to view and edit your profile.';
      help.hidden = false;
      return;
    }
    const user = data.user;
    userId = user.id;
    const profile = user.user_metadata?.road_iron_profile || {};
    document.querySelector('#email').value = user.email || '';
    for (const key of keys) {
      document.querySelector('#' + key).value = typeof profile[key] === 'string' ? profile[key] : '';
    }
    form.hidden = false;
    fields.disabled = false;
    status.textContent = '';
  } catch {
    if (current === generation) {
      status.textContent = 'Unable to load your profile. Refresh the page to try again.';
    }
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!userId || saving || fields.disabled || !form.reportValidity()) return;
  const current = generation;
  const expectedUser = userId;
  const profile = Object.fromEntries(keys.map(key => [key, document.querySelector('#' + key).value.trim()]));
  saving = true;
  fields.disabled = true;
  status.textContent = 'Saving your profile…';
  try {
    const { data: auth, error: authError } = await db.auth.getUser();
    if (current !== generation) return;
    if (authError || auth?.user?.id !== expectedUser) {
      clearProfile();
      help.hidden = false;
      status.textContent = 'Your sign-in has changed. Sign in again before saving.';
      return;
    }
    // Contact details are user-editable data, never authorization or verified shipping data.
    const { error } = await db.auth.updateUser({ data: { road_iron_profile: profile } });
    if (current !== generation) return;
    if (error) throw error;
    const { data: confirmed, error: readError } = await db.auth.getUser();
    if (current !== generation) return;
    if (readError || confirmed?.user?.id !== expectedUser ||
        keys.some(key => confirmed.user.user_metadata?.road_iron_profile?.[key] !== profile[key])) {
      throw new Error('Could not verify saved details.');
    }
    status.textContent = 'Your profile has been saved.';
  } catch {
    if (current === generation) status.textContent = 'Unable to confirm your changes were saved. Please try again.';
  } finally {
    saving = false;
    if (current === generation && userId) fields.disabled = false;
  }
});

db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (userId && session?.user?.id !== userId)) {
    clearProfile();
    help.hidden = false;
    status.textContent = 'Please sign in to view and edit your profile.';
  } else if (event === 'SIGNED_IN' && !userId) {
    setTimeout(load, 0);
  }
});
load();
