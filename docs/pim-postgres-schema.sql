-- Sobag Opt future PIM DB contract.
-- This schema is intentionally not applied by the current Node/VPS runtime.
-- It mirrors the normalized export produced by `npm run export:pim`.

create extension if not exists pg_trgm;

create table if not exists products (
  id text primary key,
  base_sku text not null unique,
  name text not null,
  status text not null check (status in ('draft', 'published', 'hidden', 'archive')),
  hidden boolean not null default false,
  description text not null default '',
  detail_description text not null default '',
  stock text not null default '',
  popular integer not null default 0,
  min_price integer not null default 0,
  max_price integer not null default 0,
  variant_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on products (status);
create index if not exists products_base_sku_trgm_idx on products using gin (base_sku gin_trgm_ops);
create index if not exists products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index if not exists products_description_trgm_idx on products using gin (description gin_trgm_ops);

create table if not exists variants (
  id text primary key,
  product_id text not null references products (id) on delete restrict,
  base_sku text not null,
  sku text not null unique,
  type text not null default '',
  size text not null default '',
  material text not null default '',
  price integer not null check (price > 0),
  qty_step integer not null default 1,
  min_qty integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists variants_product_id_idx on variants (product_id);
create index if not exists variants_base_sku_idx on variants (base_sku);

create table if not exists images (
  id text primary key,
  product_id text not null references products (id) on delete restrict,
  url text not null default '',
  storage_key text not null default '',
  provider text not null default '',
  width integer not null default 0,
  height integer not null default 0,
  mime text not null default '',
  uploaded_at timestamptz,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists images_product_id_idx on images (product_id);
create index if not exists images_storage_key_idx on images (provider, storage_key);

create table if not exists image_variants (
  id text primary key,
  image_id text not null references images (id) on delete cascade,
  url text not null,
  storage_key text not null default '',
  provider text not null default '',
  width integer not null,
  height integer not null,
  mime text not null,
  format text not null check (format in ('webp', 'avif', 'jpg', 'png')),
  uploaded_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists image_variants_image_id_idx on image_variants (image_id);

create table if not exists taxonomies (
  id text primary key,
  type text not null check (type in ('category', 'collection', 'holiday', 'tag')),
  name text not null,
  slug text not null,
  description text not null default '',
  icon text not null default '',
  payload jsonb not null default '{}'::jsonb,
  unique (type, slug)
);

create index if not exists taxonomies_type_idx on taxonomies (type);

create table if not exists product_taxonomies (
  id text primary key,
  product_id text not null references products (id) on delete restrict,
  taxonomy_id text not null references taxonomies (id) on delete restrict,
  type text not null check (type in ('category', 'collection', 'holiday', 'tag')),
  unique (product_id, taxonomy_id)
);

create index if not exists product_taxonomies_product_id_idx on product_taxonomies (product_id);
create index if not exists product_taxonomies_taxonomy_id_idx on product_taxonomies (taxonomy_id);

create table if not exists import_batches (
  id text primary key,
  source text not null default '',
  status text not null default '',
  update_existing boolean not null default false,
  created_at timestamptz,
  created_by text not null default '',
  applied_at timestamptz,
  applied_by text not null default '',
  rejected_at timestamptz,
  rejected_by text not null default '',
  rolled_back_at timestamptz,
  rolled_back_by text not null default '',
  created integer not null default 0,
  skipped integer not null default 0,
  updated integer not null default 0,
  errors integer not null default 0,
  row_count integer not null default 0,
  product_count integer not null default 0,
  snapshot_product_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists import_batches_status_idx on import_batches (status);
create index if not exists import_batches_created_at_idx on import_batches (created_at);

create table if not exists import_batch_rows (
  id text primary key,
  batch_id text not null references import_batches (id) on delete cascade,
  row_number integer not null default 0,
  base_sku text not null default '',
  name text not null default '',
  status text not null default '',
  action text not null default '',
  reason text not null default '',
  warnings text not null default '',
  variant_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists import_batch_rows_batch_id_idx on import_batch_rows (batch_id);
create index if not exists import_batch_rows_action_idx on import_batch_rows (action);

create or replace view public_catalog_products as
select
  p.id,
  p.base_sku,
  p.name,
  p.status,
  p.description,
  p.detail_description,
  p.stock,
  p.popular,
  p.min_price,
  p.max_price,
  p.variant_count,
  array(
    select t.name
    from product_taxonomies pt
    join taxonomies t on t.id = pt.taxonomy_id
    where pt.product_id = p.id and pt.type = 'category'
    order by t.name
  )::text[] as categories,
  array(
    select t.name
    from product_taxonomies pt
    join taxonomies t on t.id = pt.taxonomy_id
    where pt.product_id = p.id and pt.type = 'collection'
    order by t.name
  )::text[] as collections,
  array(
    select t.name
    from product_taxonomies pt
    join taxonomies t on t.id = pt.taxonomy_id
    where pt.product_id = p.id and pt.type = 'holiday'
    order by t.name
  )::text[] as holidays,
  array(
    select t.name
    from product_taxonomies pt
    join taxonomies t on t.id = pt.taxonomy_id
    where pt.product_id = p.id and pt.type = 'tag'
    order by t.name
  )::text[] as tags
  ,
  array(
    select distinct v.type
    from variants v
    where v.product_id = p.id and btrim(v.type) <> ''
    order by v.type
  )::text[] as types,
  array(
    select distinct v.size
    from variants v
    where v.product_id = p.id and btrim(v.size) <> ''
    order by v.size
  )::text[] as sizes,
  array(
    select distinct v.material
    from variants v
    where v.product_id = p.id and btrim(v.material) <> ''
    order by v.material
  )::text[] as materials
from products p
where p.status = 'published' and p.hidden = false;

create or replace view public_catalog_cards as
select
  p.id,
  p.base_sku,
  p.name,
  p.description,
  p.stock,
  p.popular,
  p.min_price,
  p.max_price,
  p.variant_count,
  p.categories,
  p.collections,
  p.holidays,
  p.tags,
  p.types,
  p.sizes,
  p.materials,
  coalesce(p.categories[1], '') as category,
  i.url as image,
  jsonb_build_object(
    'url', i.url,
    'storageKey', i.storage_key,
    'provider', i.provider,
    'width', i.width,
    'height', i.height,
    'mime', i.mime
  ) as image_meta
from public_catalog_products p
left join lateral (
  select *
  from images
  where product_id = p.id
  order by is_primary desc, sort_order asc, id asc
  limit 1
) i on true;
