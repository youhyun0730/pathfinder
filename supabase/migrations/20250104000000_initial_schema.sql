-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type node_type as enum ('center', 'current', 'skill', 'cert', 'position', 'goal');

-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Graphs table
create table public.graphs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  version integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Nodes table
create table public.nodes (
  id uuid default uuid_generate_v4() primary key,
  graph_id uuid references public.graphs on delete cascade not null,
  node_type node_type not null,
  label text not null,
  description text not null default '',
  required_exp integer not null default 100,
  current_exp integer not null default 0,
  parent_ids uuid[] not null default array[]::uuid[],
  position_x float not null default 0,
  position_y float not null default 0,
  color text not null default '#4A90E2',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Edges table
create table public.edges (
  id uuid default uuid_generate_v4() primary key,
  graph_id uuid references public.graphs on delete cascade not null,
  from_node_id uuid references public.nodes on delete cascade not null,
  to_node_id uuid references public.nodes on delete cascade not null
);

-- Goals table
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  target_node_id uuid references public.nodes on delete cascade not null,
  recommended_path uuid[] not null default array[]::uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index profiles_id_idx on public.profiles(id);
create index graphs_user_id_idx on public.graphs(user_id);
create index nodes_graph_id_idx on public.nodes(graph_id);
create index edges_graph_id_idx on public.edges(graph_id);
create index edges_from_node_idx on public.edges(from_node_id);
create index edges_to_node_idx on public.edges(to_node_id);
create index goals_user_id_idx on public.goals(user_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.graphs enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.goals enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies for graphs
create policy "Users can view own graphs"
  on public.graphs for select
  using (auth.uid() = user_id);

create policy "Users can insert own graphs"
  on public.graphs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own graphs"
  on public.graphs for update
  using (auth.uid() = user_id);

create policy "Users can delete own graphs"
  on public.graphs for delete
  using (auth.uid() = user_id);

-- RLS Policies for nodes
create policy "Users can view own nodes"
  on public.nodes for select
  using (
    exists (
      select 1 from public.graphs
      where graphs.id = nodes.graph_id
      and graphs.user_id = auth.uid()
    )
  );

create policy "Users can insert own nodes"
  on public.nodes for insert
  with check (
    exists (
      select 1 from public.graphs
      where graphs.id = graph_id
      and graphs.user_id = auth.uid()
    )
  );

create policy "Users can update own nodes"
  on public.nodes for update
  using (
    exists (
      select 1 from public.graphs
      where graphs.id = nodes.graph_id
      and graphs.user_id = auth.uid()
    )
  );

create policy "Users can delete own nodes"
  on public.nodes for delete
  using (
    exists (
      select 1 from public.graphs
      where graphs.id = nodes.graph_id
      and graphs.user_id = auth.uid()
    )
  );

-- RLS Policies for edges
create policy "Users can view own edges"
  on public.edges for select
  using (
    exists (
      select 1 from public.graphs
      where graphs.id = edges.graph_id
      and graphs.user_id = auth.uid()
    )
  );

create policy "Users can insert own edges"
  on public.edges for insert
  with check (
    exists (
      select 1 from public.graphs
      where graphs.id = graph_id
      and graphs.user_id = auth.uid()
    )
  );

create policy "Users can delete own edges"
  on public.edges for delete
  using (
    exists (
      select 1 from public.graphs
      where graphs.id = edges.graph_id
      and graphs.user_id = auth.uid()
    )
  );

-- RLS Policies for goals
create policy "Users can view own goals"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.goals for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger graphs_updated_at
  before update on public.graphs
  for each row execute procedure public.handle_updated_at();
