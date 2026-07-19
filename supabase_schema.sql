-- Script de inicialización para Supabase (PostgreSQL)
-- Copia y ejecuta este script en el editor SQL de tu panel de Supabase.

-- Habilitar extensión uuid-ossp si no está habilitada
create extension if not exists "uuid-ossp";

-- 1. Tabla de Productos
create table if not exists public.products (
    id text primary key,
    code text not null,
    location text not null,
    "expiryDate" text not null,
    "addedDate" text not null,
    "addedBy" text not null,
    observations text,
    status text not null,
    "isDiscarded" boolean not null default false,
    "lastUpdated" text,
    category text,
    quantity integer not null default 1
);

-- 2. Tabla de Logs de Auditoría
create table if not exists public.audit_logs (
    id text primary key,
    "productId" text not null,
    "productCode" text not null,
    action text not null,
    "user" text not null,
    timestamp text not null,
    details text
);

-- 3. Tabla de Usuarios
create table if not exists public.users (
    username text primary key,
    role text not null,
    "passwordHash" text not null,
    "isDeleted" boolean not null default false,
    "lastUpdated" text
);

-- 4. Tabla de Configuración
create table if not exists public.config (
    key text primary key,
    "alertDays" integer not null,
    "alertDaysCarnicos" integer,
    "alertDaysEmbutidos" integer,
    "alertDaysLacteos" integer,
    "alertDaysVegetales" integer,
    "soundEnabled" boolean not null,
    theme text not null
);

-- CONFIGURACIÓN DE SEGURIDAD (RLS)
-- Para que la aplicación pueda sincronizar directamente desde el frontend usando la clave anónima (anonKey),
-- deshabilitamos RLS en estas tablas. 
-- Nota: En un entorno de producción real, se recomienda mantener RLS activado y crear políticas de acceso específicas.

alter table public.products disable row level security;
alter table public.audit_logs disable row level security;
alter table public.users disable row level security;
alter table public.config disable row level security;
