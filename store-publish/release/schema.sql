-- Replace the obsolete one-test-product allowlist with per-listing readiness.
-- No existing listing is published by this migration.
insert into public.marketplace_feature_flags(name,enabled) values('seller_publication_ready',false) on conflict(name) do nothing;
alter table public.seller_submissions
 add column tax_code text check(tax_code is null or tax_code='txcd_99999999'),
 add column tax_confirmed boolean not null default false,
 add column pickup_address jsonb check(pickup_address is null or jsonb_typeof(pickup_address)='object'),
 add column pickup_confirmed boolean not null default false;

create or replace function public.guard_marketplace_product_publication()
returns trigger language plpgsql security definer set search_path='' as $function$
declare eligible boolean;
begin
 if TG_OP='UPDATE' and row(new.status,new.seller_id,new.price,new.shipping_type,new.weight_lbs,new.length_in,new.width_in,new.height_in,new.ship_from_postal_code) is not distinct from row(old.status,old.seller_id,old.price,old.shipping_type,old.weight_lbs,old.length_in,old.width_in,old.height_in,old.ship_from_postal_code) then return new; end if;
 if new.seller_id is null or new.status<>'active' then return new; end if;
 select exists(
  select 1 from public.seller_submissions s
  join public.marketplace_sellers m on m.user_id=s.seller_id
  join storefront_payments.product_rules r on r.product_id=s.staged_product_id
  where s.staged_product_id=new.id and s.seller_id=new.seller_id and s.status='pending' and s.publication_requested
   and m.status='approved' and m.stripe_charges_enabled and m.stripe_payouts_enabled and nullif(m.stripe_account_id,'') is not null
   and s.tax_confirmed and s.tax_code='txcd_99999999' and r.tax_code=s.tax_code and r.reviewed_at is not null
   and new.price>0 and new.quantity>0 and new.shipping_type=s.shipping_type
   and exists(select 1 from public.marketplace_feature_flags where name='seller_checkout' and enabled)
   and exists(select 1 from public.marketplace_feature_flags where name='seller_publication_ready' and enabled)
   and (
    (new.shipping_type='calculated' and new.weight_lbs>0 and new.length_in>0 and new.width_in>0 and new.height_in>0 and new.ship_from_postal_code ~ '^[0-9]{5}(-[0-9]{4})?$')
    or (new.shipping_type='local_pickup' and s.pickup_confirmed and r.pickup_address=s.pickup_address
     and s.pickup_address->>'country'='US'
     and length(trim(s.pickup_address->>'line1')) between 1 and 200
     and length(trim(s.pickup_address->>'city')) between 1 and 100
     and s.pickup_address->>'state'=any(string_to_array('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY',' '))
     and s.pickup_address->>'postal_code' ~ '^[0-9]{5}(-[0-9]{4})?$')
   )
 ) into eligible;
 if not eligible then
  -- Keep the established error contract used by draft staging. Genuine database
  -- errors still propagate instead of being mistaken for an incomplete listing.
  raise exception 'Marketplace seller listings are not available for publication until payment and shipping launch checks pass';
 end if;
 return new;
end $function$;
drop trigger guard_marketplace_product_publication_trigger on public.products;
create trigger guard_marketplace_product_publication_trigger before insert or update on public.products
 for each row execute function public.guard_marketplace_product_publication();
revoke execute on function public.guard_marketplace_product_publication() from public,anon,authenticated;

create function public.apply_seller_listing_tax()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
 if new.staged_product_id is null then return new; end if;
 -- Only the submission owner's unsold product can be changed. Preserve stock,
 -- commission and every historical order/payment snapshot.
 update public.products set status='draft',name=new.title,category=new.category,description=new.description,condition=new.condition,price=new.price,
  shipping_type=new.shipping_type,weight_lbs=new.weight_lbs,length_in=new.length_in,width_in=new.width_in,height_in=new.height_in,ship_from_postal_code=new.ship_from_postal_code
 where id=new.staged_product_id and seller_id=new.seller_id and status in ('draft','active') and quantity>0;
 if not found then return new; end if;
 if new.tax_confirmed and new.tax_code='txcd_99999999' then
  insert into storefront_payments.product_rules(product_id,tax_code,pickup_address,reviewed_at)
  values(new.staged_product_id,new.tax_code,case when new.shipping_type='local_pickup' then new.pickup_address else null end,now())
  on conflict(product_id) do update set tax_code=excluded.tax_code,pickup_address=excluded.pickup_address,reviewed_at=excluded.reviewed_at;
 else
  delete from storefront_payments.product_rules where product_id=new.staged_product_id;
 end if;
 if new.status='pending' and new.publication_requested then
  begin
   update public.products set status='active' where id=new.staged_product_id and seller_id=new.seller_id and status='draft' and quantity>0;
  exception when raise_exception then
   if sqlerrm <> 'Marketplace seller listings are not available for publication until payment and shipping launch checks pass' then raise; end if;
  end;
 end if;
 return new;
end $function$;
create trigger z_apply_seller_listing_tax after insert or update of title,category,description,condition,price,shipping_type,publication_requested,weight_lbs,length_in,width_in,height_in,ship_from_postal_code,tax_code,tax_confirmed,pickup_address,pickup_confirmed,staged_product_id
 on public.seller_submissions for each row execute function public.apply_seller_listing_tax();
revoke execute on function public.apply_seller_listing_tax() from public,anon,authenticated;
