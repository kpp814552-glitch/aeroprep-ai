-- ============================================================
-- AeroPrep AI — 安全加固（建议执行一次）
-- ------------------------------------------------------------
-- 作用：把"用户能改自己这一行"带来的提权/白嫖路径在数据库层堵死。
--
--   1) is_admin / member_until：普通用户完全不能修改
--      （否则用户把自己改成管理员就能进后台）
--   2) pending_plan：普通用户的"已用次数"只能增加、不能减少，
--      也不允许再增加 legacyGranted（否则把它重置就等于白嫖面试次数）
--
-- 说明：
--   · 服务端使用 service_role key 调用时不受限制（auth.uid() 为空）
--   · 数据库控制台 / SQL Editor 执行也不受限制（auth.uid() 为空）
--   · 管理员账号可以正常维护这些字段
--   · 本脚本幂等，可重复执行
-- 执行位置：Supabase 控制台 → SQL Editor
--
-- 状态：已在生产库（项目 drdzgxncqpydteksedzq）执行过（2026-09-26），
--       本脚本幂等，可重复执行；想确认是否生效可以跑：
--         select tgname from pg_trigger
--         where tgrelid = 'public.users'::regclass and tgname = 'users_guard_row';
--       或者用普通账号试着 PATCH 自己的 is_admin=true：
--         生效后返回值仍是 false，且读不到其他用户的行。
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_user_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_used   integer;
  new_used   integer;
  old_legacy integer;
  new_legacy integer;
BEGIN
  -- service_role / 控制台：不干预
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 管理员：正常维护
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 1) 权限字段：普通用户一律不能动
  NEW.is_admin := OLD.is_admin;
  NEW.member_until := OLD.member_until;

  -- 2) 钱包字段：已用次数只能增，遗留次数不能增
  BEGIN
    old_used   := COALESCE((OLD.pending_plan::jsonb ->> 'used')::int, 0);
    new_used   := COALESCE((NEW.pending_plan::jsonb ->> 'used')::int, 0);
    old_legacy := COALESCE((OLD.pending_plan::jsonb ->> 'legacyGranted')::int, 0);
    new_legacy := COALESCE((NEW.pending_plan::jsonb ->> 'legacyGranted')::int, 0);

    IF new_used < old_used OR new_legacy > old_legacy THEN
      NEW.pending_plan := OLD.pending_plan;
    END IF;
  EXCEPTION WHEN others THEN
    -- 旧格式（非 JSON）不参与校验
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_row ON public.users;
CREATE TRIGGER users_guard_row
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_row();

-- ============================================================
-- 可选（更彻底）：配置了 SUPABASE_SERVICE_ROLE_KEY 之后，
-- 可以让次数钱包只允许服务端写入，用户端一行都改不了：
--
--   REVOKE UPDATE (pending_plan) ON public.users FROM authenticated;
--
-- 注意：执行前请确认应用已经在用 service_role 读写钱包，否则次数无法扣减。
-- ============================================================
