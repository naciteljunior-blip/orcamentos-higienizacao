-- Sistema de orçamentos — esquema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase. Pode ser rodado de novo sem perder dados.

-- ---------------------------------------------------------------------------
-- Configurações da empresa (uma linha por usuário)
-- ---------------------------------------------------------------------------
create table if not exists public.configuracoes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orçamentos. Itens e custos ficam em colunas JSON do próprio orçamento,
-- assim cada orçamento é salvo de uma vez só.
-- ---------------------------------------------------------------------------
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero integer not null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviado', 'aprovado', 'em_andamento', 'concluido', 'recusado')),
  cliente_nome text not null default '',
  cliente_telefone text not null default '',
  cliente_email text not null default '',
  local_tipo text not null default 'apartamento'
    check (local_tipo in ('apartamento', 'predio', 'casa', 'comercio')),
  endereco text not null default '',
  complemento text not null default '',
  data_servico date,
  hora_servico time,
  data_emissao date not null default current_date,
  validade_dias integer not null default 30 check (validade_dias >= 0),
  itens jsonb not null default '[]'::jsonb,
  desconto_tipo text not null default 'valor' check (desconto_tipo in ('valor', 'percentual')),
  desconto numeric(12, 2) not null default 0 check (desconto >= 0),
  custos jsonb not null default '[]'::jsonb,
  pagamento_forma text not null default 'a_vista' check (pagamento_forma in ('a_vista', 'parcelado')),
  pagamento_parcelas integer not null default 1 check (pagamento_parcelas between 1 and 24),
  fotos jsonb not null default '[]'::jsonb,
  pdf_fotos boolean not null default false,
  condicoes text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, numero)
);

-- colunas adicionadas depois da primeira versão (para quem já rodou o arquivo antes)
alter table public.orcamentos add column if not exists pagamento_forma text not null default 'a_vista'
  check (pagamento_forma in ('a_vista', 'parcelado'));
alter table public.orcamentos add column if not exists pagamento_parcelas integer not null default 1
  check (pagamento_parcelas between 1 and 24);
alter table public.orcamentos add column if not exists fotos jsonb not null default '[]'::jsonb;
alter table public.orcamentos add column if not exists pdf_fotos boolean not null default false;

create index if not exists orcamentos_user_data_idx on public.orcamentos (user_id, data_servico);

-- Numeração automática (ORC-0001, ORC-0002, ...): próximo número livre do usuário.
create or replace function public.orcamentos_numerar()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null then
    -- trava por usuário para dois cadastros simultâneos não pegarem o mesmo número
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    select coalesce(max(numero), 0) + 1 into new.numero
      from public.orcamentos where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orcamentos_numerar on public.orcamentos;
create trigger orcamentos_numerar
  before insert on public.orcamentos
  for each row execute function public.orcamentos_numerar();

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists orcamentos_atualizado_em on public.orcamentos;
create trigger orcamentos_atualizado_em
  before update on public.orcamentos
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists configuracoes_atualizado_em on public.configuracoes;
create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Segurança: cada usuário só enxerga e altera os próprios dados.
-- ---------------------------------------------------------------------------
alter table public.configuracoes enable row level security;
alter table public.orcamentos enable row level security;

drop policy if exists "dono" on public.configuracoes;
create policy "dono" on public.configuracoes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "dono" on public.orcamentos;
create policy "dono" on public.orcamentos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Restauração de backup: substitui TODOS os dados do usuário pelo conteúdo
-- do arquivo, numa única transação (se algo falhar, nada é apagado).
-- ---------------------------------------------------------------------------
create or replace function public.restaurar_backup(backup jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'não autenticado';
  end if;

  delete from orcamentos where user_id = uid;

  insert into orcamentos (
    id, user_id, numero, status, cliente_nome, cliente_telefone, cliente_email,
    local_tipo, endereco, complemento, data_servico, hora_servico, data_emissao,
    validade_dias, itens, desconto_tipo, desconto, custos, pagamento_forma, pagamento_parcelas,
    fotos, pdf_fotos, condicoes, observacoes, criado_em, atualizado_em
  )
  select
    coalesce(o.id, gen_random_uuid()), uid, o.numero, coalesce(o.status, 'rascunho'),
    coalesce(o.cliente_nome, ''), coalesce(o.cliente_telefone, ''), coalesce(o.cliente_email, ''),
    coalesce(o.local_tipo, 'apartamento'), coalesce(o.endereco, ''), coalesce(o.complemento, ''),
    o.data_servico, o.hora_servico, coalesce(o.data_emissao, current_date),
    coalesce(o.validade_dias, 30), coalesce(o.itens, '[]'::jsonb),
    coalesce(o.desconto_tipo, 'valor'), coalesce(o.desconto, 0), coalesce(o.custos, '[]'::jsonb),
    coalesce(o.pagamento_forma, 'a_vista'), coalesce(o.pagamento_parcelas, 1),
    coalesce(o.fotos, '[]'::jsonb), coalesce(o.pdf_fotos, false),
    coalesce(o.condicoes, ''), coalesce(o.observacoes, ''),
    coalesce(o.criado_em, now()), coalesce(o.atualizado_em, now())
  from jsonb_populate_recordset(null::orcamentos, coalesce(backup -> 'orcamentos', '[]'::jsonb)) as o;

  if backup ? 'configuracoes' then
    insert into configuracoes (user_id, dados)
    values (uid, coalesce(backup -> 'configuracoes', '{}'::jsonb))
    on conflict (user_id) do update set dados = excluded.dados;
  end if;
end;
$$;

revoke all on function public.restaurar_backup(jsonb) from public, anon;
grant execute on function public.restaurar_backup(jsonb) to authenticated;
