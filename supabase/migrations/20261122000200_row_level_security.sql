-- Row Level Security: cada conta só enxerga e altera o que é seu.

alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;

-- Visitantes (anon) não têm acesso algum.
revoke all on public.conversations from anon;
revoke all on public.messages from anon;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

-- conversations
create policy "conversas: ler as próprias"
  on public.conversations for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "conversas: criar as próprias"
  on public.conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "conversas: editar as próprias"
  on public.conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "conversas: apagar as próprias"
  on public.conversations for delete to authenticated
  using ((select auth.uid()) = user_id);

-- messages: o dono da mensagem precisa ser também o dono da conversa.
create policy "mensagens: ler as próprias"
  on public.messages for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "mensagens: criar nas próprias conversas"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and c.user_id = (select auth.uid())
    )
  );

create policy "mensagens: editar as próprias"
  on public.messages for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and c.user_id = (select auth.uid())
    )
  );

create policy "mensagens: apagar as próprias"
  on public.messages for delete to authenticated
  using ((select auth.uid()) = user_id);
