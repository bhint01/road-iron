import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=(ROOT/'seller.html').read_text()
STUB=r'''window.rows=[];window.saved=[];window.user={id:'seller-test'};
window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:window.user}}),onAuthStateChange:()=>{}},from:(table)=>{
 const query={filters:[],action:'read',payload:null,select(){return this},eq(k,v){this.filters.push([k,v]);return this},order(){return this},insert(x){this.action='insert';this.payload=x;return this},update(x){this.action='update';this.payload=x;return this},async single(){
 if(table==='seller_submissions'){
  if(this.action==='insert'){const x={...this.payload,id:'draft-'+(window.rows.length+1),staged_product_id:'product-'+(window.rows.length+1),status:'pending',created_at:new Date().toISOString()};window.rows.push(x);window.saved.push({...x});return {data:x};}
  const row=window.rows.find(x=>this.filters.every(([k,v])=>x[k]===v));if(!row)return {error:{message:'Not found'}};
  if(this.action==='update'){Object.assign(row,this.payload);window.saved.push({...row});}return {data:row};
 }return {data:null};},async maybeSingle(){return {data:table==='marketplace_sellers'?{status:'approved',stripe_charges_enabled:false,stripe_payouts_enabled:false}:null};},then(resolve,reject){return Promise.resolve({data:table==='seller_submissions'?window.rows:[]}).then(resolve,reject)}};return query;
 }})};'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for width in (320,390,1440):
  page=browser.new_page(viewport={'width':width,'height':900},is_mobile=width<500,has_touch=width<500)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   u=r.request.url
   if u.startswith('https://road-iron.com/seller.html'):r.fulfill(status=200,content_type='text/html',body=HTML)
   elif 'cdn.jsdelivr.net' in u:r.fulfill(status=200,content_type='text/javascript',body=STUB)
   elif 'seller-fulfillment-portal' in u:r.fulfill(status=200,content_type='application/json',body='{"fulfillments":[]}')
   else:raise AssertionError('Unexpected external request '+u)
  page.route('**/*',route)
  page.goto('https://road-iron.com/seller.html');page.locator('#submit').wait_for(state='visible')
  def fill_item():
   page.locator('#title').fill('Classic part draft');page.locator('#description').fill('Accurate item description');page.locator('#condition').select_option(label='Used');page.locator('#price').fill('25')
  fill_item();page.locator('#draftBtn').click();page.wait_for_function('window.saved.length===1')
  data=page.evaluate('window.saved[0]');assert data['publication_requested'] is False and data['shipping_type']=='calculated' and data['weight_lbs'] is None and data['ship_from_postal_code'] is None
  page.get_by_role('button',name='Edit listing',exact=True).first.click();page.wait_for_function('document.getElementById("title").value==="Classic part draft"')
  assert page.locator('#fulfillmentMethod').input_value()=='shipping' and page.locator('#packedDetails').is_visible()
  page.locator('#submitBtn').click();assert page.locator('#message').inner_text().startswith('Add a valid ship-from ZIP');assert page.evaluate('window.saved.length')==1
  page.locator('#weightLbs').fill('-1');page.locator('#draftBtn').click();assert 'must be valid' in page.locator('#message').inner_text();assert page.evaluate('window.saved.length')==1
  for sel,value in [('originZip','49001'),('weightLbs','2'),('lengthIn','8'),('widthIn','6'),('heightIn','4')]:page.locator('#'+sel).fill(value)
  page.locator('#submitBtn').click();page.wait_for_function('window.saved.length===2');page.wait_for_function('document.getElementById("message").textContent.includes("saved privately")')
  assert page.evaluate('window.saved[1].publication_requested') is True
  fill_item();page.locator('#fulfillmentMethod').select_option('pickup');assert page.locator('#packedDetails').is_hidden() and page.locator('#weightLbs').is_disabled()
  page.locator('#submitBtn').click();page.wait_for_function('window.saved.length===3')
  pickup=page.evaluate('window.saved[2]');assert pickup['shipping_type']=='local_pickup' and pickup['publication_requested'] is True
  assert all(pickup[k] is None for k in ('ship_from_postal_code','weight_lbs','length_in','width_in','height_in'))
  page.wait_for_function('document.getElementById("draftBtn").disabled===false')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print(f'PASS {width}px: measurement-free draft, edit retains shipping, calculated shipping validation, supplied-value validation, complete shipping, pickup without parcels, truthful saved status, no overflow')
  page.close()
 browser.close()
