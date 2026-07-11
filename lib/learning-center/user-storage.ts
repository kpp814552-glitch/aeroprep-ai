/**
 * 用户上传素材系统 —— localStorage 持久化
 * 支持：完整标签校验 / 内容质量检测 / 违规过滤 / AI优化占位
 */

export type UserMaterial = {
  id: string;
  title: string;
  content: string;
  /** 招聘方式：校招 / 社招 */
  recruitType: "" | "校招" | "社招";
  /** 岗位ID */
  role: "" | "pilot" | "dispatcher" | "atc" | "maintenance" | "avionics" | "cabin" | "airport-ops" | "cabin-safety" | "terminal-service";
  /** 内容分类ID */
  category: "" | "questions" | "role-questions" | "star-cases" | "self-intro" | "expression" | "aviation" | "tips";
  /** 是否为优质投稿 */
  isHighQuality: boolean;
  /** 违规标记 */
  isViolation: boolean;
  createdAt: string;
};

const STORAGE_KEY = "aeroprep-user-materials";

// ===== 读取 =====
export function getUserMaterials(): UserMaterial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ===== 标签校验 =====
export type ValidationError = { field: string; message: string };

export function validateMaterial(
  data: Partial<UserMaterial>
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data.title?.trim()) errors.push({ field: "title", message: "标题不能为空" });
  if (!data.content?.trim()) errors.push({ field: "content", message: "内容不能为空" });
  if (data.content && data.content.trim().length < 20)
    errors.push({ field: "content", message: "内容太简短，请补充更多细节（至少20字）" });
  if (!data.recruitType) errors.push({ field: "recruitType", message: "请选择招聘方式" });
  if (!data.role) errors.push({ field: "role", message: "请选择岗位" });
  if (!data.category) errors.push({ field: "category", message: "请选择内容分类" });
  return errors;
}

// ===== 内容质量检测（简单版）=======
const EMPTY_PATTERNS = [
  "吃苦耐劳", "善于沟通", "认真负责", "性格开朗", "团结同事",
  "乐于助人", "勤奋好学", "爱岗敬业", "服从安排", "我一定能做好",
];

export function checkQuality(content: string): { isGood: boolean; suggestions: string[] } {
  const suggestions: string[] = [];
  const lower = content.toLowerCase();

  // 检测空洞关键词
  const foundEmpty = EMPTY_PATTERNS.filter((p) => lower.includes(p));
  if (foundEmpty.length > 1) {
    suggestions.push(`包含过多空泛形容（如${foundEmpty.slice(0, 3).join("、")}），建议替换为具体案例`);
  }

  // 检测是否有民航相关内容
  const aviationKeywords = ["民航", "飞行", "客舱", "机务", "空管", "签派", "航司", "机场", "维修", "适航", "SOP", "CCAR", "CRM", "工卡", "放行", "航班", "模拟机"];
  const hasAviation = aviationKeywords.some((k) => content.includes(k));
  if (!hasAviation) {
    suggestions.push("内容缺少民航行业关键词，建议补充岗位相关的实操细节");
  }

  // 检测是否有具体案例或数据
  const hasSpecific = /\d+/.test(content) || content.includes("有一次") || content.includes("案例") || content.includes("经历");
  if (!hasSpecific) {
    suggestions.push("缺少具体案例或数据支撑，建议加入一次真实经历或操练情境");
  }

  return {
    isGood: suggestions.length === 0,
    suggestions,
  };
}

// ===== 违规过滤 =====
const VIOLATION_KEYWORDS = ["骂", "恶心", "黑幕", "潜规则", "投诉", "举报", "加我微信", "加我QQ", "代考", "作弊"];

export function checkViolation(content: string): { isViolation: boolean; reason?: string } {
  const found = VIOLATION_KEYWORDS.find((k) => content.includes(k));
  if (found) {
    return { isViolation: true, reason: `内容包含敏感词"${found}"，请移除后再提交` };
  }
  return { isViolation: false };
}

// ===== 保存 =====
export function saveUserMaterial(
  data: Omit<UserMaterial, "id" | "createdAt" | "isHighQuality" | "isViolation">
): { success: true; material: UserMaterial } | { success: false; errors: ValidationError[] } {
  // 标签校验
  const tagErrors = validateMaterial(data);
  if (tagErrors.length > 0) return { success: false, errors: tagErrors };

  // 违规过滤
  const violation = checkViolation(data.content);
  if (violation.isViolation) {
    return { success: false, errors: [{ field: "content", message: violation.reason! }] };
  }

  // 质量检测
  const quality = checkQuality(data.content);

  const materials = getUserMaterials();
  const material: UserMaterial = {
    ...data,
    id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    isHighQuality: quality.isGood,
    isViolation: false,
    createdAt: new Date().toISOString(),
  };
  materials.unshift(material);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
  return { success: true, material };
}

// ===== 删除 =====
export function deleteUserMaterial(id: string): void {
  const materials = getUserMaterials().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
}
