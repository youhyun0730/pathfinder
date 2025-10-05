-- Remove position_x and position_y columns from nodes table
-- Positions are now calculated dynamically using D3 layout algorithm

alter table public.nodes drop column if exists position_x;
alter table public.nodes drop column if exists position_y;
