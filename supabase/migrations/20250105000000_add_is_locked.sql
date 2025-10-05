-- Add is_locked column to nodes table
alter table public.nodes add column if not exists is_locked boolean not null default true;

-- 中心ノードと現在地ノードは最初からアンロック
update public.nodes set is_locked = false where node_type in ('center', 'current');
