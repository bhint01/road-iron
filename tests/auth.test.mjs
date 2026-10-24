import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../auctions/auth.js',import.meta.url),'utf8').replace("import { db } from './supabase-client.js';",'');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(mode='', options={}) {
 const nodes={};let handler,event;const calls=[];const redirects=[];let active=options.signedOut?null:{id:'test-user'};
 const document={querySelector:s=>nodes[s]??=( {value:'',disabled:false,hidden:false,textContent:'',focus(){},reportValidity(){return true;},reset(){for(const name of ['#auth-email','#auth-password','#auth-confirm'])if(nodes[name])nodes[name].value='';},addEventListener:(type,fn)=>handler=fn})};
 const auth={getUser:async()=>({data:{user:active},error:null}),onAuthStateChange:fn=>event=fn};
 for(const name of ['resetPasswordForEmail','signUp','updateUser','signInWithPassword'])auth[name]=async(...args)=>{calls.push({name,args});if(options.fail)throw new Error('Request failed');if(options.pending)await options.pending;return {data:{session:null},error:null};};
 const location={href:'https://road-iron.com/auctions/auth.html'+(mode?'?mode='+mode:''),search:mode?'?mode='+mode:'',hash:'',pathname:'/auctions/auth.html',assign:url=>redirects.push(url)};
 vm.runInNewContext(source,{db:{auth},document,location,URL,URLSearchParams,history:{replaceState(){}},setTimeout});await tick();
 return {nodes,calls,redirects,submit:()=>handler({preventDefault(){}}),event:e=>event(e),setUser:u=>active=u};
}
function fill(app){app.nodes['#auth-email'].value=' buyer@example.com ';app.nodes['#auth-password'].value=' test password 123 ';app.nodes['#auth-confirm'].value=' test password 123 ';}
let app=await setup();fill(app);await app.submit();assert.equal(app.calls[0].name,'signInWithPassword');assert.equal(app.calls[0].args[0].email,'buyer@example.com');assert.equal(app.calls[0].args[0].password,' test password 123 ');assert.equal(app.redirects[0],'https://road-iron.com/auctions/index.html');assert.equal(app.nodes['#auth-password'].value,'');
app=await setup('register');fill(app);app.nodes['#auth-confirm'].value='mismatch';await app.submit();assert.equal(app.calls.length,0);assert.match(app.nodes['#message'].textContent,/do not match/);fill(app);await app.submit();assert.equal(app.calls[0].name,'signUp');assert.equal(app.calls[0].args[0].options.emailRedirectTo,'https://road-iron.com/auctions/index.html');assert.match(app.nodes['#message'].textContent,/Check your email/);assert.equal(app.nodes['#auth-password'].value,'');
app=await setup('forgot');fill(app);await app.submit();assert.equal(app.calls[0].name,'resetPasswordForEmail');assert.equal(app.calls[0].args[1].redirectTo,'https://road-iron.com/auctions/index.html');assert.match(app.nodes['#message'].textContent,/If an account exists/);assert.equal(app.nodes['#auth-password'].disabled,true);
app=await setup('password');fill(app);await app.submit();assert.equal(app.calls[0].name,'updateUser');assert.equal(app.calls[0].args[0].password,' test password 123 ');assert.equal(app.nodes['#auth-form'].hidden,true);assert.equal(app.nodes['#auth-password'].value,'');
app=await setup('password',{signedOut:true});fill(app);await app.submit();assert.equal(app.calls.length,0);assert.equal(app.nodes['#auth-submit'].disabled,true);assert.match(app.nodes['#message'].textContent,/expired/);
app=await setup('password');fill(app);app.setUser(null);await app.submit();assert.equal(app.calls.length,0);assert.match(app.nodes['#message'].textContent,/session expired/);
app=await setup('forgot',{fail:true});fill(app);await app.submit();assert.equal(app.nodes['#auth-submit'].disabled,false);assert.match(app.nodes['#message'].textContent,/Unable/);
app=await setup('password');fill(app);app.event('SIGNED_OUT');assert.equal(app.nodes['#auth-password'].value,'');assert.equal(app.nodes['#auth-submit'].disabled,true);
app=await setup('forgot');app.event('PASSWORD_RECOVERY');await tick();assert.equal(app.nodes['#heading'].textContent,'Set your password');assert.equal(app.nodes['#auth-submit'].disabled,false);
let finish;app=await setup('forgot',{pending:new Promise(resolve=>finish=resolve)});fill(app);const first=app.submit();await app.submit();assert.equal(app.calls.length,1);finish();await first;
const auction=fs.readFileSync(new URL('../auctions/auctions.js',import.meta.url),'utf8');assert.ok(!auction.includes('signInWithOtp'));assert.match(auction,/PASSWORD_RECOVERY[\s\S]*?auth.html\?mode=password/);
console.log('PASS: login, signup validation/confirmation, reset callback, password save, expired sessions, errors/retry, sign-out clearing, recovery event, duplicate requests, passwordless removal');
