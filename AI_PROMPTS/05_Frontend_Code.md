# F. 前端开发规则

## 适用场景
修改代码、添加功能、修复 Bug、重构时加载此规则。

## 核心原则
1. **修改代码前先分析已有结构** — 读取相关文件后再修改，不盲目重写
2. **保持 TypeScript 类型安全** — 避免使用 `any`，优先使用明确类型
3. **保持现有设计语言的一致性** — 不引入新的视觉风格
4. **遵循 Next.js 最佳实践** — App Router, Server/Client 组件

## React 组件规范
- 使用函数组件 + Hooks
- 组件职责单一，不承担过多逻辑
- 大型组件拆分为子组件
- Custom Hooks 提取共用逻辑
- Props 使用 TypeScript 接口定义

## 状态管理
- 使用 React `useState` / `useReducer` 管理组件状态
- 使用 `useRef` 管理不需要触发渲染的值
- 避免不必要的全局状态
- `localStorage` 用于持久化用户偏好和草稿

## API 调用规范
- 所有 fetch 必须有 `.catch` 或 try/catch 错误处理
- API 路由在 `app/api/` 下按功能组织
- 统一使用 `Response.json()` 返回 JSON
- 错误响应统一格式：`{ error: "错误信息" }`

## useEffect 规范
- 正确填写依赖数组
- 返回清理函数（清除定时器、取消订阅）
- 避免不必要的 useEffect

## 服务端组件安全
- **禁止在服务端组件中直接访问**：`window`、`document`、`localStorage`、`sessionStorage`
- 使用 `typeof window !== "undefined"` 进行守卫
- 需要客户端功能的组件添加 `"use client"` 指令

## 禁止事项
- 禁止使用未经测试的外部依赖
- 禁止将 `console.log` 留在生产代码中（`console.error` 保留）
- 禁止绕过 TypeScript 类型检查
- 禁止在服务器端使用浏览器 API
- 禁止在 `useRef` 初始值中直接调用 `sessionStorage`
