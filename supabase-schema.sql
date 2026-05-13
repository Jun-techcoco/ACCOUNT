-- 카드 사용 누계 앱 - 새 테이블 추가
-- 기존 Supabase 프로젝트 → SQL Editor → New query → 붙여넣기 → Run

create table expenses (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  item text not null,
  amount integer not null,
  note text,
  created_at timestamptz default now()
);

alter table expenses disable row level security;

drop policy if exists "public access" on expenses;

create policy "public access" on expenses
  for all
  using (true)
  with check (true);

create index expenses_date_idx on expenses(date desc);
