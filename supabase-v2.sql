create table if not exists public.reciter_articles (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_key text not null,
  title text not null default '',
  source_url text not null default '',
  content text not null,
  baseline_recite_counts jsonb not null default '[]'::jsonb,
  baseline_word_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  primary key (user_id, article_key)
);

create table if not exists public.reciter_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  article_key text not null default '',
  practice_date date not null,
  sentence_start integer,
  sentence_end integer,
  word_start integer,
  word_end integer,
  sentence_count integer not null default 0,
  word_count integer not null default 0,
  attempts integer not null default 1,
  correct_indexes jsonb not null default '[]'::jsonb,
  missed_indexes jsonb not null default '[]'::jsonb,
  accuracy integer,
  transcript text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists reciter_articles_user_updated_idx
  on public.reciter_articles (user_id, updated_at desc);
create index if not exists reciter_sessions_user_date_idx
  on public.reciter_sessions (user_id, practice_date desc);
create index if not exists reciter_sessions_user_article_idx
  on public.reciter_sessions (user_id, article_key, created_at);

alter table public.reciter_articles enable row level security;
alter table public.reciter_sessions enable row level security;

drop policy if exists "Users manage own reciter articles" on public.reciter_articles;
create policy "Users manage own reciter articles"
on public.reciter_articles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own reciter sessions" on public.reciter_sessions;
create policy "Users manage own reciter sessions"
on public.reciter_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.reciter_articles to authenticated;
grant select, insert, update, delete on public.reciter_sessions to authenticated;
