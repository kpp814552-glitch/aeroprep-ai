-- ============================================================
-- AeroPrep AI — 面试报告跨设备同步
-- ------------------------------------------------------------
-- 作用：把完整的面试报告（评分、逐题分析）和逐题问答存进 interviews 表，
--       这样换设备 / 清浏览器缓存后，成长中心和报告页依然能打开历史报告。
--
-- 注意（"只存报告"）：业务上只写入 report，不写入用户回答原文（turns 列保留但恒为空）。
--       下面最后一行会把历史行里可能残留的问答原文清掉。
--
-- 本脚本幂等，可重复执行。执行位置：Supabase 控制台 → SQL Editor
-- 执行后可以用这个语句确认：
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'interviews'
--     and column_name in ('session_id', 'report', 'turns');
-- ============================================================

alter table public.interviews add column if not exists session_id text;
alter table public.interviews add column if not exists report jsonb;
alter table public.interviews add column if not exists turns jsonb;

-- 只保留报告：清掉历史行里可能残留的问答原文
update public.interviews set turns = null where turns is not null;

-- 按"用户 + 会话"查询 / 去重
create index if not exists interviews_user_session_idx
  on public.interviews (user_id, session_id);

-- 同一场面试重复保存（例如报告重试）时按会话更新，而不是重复插入
drop policy if exists "Users can update own interviews" on public.interviews;
create policy "Users can update own interviews"
  on public.interviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
