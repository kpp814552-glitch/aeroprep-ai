# AeroPrep AI — Prompt 管理体系

## 目录结构
```
AI_PROMPTS/
├── 00_Project_Core.md      # 项目总规则（所有任务必读）
├── 01_AI_Interview.md       # AI面试系统
├── 02_Resume_Optimization.md # 简历优化
├── 03_Content_Center.md     # 资料中心 & 内容生成
├── 04_UI_UX_Design.md       # UI/UX设计
├── 05_Frontend_Code.md      # 前端开发
├── 06_Voice_Digital_Human.md # 语音 & 数字人
├── 07_Product_Strategy.md   # 产品策略
├── 08_Global_AI_Rules.md    # 通用AI行为规则
└── README.md

```

## 使用说明

### 执行不同任务时加载对应的 prompt 文件

| 任务 | 必须加载 | 可选加载 |
|------|---------|---------|
| 修改 AI 面试系统 | 00, 01, 08 | 05 |
| 修改简历优化模块 | 00, 02, 08, 04 | 03 |
| 修改资料中心内容 | 00, 03, 08 | 04 |
| 修改页面 UI 布局 | 00, 04, 08 | 05 |
| 修复代码 Bug | 00, 05, 08 | 相关模块 |
| 添加新功能 | 00, 05, 08, 04 | 相关模块 |
| 修改语音/ASR | 00, 06, 08 | 01, 05 |
| 制定产品策略 | 00, 07, 08 | 04 |

### 规则优先级（冲突时）
1. 05_Frontend_Code.md（代码正确性最优先）
2. 08_Global_AI_Rules.md（通用AI规则）
3. 00_Project_Core.md（项目约束）
4. 04_UI_UX_Design.md（设计约束）
5. 其他特定功能 prompt

### 注意事项
- **00_Project_Core.md** 是所有任务必须最先加载的基础规则
- **08_Global_AI_Rules.md** 定义了 AI 的行为准则（输出格式、修改习惯、错误处理）
- 功能模块之间互不依赖，修改面试系统不需要加载简历优化规则
- 当出现规则冲突时，按上述优先级处理
