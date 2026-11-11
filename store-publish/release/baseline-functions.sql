CREATE OR REPLACE FUNCTION public.activate_verified_seller_listings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status='approved' and coalesce(new.stripe_charges_enabled,false) and coalesce(new.stripe_payouts_enabled,false) and nullif(new.stripe_account_id,'') is not null and exists(select 1 from public.marketplace_feature_flags where name='seller_checkout' and enabled) then
  update public.products set status='active',updated_at=now() where seller_id=new.user_id and status='draft' and price>0 and quantity>0 and weight_lbs>0 and length_in>0 and width_in>0 and height_in>0 and ship_from_postal_code is not null;
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.guard_marketplace_product_publication()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.seller_id is not null and new.status='active' then if not (new.id='be2847f9-2d2b-4695-bff3-a66361890be3'::uuid and new.shipping_type='local_pickup' and new.price=5 and exists (select 1 from public.marketplace_sellers m where m.user_id=new.seller_id and m.status='approved' and m.stripe_charges_enabled and m.stripe_payouts_enabled and m.stripe_account_id is not null)) then raise exception 'Marketplace seller listings are not available for publication until payment and shipping launch checks pass'; end if; end if; return new; end $function$
;
CREATE OR REPLACE FUNCTION public.stage_seller_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p_id uuid; can_publish boolean;
begin
 if new.status <> 'pending' then return new; end if;
 select exists(select 1 from public.marketplace_sellers m where m.user_id=new.seller_id and m.status='approved' and m.stripe_charges_enabled and m.stripe_payouts_enabled and m.stripe_account_id is not null) and exists(select 1 from public.marketplace_feature_flags where name='seller_checkout' and enabled) into can_publish;
 insert into public.products(name,category,description,condition,price,quantity,status,seller_id,marketplace_commission_rate,weight_lbs,length_in,width_in,height_in,ship_from_postal_code)
 values(new.title,new.category,coalesce(new.description,''),new.condition,new.price,1,case when can_publish and new.weight_lbs>0 and new.length_in>0 and new.width_in>0 and new.height_in>0 and new.ship_from_postal_code is not null then 'active' else 'draft' end,new.seller_id,0.08,new.weight_lbs,new.length_in,new.width_in,new.height_in,new.ship_from_postal_code)
 returning id into p_id;
 update public.seller_submissions set staged_product_id=p_id where id=new.id;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.sync_seller_submission_shipping()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.staged_product_id is not null then
 update public.products set weight_lbs=new.weight_lbs,length_in=new.length_in,width_in=new.width_in,height_in=new.height_in,ship_from_postal_code=new.ship_from_postal_code
 where id=new.staged_product_id and seller_id=new.seller_id and status='draft';
 end if;
 return new;
end;$function$
;
