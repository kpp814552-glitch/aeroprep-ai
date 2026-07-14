#!/bin/bash
# AeroPrep Health Check — 检查所有页面是否正常
URL="${1:-https://aeroprepaiajay.vercel.app}"
FAIL=0

echo "🔍 AeroPrep Health Check — $(date)"
echo "Target: $URL"
echo ""

pages=(
  "/" "首页"
  "/interview" "AI面试"
  "/interview/session" "面试会话"
  "/interview/report" "面试报告"
  "/chat" "AI优化"
  "/learning" "资料中心"
  "/login" "登录"
  "/profile" "成长中心"
)

for ((i=0; i<${#pages[@]}; i+=2)); do
  path="${pages[i]}"
  label="${pages[i+1]}"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL$path")
  if [ "$code" = "200" ] || [ "$code" = "302" ]; then
    echo "  ✅ $label ($path) → $code"
  else
    echo "  ❌ $label ($path) → $code"
    FAIL=1
  fi
done

echo ""
if [ "$FAIL" = "0" ]; then
  echo "✅ 所有页面正常"
else
  echo "❌ 存在异常页面"
fi
exit $FAIL
