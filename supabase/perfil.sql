-- Datos de contacto del portafolio (una sola fila, id = 1)
create table if not exists public.perfil (
  id int primary key default 1 check (id = 1),
  correo text,
  telefono text,
  github text,
  updated_at timestamptz not null default now()
);

-- columnas agregadas después (seguro correrlo en tablas existentes)
alter table public.perfil add column if not exists github text;
-- sección "Sobre mí" del portafolio
alter table public.perfil add column if not exists sobre_titulo text;
alter table public.perfil add column if not exists sobre_texto text;
alter table public.perfil add column if not exists sobre_stack text[];
-- [{ "valor": "25+", "etiqueta": "Proyectos entregados", "auto": null | "anios" | "proyectos" }]
alter table public.perfil add column if not exists sobre_stats jsonb;

alter table public.perfil enable row level security;

drop policy if exists "perfil lectura publica" on public.perfil;
create policy "perfil lectura publica" on public.perfil
  for select using (true);

drop policy if exists "perfil escritura admin" on public.perfil;
create policy "perfil escritura admin" on public.perfil
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.perfil (id) values (1) on conflict (id) do nothing;
