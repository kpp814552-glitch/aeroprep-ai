-- ============================================================
-- AeroPrep AI — 次数核发所需的数据库策略
-- ------------------------------------------------------------
-- 兑换机制（下单 → 审核 → 到账）的存储结构：
--   1) users.pending_plan       用户自己的账本：已消耗次数 + 自己提交的购买申请
--                               —— 用户/服务端用自己的会话即可写
--   2) site_config.credits:<hash>  管理端核发账本：累计核发次数 + 审核结论
--                               —— 只有管理员能写，所有人可读
-- 因此核发不再需要"管理员修改其他用户的行"，只需要下面这条策略。
--
-- migrations.sql 里应该已经建好了这条策略；如果后台出现
-- 「核发失败：数据库拒绝写入核发账本」，把本文件在
-- Supabase 控制台 → SQL Editor 里执行一次即可。
-- 本脚本是幂等的，可重复执行。
-- ============================================================

-- 管理员判定函数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false);
$$;

-- 所有人可读（用户端要靠它读取自己的核发次数）
DROP POLICY IF EXISTS "Anyone can read site_config" ON public.site_config;
CREATE POLICY "Anyone can read site_config"
  ON public.site_config FOR SELECT
  USING (true);

-- 只有管理员能写核发账本 / 收款码
DROP POLICY IF EXISTS "Only admins can insert site_config" ON public.site_config;
CREATE POLICY "Only admins can insert site_config"
  ON public.site_config FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update site_config" ON public.site_config;
CREATE POLICY "Only admins can update site_config"
  ON public.site_config FOR UPDATE
  USING (public.is_admin());

-- 管理员需要能读到全部用户（订单列表 / 次数管理）
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

-- ============================================================
-- 安全提示（建议在 Vercel 环境变量里配置，而不是靠 SQL 兜底）：
--   目前 public.users.is_admin 这一列，用户可以通过"更新自己的行"改成 true，
--   所以更稳妥的做法是在 Vercel 添加环境变量：
--       ADMIN_EMAILS = 你的管理员邮箱（多个用逗号分隔）
--   配置后，管理端接口会同时校验邮箱白名单，自改 is_admin 将无法进入后台。
-- ============================================================
