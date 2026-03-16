-- Enable Row Level Security
alter default privileges revoke execute on functions from public;

-- Create tables with pantry_ prefix
create table if not exists public.pantry_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity numeric not null,
  unit text not null,
  location text not null,
  category text not null,
  expiry_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.pantry_recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  duration integer not null,
  servings integer not null,
  tags text[] default '{}',
  ingredients jsonb not null,
  steps text[] not null,
  note text,
  image_url text,
  source_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.pantry_menu_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day text not null,
  meal text not null,
  recipe_id uuid references public.pantry_recipes(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, day, meal)
);

-- Create indexes
create index pantry_items_user_id_idx on public.pantry_items(user_id);
create index pantry_items_expiry_date_idx on public.pantry_items(expiry_date);
create index pantry_recipes_user_id_idx on public.pantry_recipes(user_id);
create index pantry_menu_items_user_id_idx on public.pantry_menu_items(user_id);

-- Enable Row Level Security
alter table public.pantry_items enable row level security;
alter table public.pantry_recipes enable row level security;
alter table public.pantry_menu_items enable row level security;

-- Create policies
-- Pantry Items
create policy "Users can view their own pantry items"
  on public.pantry_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pantry items"
  on public.pantry_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pantry items"
  on public.pantry_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own pantry items"
  on public.pantry_items for delete
  using (auth.uid() = user_id);

-- Recipes (pantry_recipes)
create policy "Users can view their own recipes"
  on public.pantry_recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recipes"
  on public.pantry_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
  on public.pantry_recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own recipes"
  on public.pantry_recipes for delete
  using (auth.uid() = user_id);

-- Menu Items (pantry_menu_items)
create policy "Users can view their own menu items"
  on public.pantry_menu_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own menu items"
  on public.pantry_menu_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own menu items"
  on public.pantry_menu_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own menu items"
  on public.pantry_menu_items for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger function (only if it doesn't exist)
create or replace function public.handle_pantry_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger set_pantry_items_updated_at
  before update on public.pantry_items
  for each row
  execute function public.handle_pantry_updated_at();

create trigger set_pantry_recipes_updated_at
  before update on public.pantry_recipes
  for each row
  execute function public.handle_pantry_updated_at();

create trigger set_pantry_menu_items_updated_at
  before update on public.pantry_menu_items
  for each row
  execute function public.handle_pantry_updated_at();

-- Enable realtime
alter publication supabase_realtime add table public.pantry_items;
alter publication supabase_realtime add table public.pantry_recipes;
alter publication supabase_realtime add table public.pantry_menu_items;
