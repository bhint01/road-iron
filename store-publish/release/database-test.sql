begin;
update public.marketplace_feature_flags set enabled=true where name='seller_publication_ready';
select set_config('roadiron.test_user',gen_random_uuid()::text,true);
select set_config('roadiron.other_user',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(current_setting('roadiron.test_user')::uuid,'test@example.invalid',now(),false),(current_setting('roadiron.other_user')::uuid,'other@example.invalid',now(),false);
insert into public.marketplace_sellers(user_id,display_name) values(current_setting('roadiron.test_user')::uuid,'CI seller'),(current_setting('roadiron.other_user')::uuid,'Other seller');
select set_config('request.jwt.claim.sub',current_setting('roadiron.test_user'),true);
set local role authenticated;
insert into public.seller_submissions(seller_id,title,category,description,price,shipping_type,publication_requested) values(auth.uid(),'Incomplete private draft','Used Auto Parts','CI only',100,'calculated',false);
insert into public.seller_submissions(seller_id,title,category,description,price,shipping_type,publication_requested,tax_code,tax_confirmed,weight_lbs,length_in,width_in,height_in,ship_from_postal_code) values(auth.uid(),'Ready shipping item','Used Auto Parts','CI only',100,'calculated',true,'txcd_99999999',true,2,8,6,4,'49001');
reset role;
do $$begin if exists(select 1 from public.products where seller_id=current_setting('roadiron.test_user')::uuid and status='active') then raise exception 'Unverified seller published';end if;end$$;
update public.marketplace_sellers set stripe_account_id='acct_CI_fixture',stripe_charges_enabled=true,stripe_payouts_enabled=true where user_id=current_setting('roadiron.test_user')::uuid;
do $$begin
 if not exists(select 1 from public.products where name='Ready shipping item' and status='active' and marketplace_commission_rate=0.08) then raise exception 'Verified shipping did not publish';end if;
 if not exists(select 1 from public.products where name='Incomplete private draft' and status='draft') then raise exception 'Private draft published';end if;
end$$;
set local role authenticated;
insert into public.seller_submissions(seller_id,title,category,description,price,shipping_type,publication_requested,tax_code,tax_confirmed,pickup_confirmed,pickup_address) values(auth.uid(),'Ready pickup item','Used Auto Parts','CI only',100,'local_pickup',true,'txcd_99999999',true,true,'{"line1":"123 Test Street","line2":"","city":"Test City","state":"MI","postal_code":"49001","country":"US"}');
insert into public.seller_submissions(seller_id,title,category,price,shipping_type,publication_requested,tax_code,tax_confirmed) values(auth.uid(),'Missing pickup location','Used Auto Parts',100,'local_pickup',true,'txcd_99999999',true);
insert into public.seller_submissions(seller_id,title,category,price,shipping_type,publication_requested) values(auth.uid(),'Missing tax classification','Used Auto Parts',100,'local_pickup',true);
insert into public.seller_submissions(seller_id,title,category,price,shipping_type,publication_requested,tax_code,tax_confirmed) values(auth.uid(),'Missing shipping measurements','Used Auto Parts',100,'calculated',true,'txcd_99999999',true);
do $$begin
 begin
 insert into public.seller_submissions(seller_id,title,category,price) values(current_setting('roadiron.other_user')::uuid,'Cross seller','Used Auto Parts',1);
 raise exception 'Cross seller insert allowed';
 exception when insufficient_privilege then null;end;
 begin
 update public.seller_submissions set seller_id=current_setting('roadiron.other_user')::uuid where seller_id=auth.uid();
 raise exception 'Ownership reassignment allowed';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.products p join storefront_payments.product_rules r on r.product_id=p.id where p.name='Ready pickup item' and p.status='active' and p.shipping_type='local_pickup' and p.weight_lbs is null and r.pickup_address->>'postal_code'='49001') then raise exception 'Pickup without parcels failed';end if;
 if exists(select 1 from public.products where name like 'Missing %' and status='active') then raise exception 'Incomplete item published';end if;
 begin
  update public.products set weight_lbs=null where name='Ready shipping item';
  raise exception 'Invalid calculated shipping allowed';
 exception when raise_exception then
  if sqlerrm<>'Marketplace seller listings are not available for publication until payment and shipping launch checks pass' then raise;end if;
 end;
end$$;
-- A draft becomes live when its missing information is completed, without admin approval.
set local role authenticated;
update public.seller_submissions set weight_lbs=2,length_in=8,width_in=6,height_in=4,ship_from_postal_code='49001',tax_code='txcd_99999999',tax_confirmed=true,publication_requested=true where title='Incomplete private draft' and seller_id=auth.uid();
reset role;
do $$begin if not exists(select 1 from public.products where name='Incomplete private draft' and status='active') then raise exception 'Completed draft did not publish';end if;end$$;
-- Stock finalization must work even if a seller later loses readiness.
update public.marketplace_sellers set stripe_charges_enabled=false where user_id=current_setting('roadiron.test_user')::uuid;
update public.products set quantity=quantity-1,status='sold' where name='Ready pickup item';
update public.seller_submissions set title='Sold item edited' where title='Ready pickup item';
do $$begin if not exists(select 1 from public.products where name='Ready pickup item' and status='sold' and quantity=0) then raise exception 'Sold inventory reactivated';end if;end$$;
rollback;
select 'PASS: shipping/pickup publish without admin; draft/missing fields blocked; seller isolation; sold inventory and 8% commission preserved' as result;
