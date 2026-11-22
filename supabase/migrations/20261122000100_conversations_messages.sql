-- Ô de Casa — conversas e mensagens privadas por conta.
-- Apenas texto é salvo. Fotos nunca são gravadas (só a marcação has_image).

create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'Nova conversa' check (char_length(title) between 1 and 120),
  active_mode text not null default 'mae' check (active_mode in ('mae', 'pai')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (char_length(content) between 1 and 20000),
  -- Modo usado para gerar a resposta (assistente) ou ativo quando a pessoa escreveu.
  mode            text not null check (mode in ('mae', 'pai')),
  has_image       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Índices para listar o histórico e abrir uma conversa.
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_user_idx on public.messages (user_id);

-- Mantém updated_at da conversa em dia.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

-- Impede trocar o dono de uma linha depois de criada.
create or replace function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id não pode ser alterado';
  end if;
  if tg_table_name = 'messages' then
    if new.conversation_id is distinct from old.conversation_id then
      raise exception 'conversation_id não pode ser alterado';
    end if;
  end if;
  return new;
end;
$$;

create trigger conversations_owner_immutable
before update on public.conversations
for each row execute function public.prevent_owner_change();

create trigger messages_owner_immutable
before update on public.messages
for each row execute function public.prevent_owner_change();
