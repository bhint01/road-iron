-- Isolated CI PostgreSQL only, not a production migration.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.marketplace_sellers(user_id uuid primary key references auth.users(id),display_name text not null,status text not null default 'approved',stripe_account_id text,stripe_charges_enabled boolean not null default false,stripe_payouts_enabled boolean not null default false);
create table public.marketplace_feature_flags(name text primary key,enabled boolean);
insert into public.marketplace_feature_flags values('seller_checkout',true);
create table public.products(id uuid primary key default gen_random_uuid(),name text not null,category text not null,description text,condition text,price numeric not null,quantity int not null default 1,status text not null default 'active',seller_id uuid,marketplace_commission_rate numeric not null default 0.08,shipping_type text not null default 'calculated',weight_lbs numeric,length_in numeric,width_in numeric,height_in numeric,ship_from_postal_code text,updated_at timestamptz default now());
create table public.seller_submissions(id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.marketplace_sellers(user_id),title text not null,category text not null,description text not null default '',condition text,price numeric not null check(price>0),status text not null default 'pending' check(status in ('pending','approved','rejected')),shipping_notes text,staged_product_id uuid references public.products(id),weight_lbs numeric,length_in numeric,width_in numeric,height_in numeric,ship_from_postal_code text,created_at timestamptz default now(),constraint seller_shipping_measurements_valid check((weight_lbs is null or weight_lbs>0) and (length_in is null or length_in>0) and (width_in is null or width_in>0) and (height_in is null or height_in>0) and (ship_from_postal_code is null or ship_from_postal_code ~ '^[0-9]{5}(-[0-9]{4})?$')));
alter table public.seller_submissions enable row level security;
alter table public.products enable row level security;
alter table public.marketplace_sellers enable row level security;
create policy seller_profile_read on public.marketplace_sellers for select to authenticated using(user_id=(select auth.uid()));
create policy public_read_active_products on public.products for select to anon,authenticated using(status='active');
create policy seller_create_listing_without_owner_approval on public.seller_submissions for insert to authenticated with check(seller_id=(select auth.uid()) and status='pending' and length(trim(title)) between 3 and 200 and price>0 and exists(select 1 from public.marketplace_sellers m where m.user_id=(select auth.uid()) and m.status='approved'));
create policy seller_submission_read on public.seller_submissions for select to authenticated using(seller_id=(select auth.uid()));
create policy seller_update_own_submissions on public.seller_submissions for update to authenticated using(seller_id=(select auth.uid())) with check(seller_id=(select auth.uid()));
grant select,insert,update,delete on public.seller_submissions to authenticated;
grant select on public.products,public.marketplace_sellers to authenticated;
\i store-publish/release/baseline-functions.sql
create trigger stage_seller_submission_after_insert after insert on public.seller_submissions for each row execute function public.stage_seller_submission();
create trigger sync_seller_submission_shipping_trigger after update of weight_lbs,length_in,width_in,height_in,ship_from_postal_code on public.seller_submissions for each row execute function public.sync_seller_submission_shipping();
create trigger activate_verified_seller_listings_trigger after insert or update of status,stripe_charges_enabled,stripe_payouts_enabled,stripe_account_id on public.marketplace_sellers for each row execute function public.activate_verified_seller_listings();
create trigger guard_marketplace_product_publication_trigger before insert or update of status,seller_id on public.products for each row execute function public.guard_marketplace_product_publication();

create schema storefront_payments;
create table storefront_payments.product_rules(product_id uuid primary key references public.products(id),tax_code text not null,pickup_address jsonb,reviewed_at timestamptz default now());
alter table storefront_payments.product_rules enable row level security;
