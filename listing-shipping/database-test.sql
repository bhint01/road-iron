-- Run inside a transaction; all fixtures and updates are rolled back.
select set_config('roadiron.test_user',gen_random_uuid()::text,true);
select set_config('roadiron.other_user',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,is_anonymous)
 values(current_setting('roadiron.test_user')::uuid,'listing-draft-test@example.invalid',now(),false),
 (current_setting('roadiron.other_user')::uuid,'listing-other-test@example.invalid',now(),false);
insert into public.marketplace_sellers(user_id,display_name)
 values(current_setting('roadiron.test_user')::uuid,'Rollback-only draft test'),
 (current_setting('roadiron.other_user')::uuid,'Rollback-only other test');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('roadiron.test_user'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('roadiron.test_user'),true);
set local role authenticated;
do $test$
declare sid uuid; pickup_id uuid; other_rows integer;
begin
 insert into public.seller_submissions(seller_id,title,category,description,condition,price,shipping_type,publication_requested)
 values(auth.uid(),'Rollback shipping draft','Used Auto Parts','Not a real listing','Used',10,'calculated',false) returning id into sid;
 if not exists(select 1 from public.seller_submissions where id=sid and weight_lbs is null and ship_from_postal_code is null and shipping_type='calculated') then raise exception 'Incomplete shipping draft was not saved'; end if;
 insert into public.seller_submissions(seller_id,title,category,description,condition,price,shipping_type,publication_requested)
 values(auth.uid(),'Rollback pickup listing','Used Auto Parts','Not a real listing','Used',10,'local_pickup',true) returning id into pickup_id;
 update public.seller_submissions set title='Updated pickup draft' where id=pickup_id;
 begin
  insert into public.seller_submissions(seller_id,title,category,price,shipping_type,publication_requested)
  values(current_setting('roadiron.other_user')::uuid,'Not my listing','Used Auto Parts',10,'local_pickup',false);
  raise exception 'Cross-seller insert was allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.seller_submissions set seller_id=current_setting('roadiron.other_user')::uuid where id=sid;
  raise exception 'Ownership reassignment was allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.seller_submissions set weight_lbs=-1 where id=sid;
  raise exception 'Invalid supplied weight was allowed';
 exception when check_violation then null;
 end;
end $test$;
reset role;
do $test$
declare s record; p record;
begin
 for s in select * from public.seller_submissions where seller_id=current_setting('roadiron.test_user')::uuid loop
  select * into p from public.products where id=s.staged_product_id;
  if p.id is null or p.status<>'draft' or p.shipping_type<>s.shipping_type or p.weight_lbs is not null or p.marketplace_commission_rate<>0.08 then raise exception 'Draft staging mismatch'; end if;
 end loop;
 update public.marketplace_sellers set stripe_account_id='acct_rollback_fixture',stripe_charges_enabled=true,stripe_payouts_enabled=true where user_id=current_setting('roadiron.test_user')::uuid;
 if exists(select 1 from public.products where seller_id=current_setting('roadiron.test_user')::uuid and status<>'draft') then raise exception 'Private draft or launch safeguard was bypassed'; end if;
 update public.seller_submissions set weight_lbs=2,length_in=8,width_in=6,height_in=4,ship_from_postal_code='49001'
 where seller_id=current_setting('roadiron.test_user')::uuid and shipping_type='calculated';
 if not exists(select 1 from public.seller_submissions s join public.products p on p.id=s.staged_product_id where s.seller_id=current_setting('roadiron.test_user')::uuid and p.shipping_type='calculated' and p.weight_lbs=2 and p.length_in=8 and p.ship_from_postal_code='49001' and p.status='draft') then raise exception 'Edited shipping draft did not sync'; end if;
 update public.seller_submissions set publication_requested=true where seller_id=current_setting('roadiron.test_user')::uuid;
 if exists(select 1 from public.products where seller_id=current_setting('roadiron.test_user')::uuid and status='active') then raise exception 'Publication guard changed'; end if;
 if has_function_privilege('anon','public.sync_seller_submission_shipping()','execute') or has_function_privilege('authenticated','public.activate_verified_seller_listings()','execute') then raise exception 'Trigger-only functions exposed as RPCs'; end if;
end $test$;
