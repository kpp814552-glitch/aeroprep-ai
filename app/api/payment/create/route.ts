import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INTRO_PACK_ID } from "@/lib/member/wallet";
import { loadFirstOrderEligibility, PACKS } from "@/lib/member/wallet-server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const { packId } = await request.json();
    const pack = packId ? PACKS[packId] : undefined;
    if (!pack) return NextResponse.json({ error: "无效的次数包" }, { status: 400 });

    if (packId === INTRO_PACK_ID) {
      const eligibility = await loadFirstOrderEligibility(supabase, user.id);
      if (eligibility.error) {
        return NextResponse.json({ error: "暂时无法校验首单资格，请稍后重试" }, { status: 500 });
      }
      if (!eligibility.eligible) {
        return NextResponse.json({ error: "首单体验已使用，请选择正式套餐" }, { status: 403 });
      }
    }

    // 金额由服务端计算（取自统一的次数包价目表），不信任前端传值
    const amount = pack.amount;
    const credits = pack.credits;
    const orderId = `AP${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return NextResponse.json({ success: true, orderId, amount, credits, packId });
  } catch {
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
