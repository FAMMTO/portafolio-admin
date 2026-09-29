-- Trayectoria profesional (un registro por puesto)
create table if not exists public.trayectoria (
  id           uuid primary key default gen_random_uuid(),
  puesto       text not null,
  empresa      text not null,
  ubicacion    text,
  modalidad    text check (modalidad in ('PRESENCIAL', 'REMOTO', 'HIBRIDO')),
  fecha_inicio date not null,
  fecha_fin    date, -- null = puesto actual
  descripcion  text,
  funciones    text[] not null default '{}',
  stack        text[] not null default '{}',
  link         text,
  orden        int not null default 0,
  publicado    boolean not null default true,
  created_at   timestamptz not null default now(),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

alter table public.trayectoria enable row level security;

drop policy if exists "trayectoria lectura publica" on public.trayectoria;
create policy "trayectoria lectura publica" on public.trayectoria
  for select using (publicado or public.is_admin());

drop policy if exists "trayectoria escritura admin" on public.trayectoria;
create policy "trayectoria escritura admin" on public.trayectoria
  for all using (public.is_admin()) with check (public.is_admin());
