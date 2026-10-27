import { db } from './supabase-client.js';

const $ = selector => document.querySelector(selector);
const requested = new URLSearchParams(location.search).get('mode');
let mode = ['register', 'forgot', 'password'].includes(requested) ? requested : 'login';
const form = $('#auth-form'), email = $('#auth-email'), password = $('#auth-password');
const confirmation = $('#auth-confirm'), submit = $('#auth-submit'), message = $('#message');
let busy = false;
let generation = 0;
const callback = new URL('./index.html', location.href).href;
// Only this fixed, same-site destination is supported; never redirect to user-supplied URLs.
const returnToSeller = new URLSearchParams(location.search).get('next') === 'seller';
const signedInDestination = new URL(returnToSeller ? './seller.html' : './index.html', location.href).href;
if(returnToSeller){
 document.querySelectorAll('a[href^="auth.html"]').forEach(link=>{const url=new URL(link.href);url.searchParams.set('next','seller');link.href=url.href;});
 const continueLink=document.querySelector('#success-links a[href="index.html"]');
 continueLink.href=signedInDestination;continueLink.textContent='Continue to seller dashboard';
}

const showPassword = $('#show-password');
function concealPasswords() {
  showPassword.checked = false;
  password.type = confirmation.type = 'password';
}
showPassword.addEventListener('change', () => {
  password.type = confirmation.type = showPassword.checked ? 'text' : 'password';
});

function configure() {
  concealPasswords();
  const setting = mode === 'password', creating = mode === 'register', forgot = mode === 'forgot';
  $('#heading').textContent = setting ? 'Set your password' : creating ? 'Create account' : forgot ? 'Reset your password' : 'Sign in';
  $('#intro').textContent = setting ? 'Choose a password for your Road Iron Auctions account.' : creating ? 'Create a password, then verify your email to finish registration.' : forgot ? 'We’ll email you a link to choose a new password. Existing customers can also use this to set their first password.' : 'Use your email address and password.';
  $('#email-row').hidden = setting;
  email.disabled = setting;
  $('#password-row').hidden = forgot;
  $('#visibility-row').hidden = forgot;
  password.disabled = forgot;
  password.minLength = creating || setting ? 8 : 0;
  password.autocomplete = creating || setting ? 'new-password' : 'current-password';
  $('#confirm-row').hidden = !(creating || setting);
  confirmation.disabled = !(creating || setting);
  confirmation.required = creating || setting;
  $('#password-help').hidden = !(creating || setting);
  submit.textContent = setting ? 'Save password' : creating ? 'Create account' : forgot ? 'Email reset link' : 'Sign in';
  $('#existing-help').hidden = setting || forgot;
}

async function checkPasswordSession() {
  const current = generation;
  submit.disabled = true;
  try {
    const { data, error } = await db.auth.getUser();
    if (current !== generation) return;
    if (error || !data?.user) {
      message.textContent = 'This link has expired or you are signed out. Use Forgot password? to request a new link.';
      return;
    }
    submit.disabled = false;
  } catch {
    if (current === generation) message.textContent = 'Unable to verify your sign-in. Refresh the page or request a new reset link.';
  }
}

configure();
db.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    generation++;
    mode = 'password';
    form.reset();
    configure();
    message.textContent = '';
    setTimeout(checkPasswordSession, 0);
  } else if (event === 'SIGNED_OUT' && mode === 'password') {
    generation++;
    form.reset();
    concealPasswords();
    submit.disabled = true;
    message.textContent = 'You are signed out. Request a new reset link before saving a password.';
  }
});
if (mode === 'password') checkPasswordSession();

const callbackError = new URLSearchParams(location.hash.slice(1)).get('error_description') || new URLSearchParams(location.search).get('error_description');
if (callbackError || new URLSearchParams(location.search).has('link_error')) {
  message.textContent = 'The email link could not be verified. Request a new link using Forgot password?.';
  history.replaceState(null, '', location.pathname + location.search.split('&error')[0]);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || submit.disabled || !form.reportValidity()) return;
  if ((mode === 'register' || mode === 'password') && password.value !== confirmation.value) {
    message.textContent = 'Passwords do not match. Enter the same password twice.';
    confirmation.focus();
    return;
  }
  busy = true;
  const current = generation;
  submit.disabled = true;
  message.textContent = mode === 'forgot' ? 'Sending reset link…' : 'Please wait…';
  try {
    if (mode === 'forgot') {
      const { error } = await db.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: callback });
      if (error) throw error;
      message.textContent = 'If an account exists for this email, a password reset link has been sent. Open the newest link to choose your password.';
    } else if (mode === 'register') {
      const { data, error } = await db.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: callback } });
      if (error) throw error;
      password.value = confirmation.value = '';
      concealPasswords();
      message.textContent = data?.session ? 'Your account is ready.' : 'Check your email and tap the confirmation link to finish registration. If you already have an account, sign in or use Forgot password?.';
      $('#success-links').hidden = !data?.session;
    } else if (mode === 'password') {
      const { data: verified, error: sessionError } = await db.auth.getUser();
      if (current !== generation) return;
      if (sessionError || !verified?.user) throw new Error('Your session expired. Request a new reset link.');
      const { error } = await db.auth.updateUser({ password: password.value });
      if (error) throw error;
      if (current !== generation) return;
      password.value = confirmation.value = '';
      concealPasswords();
      message.textContent = 'Your password has been saved. You can now sign in with your email and password.';
      form.hidden = true;
      $('#success-links').hidden = false;
    } else {
      const { error } = await db.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      if (error) throw error;
      password.value = '';
      concealPasswords();
      location.assign(signedInDestination);
    }
  } catch (error) {
    if (current === generation) {
      message.textContent = mode === 'login' ? 'Unable to sign in. Check your email and password, confirm your email, or use Forgot password?.' : 'Unable to complete this request: ' + (error.message || 'Please try again.');
    }
  } finally {
    busy = false;
    if (current === generation) submit.disabled = false;
  }
});
