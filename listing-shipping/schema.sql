-- Listing preparation only. Existing checkout/publication guards remain unchanged.
alter table public.seller_submissions
 add column shipping_type text not null default 'calculated'
 check (shipping_type in ('calculated','local_pickup')),
 add column publication_requested boolean not null default true;

-- Retain the explicit pickup choice on legacy submissions without treating an
-- unfinished shipping draft as pickup merely because it has no origin ZIP yet.
update public.seller_submissions set shipping_type='local_pickup'
where shipping_notes like 'Local pickup only.%';

create or replace function public.stage_seller_submission()
returns trigger language plpgsql security definer set search_path='' as $function$
declare p_id uuid; can_publish boolean;
begin
 if new.status <> 'pending' then return new; end if;
 select new.publication_requested and
  (new.shipping_type='local_pickup' or
   (new.weight_lbs>0 and new.length_in>0 and new.width_in>0 and new.height_in>0 and new.ship_from_postal_code ~ '^[0-9]{5}(-[0-9]{4})?$')) and
  exists(select 1 from public.marketplace_sellers m where m.user_id=new.seller_id and m.status='approved' and m.stripe_charges_enabled and m.stripe_payouts_enabled and m.stripe_account_id is not null) and
  exists(select 1 from public.marketplace_feature_flags where name='seller_checkout' and enabled)
 into can_publish;
 insert into public.products(name,category,description,condition,price,quantity,status,seller_id,marketplace_commission_rate,shipping_type,weight_lbs,length_in,width_in,height_in,ship_from_postal_code)
 values(new.title,new.category,coalesce(new.description,''),new.condition,new.price,1,'draft',new.seller_id,0.08,new.shipping_type,new.weight_lbs,new.length_in,new.width_in,new.height_in,new.ship_from_postal_code)
 returning id into p_id;
 update public.seller_submissions set staged_product_id=p_id where id=new.id;
 if can_publish then
  begin
   update public.products set status='active' where id=p_id and seller_id=new.seller_id and status='draft';
  exception when raise_exception then
   -- A store launch safeguard must not discard a seller's successfully saved draft.
   if sqlerrm <> 'Marketplace seller listings are not available for publication until payment and shipping launch checks pass' then raise; end if;
  end;
 end if;
 return new;
end $function$;

create or replace function public.sync_seller_submission_shipping()
returns trigger language plpgsql security definer set search_path='' as $function$
declare can_publish boolean;
begin
 if new.staged_product_id is null then return new; end if;
 update public.products set name=new.title,category=new.category,description=new.description,condition=new.condition,price=new.price,
  shipping_type=new.shipping_type,weight_lbs=new.weight_lbs,length_in=new.length_in,width_in=new.width_in,height_in=new.height_in,ship_from_postal_code=new.ship_from_postal_code
 where id=new.staged_product_id and seller_id=new.seller_id and status='draft';
 select new.status='pending' and new.publication_requested and
  (new.shipping_type='local_pickup' or
   (new.weight_lbs>0 and new.length_in>0 and new.width_in>0 and new.height_in>0 and new.ship_from_postal_code ~ '^[0-9]{5}(-[0-9]{4})?$')) and
  exists(select 1 from public.marketplace_sellers m where m.user_id=new.seller_id and m.status='approved' and m.stripe_charges_enabled and m.stripe_payouts_enabled and m.stripe_account_id is not null) and
  exists(select 1 from public.marketplace_feature_flags where name='seller_checkout' and enabled)
 into can_publish;
 if can_publish then
  begin
   update public.products set status='active' where id=new.staged_product_id and seller_id=new.seller_id and status='draft' and quantity>0;
  exception when raise_exception then
   if sqlerrm <> 'Marketplace seller listings are not available for publication until payment and shipping launch checks pass' then raise; end if;
  end;
 end if;
 return new;
end $function$;
drop trigger sync_seller_submission_shipping_trigger on public.seller_submissions;
create trigger sync_seller_submission_shipping_trigger after update of title,category,description,condition,price,shipping_type,publication_requested,weight_lbs,length_in,width_in,height_in,ship_from_postal_code
 on public.seller_submissions for each row execute function public.sync_seller_submission_shipping();

create or replace function public.activate_verified_seller_listings()
returns trigger language plpgsql security definer set search_path='' as $function$
declare item record;
begin
 if new.status='approved' and coalesce(new.stripe_charges_enabled,false) and coalesce(new.stripe_payouts_enabled,false) and nullif(new.stripe_account_id,'') is not null and exists(select 1 from public.marketplace_feature_flags where name='seller_checkout' and enabled) then
  for item in select p.id from public.products p where p.seller_id=new.user_id and p.status='draft' and p.price>0 and p.quantity>0
   and (p.shipping_type='local_pickup' or (p.weight_lbs>0 and p.length_in>0 and p.width_in>0 and p.height_in>0 and p.ship_from_postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'))
   and not exists(select 1 from public.seller_submissions s where s.staged_product_id=p.id and (not s.publication_requested or s.status<>'pending'))
  loop
   begin
    update public.products set status='active',updated_at=now() where id=item.id and seller_id=new.user_id and status='draft';
   exception when raise_exception then
    if sqlerrm <> 'Marketplace seller listings are not available for publication until payment and shipping launch checks pass' then raise; end if;
   end;
  end loop;
 end if;
 return new;
end $function$;

-- These are trigger-only functions, not customer RPCs. RLS and row ownership
-- continue to govern submission inserts and updates.
revoke execute on function public.stage_seller_submission() from public,anon,authenticated;
revoke execute on function public.sync_seller_submission_shipping() from public,anon,authenticated;
revoke execute on function public.activate_verified_seller_listings() from public,anon,authenticated;
