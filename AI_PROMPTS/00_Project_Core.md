# A. 项目总规则 Project Core

## 适用场景
所有涉及 AeroPrep AI 项目的开发、设计、修改任务时**必须首先加载此规则**。

## 产品定位
面向中国民航专业学生的 AI 求职训练平台。

## 核心价值
- 用 AI 模拟真实航司面试场景
- 帮助学生在校期间就能获得面试经验
- 降低求职信息差，提升民航学生就业竞争力

## 技术栈
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- Supabase（认证 + 数据库）
- DeepSeek API（AI 对话 + 分析）
- 火山引擎 TTS（语音合成）
- Web Speech API（语音识别）
- 部署于 Vercel

## 用户群体
- 中国民航大学等民航院校在校生
- 有民航求职需求的应届毕业生
- 跨专业想进入民航行业的学生
- 已有一定经验但想跳槽的民航从业者

## 开发基本原则
1. **修改代码前先分析已有结构**，不要盲目重写
2. **保持现有设计语言的一致性**，不要引入新的视觉风格
3. **保持 TypeScript 类型安全**，禁止使用 `any` 除非绝对必要
4. **所有 API 调用必须有错误处理**，不允许裸 fetch
5. **所有 useEffect 必须有正确的依赖数组和清理函数**
6. **console.log 不允许出现在生产代码中**，console.error 保留
7. **代码注释：只对复杂的业务逻辑添加注释**，不注释显而易见的代码

## 设计语言一致性
- Apple Glass Morphism：毛玻璃效果、半透明背景、柔和阴影
- 大面积留白，信息层级清晰
- 蓝白渐变主色调（sky-400 到 violet-500）
- 圆角卡片（18px - 24px）
- 克制动画，不使用夸张特效
- 所有交互以 Linear / Apple / Vercel Dashboard 为参考

## 禁止事项
- 禁止使用未经测试的外部依赖
- 禁止绕过 TypeScript 类型检查
- 禁止在工作流中使用步骤条、下一步按钮等流程概念
- 服务端组件禁止直接访问 `window`、`document`、`localStorage`、`sessionStorage`
- 禁止页面全屏 Loading 或刷新

## 文件结构
```
aeroprep-ai-ai-next-js-typescript/
├── app/                     # Next.js App Router 页面
│   ├── api/                 # API 路由
│   ├── chat/                # AI 优化页面
│   ├── interview/           # 面试相关页面
│   ├── learning/            # 资料中心
│   └── profile/             # 成长中心
├── components/              # 组件
│   ├── auth/                # 认证相关
│   ├── chat/                # AI 优化组件
│   ├── home/                # 首页组件
│   ├── interview/           # 面试组件
│   ├── layout/              # 布局组件
│   ├── learning-center/     # 资料中心组件
│   └── profile/             # 成长中心组件
├── lib/                     # 工具库
│   ├── interview/           # 面试逻辑
│   └── learning-center/     # 资料中心逻辑
└── AI_PROMPTS/              # AI 调教词库（本目录）
```
