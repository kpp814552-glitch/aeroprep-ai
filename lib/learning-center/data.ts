import type { LearningCategory } from "./types";

export const learningCategories: LearningCategory[] = [
  {
    id: "questions",
    label: "面试高频问题",
    subcategories: [
      {
        id: "self-intro", label: "自我介绍",
        items: [
          { id: "q-si-1", title: "1分钟自我介绍", frequency: 5, difficulty: "入门",
            content: "【高频指数】★★★★★\n\n【HR考察点】\n- 语言表达能力\n- 自我认知能力\n- 岗位匹配度\n- 逻辑思维\n\n【回答思路】\n1. 基本信息（姓名、学校、专业）\n2. 核心优势（与岗位相关的经历或能力）\n3. 职业动机（为什么选择该岗位/航司）\n4. 结尾展望\n\n【回答模板】\n面试官你好，我叫XXX，来自XXX大学XXX专业。在校期间，我参加了XXX（与岗位相关的经历），这段经历让我深刻理解了XXX（岗位核心能力）。我性格XXX，具有很强的XXX能力。贵航司的XXX（企业文化或服务理念）深深吸引了我，希望能有机会加入贵航司，为旅客提供专业的服务。\n\n【常见误区】\n❌ 背诵简历内容\n❌ 与岗位无关的个人信息过多\n❌ 缺乏职业规划\n❌ 语速过快或过慢\n\n【AI模拟练习】\n建议用手机录音练习，控制在55-65秒之间。" },
        ],
      },
      {
        id: "career-plan", label: "职业规划",
        items: [
          { id: "q-cp-1", title: "你的职业规划是什么", frequency: 5, difficulty: "入门",
            content: "【高频指数】★★★★★\n\n【HR考察点】\n- 职业稳定性\n- 自我驱动能力\n- 对行业的认知深度\n- 成长潜力\n\n【回答思路】\n1. 短期（1-2年）：熟悉岗位，掌握核心技能\n2. 中期（3-5年）：成为业务骨干，承担更多责任\n3. 长期（5年+）：持续学习，为团队创造更大价值\n\n【回答模板】\n短期来说，我希望在入职后尽快熟悉岗位流程和公司文化，通过培训和实操快速提升业务能力。中期来看，我希望在3-5年内成为部门骨干，能够独立处理复杂情况并带教新人。长期而言，我会持续学习行业新知识，努力成长为一名优秀的民航人，为公司的安全运行和服务品质贡献力量。\n\n【注意事项】\n- 规划要具体，不要空泛\n- 与岗位发展方向一致\n- 体现稳定性，不建议说'过渡一下'\n- 展现上进心但不过于激进" },
        ],
      },
      {
        id: "job-cognition", label: "岗位认知",
        items: [
          { id: "q-jc-1", title: "你如何理解这个岗位", frequency: 5, difficulty: "入门",
            content: "【高频指数】★★★★★\n\n【HR考察点】\n- 对岗位的了解程度\n- 是否做过功课\n- 职业动机的真实性\n- 岗位匹配度\n\n【回答思路】\n1. 岗位核心职责（用自己的话概括）\n2. 岗位所需能力（结合自身优势）\n3. 岗位的价值（对航司/旅客的意义）\n4. 表达对该岗位的热情\n\n【优秀示例】\n我认为乘务员不仅是服务者，更是客舱安全的守护者。除了提供热情周到的服务，更重要的是在紧急情况下保护旅客安全。这份工作需要极强的服务意识、沟通能力和情绪管理能力。我性格温和有耐心，并且有多次志愿者服务经历，这些经验让我相信自己能够胜任这份工作。" },
        ],
      },
      {
        id: "motivation", label: "报考动机",
        items: [
          { id: "q-mot-1", title: "为什么选择我们航司", frequency: 5, difficulty: "入门",
            content: "【高频指数】★★★★★\n\n【HR考察点】\n- 对航司的了解\n- 职业动机真实性\n- 文化匹配度\n- 稳定性\n\n【回答思路】\n1. 航司特色（企业文化、品牌定位、服务理念）\n2. 个人与航司的契合点\n3. 职业发展与该航司的匹配度\n4. 真诚表达选择意愿\n\n【回答模板】\n我选择贵航司，首先是因为贵航司XXX（企业文化/品牌特色）深深吸引了我。其次，贵航司在业内XXX（优势或特色），这与我的职业追求非常契合。我了解到贵航司特别重视XXX（员工培养/服务品质等），这让我相信在这里能够获得良好的成长机会。\n\n【容易扣分】\n❌ '因为离家近'\n❌ '因为待遇好'\n❌ '因为亲戚推荐'\n✅ 应展现对航司的了解和认同" },
        ],
      },
      {
        id: "strength-weakness", label: "优缺点",
        items: [
          { id: "q-sw-1", title: "你的优点和缺点是什么", frequency: 4, difficulty: "入门",
            content: "【高频指数】★★★★☆\n\n【HR考察点】\n- 自我认知能力\n- 诚实度\n- 缺点的改进意愿\n- 优势与岗位匹配度\n\n【回答思路】\n优点：\n1. 选择与岗位能力相关的优点\n2. 用具体事例佐证\n3. 突出差异化优势\n\n缺点：\n1. 选择真实但不致命的缺点\n2. 强调正在改进\n3. 避免说'完美主义'等套路\n\n【回答模板（优点）】\n我的优点是沟通能力强。在校期间我担任了学生会外联部部长，经常需要与校内外不同部门沟通协调，这培养了我的沟通能力和团队协作精神。\n\n【回答模板（缺点）】\n我的缺点是在公开演讲时容易紧张。为了改进这一点，我主动参加了演讲社团，每学期至少做两次公开分享。现在虽然还没有完全克服，但已经有了明显改善。" },
        ],
      },
      {
        id: "stress", label: "压力处理",
        items: [
          { id: "q-st-1", title: "遇到压力你如何处理", frequency: 4, difficulty: "中级",
            content: "【高频指数】★★★★☆\n\n【HR考察点】\n- 压力应对策略\n- 情绪管理能力\n- 问题解决能力\n- 韧性\n\n【回答思路】\n1. 承认压力是正常的\n2. 具体应对方法（分解问题、寻求支持、调整心态）\n3. 举例说明\n4. 总结成长\n\n【回答模板】\n面对压力，我通常会采取三步走的方法。首先，停下来分析压力的来源，把大问题分解成小问题。其次，按优先级制定解决方案，必要时主动向同事或上级请教。最后，完成工作后进行复盘，积累经验。之前在一次XXX项目中，时间紧任务重，我通过这个方法顺利完成了任务。" },
        ],
      },
      {
        id: "teamwork", label: "团队合作",
        items: [
          { id: "q-tw-1", title: "分享一次团队合作经历", frequency: 4, difficulty: "入门",
            content: "【高频指数】★★★★☆\n\n【HR考察点】\n- 团队角色认知\n- 沟通协调能力\n- 冲突处理能力\n- 贡献度\n\n【回答模板（STAR）】\nS（情境）：大二时，我参与组织了一场300人的校园招聘会\nT（任务）：负责企业对接和现场统筹\nA（行动）：主动建立沟通群，制定分工表，每天同步进度\nR（结果）：活动顺利完成，获得参与企业好评\n\n【注意事项】\n- 用STAR法则组织\n- 突出个人贡献而非'我们'\n- 选择正面案例\n- 体现团队精神" },
        ],
      },
      {
        id: "conflict", label: "冲突处理",
        items: [
          { id: "q-conf-1", title: "与同事意见不合时怎么办", frequency: 3, difficulty: "中级",
            content: "【高频指数】★★★☆☆\n\n【回答思路】\n1. 先倾听对方观点\n2. 寻找共同目标\n3. 基于事实而非情绪讨论\n4. 必要时请上级协调\n\n【回答模板】\n首先我会认真倾听对方的想法，理解他的出发点和考虑。然后我会基于事实和数据提出自己的观点，寻求共同的目标和解决方案。如果仍无法达成一致，我会建议向上级或更有经验的同事请教，以团队利益为重做出决定。" },
        ],
      },
      {
        id: "service", label: "服务意识",
        items: [
          { id: "q-svc-1", title: "如何理解真情服务", frequency: 5, difficulty: "入门",
            content: "【高频指数】★★★★★\n\n【回答要点】\n- 服务不是流程，是用心\n- 主动发现需求\n- 超出预期的关怀\n- 特殊情况下的服务温度\n\n【优秀示例】\n我认为真情服务就是用心去感受旅客的需求。比如看到带小孩的旅客主动帮忙提行李，看到老人主动引导到登机口，这些都是小事，但能让旅客感受到温暖。真正的服务不是按部就班完成任务，而是主动发现需求、提前解决问题。" },
        ],
      },
      {
        id: "safety", label: "安全意识",
        items: [
          { id: "q-saf-1", title: "如何理解安全与服务的关系", frequency: 5, difficulty: "中级",
            content: "【高频指数】★★★★★\n\n【回答思路】\n- 安全是民航的生命线\n- 服务是在保证安全的基础上\n- 两者并不矛盾，而是相辅相成\n- 任何时候安全优先\n\n【回答模板】\n安全是民航工作的底线和前提。只有在确保安全的前提下，服务才有意义。好的服务应该是在遵守安全规定的基础上，用温暖的方式让旅客理解和配合。遇到安全规定与服务需求的冲突时，我会坚持安全第一的原则，同时耐心向旅客解释，争取理解。" },
        ],
      },
      {
        id: "scenario", label: "情景模拟",
        items: [
          { id: "q-sce-1", title: "旅客因航班延误情绪激动如何处理", frequency: 5, difficulty: "高级",
            content: "【高频指数】★★★★★\n\n【处理步骤】\n1. 保持冷静，倾听旅客诉求\n2. 表达理解和歉意\n3. 提供已知信息和后续安排\n4. 给出可行的解决方案\n5. 持续跟进，不让旅客感觉被忽视\n\n【回答模板】\n首先我会保持微笑和耐心，认真倾听旅客的不满，让他的情绪先得到释放。然后我会真诚地表达歉意，说明延误的原因和目前的处理进展。同时提供力所能及的帮助，比如引导到休息区、提供饮水等。最后，我会告知后续的安排节点，让旅客知道我们在积极处理，并留下联系方式让旅客随时可以找到我。" },
        ],
      },
      {
        id: "open-q", label: "开放性问题",
        items: [
          { id: "q-open-1", title: "你还有什么想问的吗", frequency: 4, difficulty: "入门",
            content: "【高频指数】★★★★☆\n\n【回答策略】\n- 这是加分机会，不要回答'没有了'\n- 问有深度的问题展现思考\n- 避免问薪资、福利等敏感问题\n\n【推荐问题】\n✅ '贵航对新员工的培训体系是怎样的？'\n✅ '这个岗位最需要具备的能力是什么？'\n✅ '团队氛围和晋升机制是怎样的？'\n❌ '薪资待遇如何？'\n❌ '加班多不多？'\n❌ '什么时候能转正？'" },
        ],
      },
      {
        id: "english", label: "英语面试",
        items: [
          { id: "q-eng-1", title: "English Self-Introduction", frequency: 4, difficulty: "中级",
            content: "【高频指数】★★★★☆\n\n【Key Points】\n- Keep it 60-90 seconds\n- Clear pronunciation\n- Natural pace, not too fast\n- Focus on aviation/relevant experience\n\n【Template】\nGood morning/afternoon. My name is XXX, and I graduated from XXX University with a major in XXX. During college, I participated in XXX (relevant experience), which helped me develop XXX skills. I am a XXX (positive trait) person with strong XXX abilities. I am very passionate about civil aviation and eager to contribute to your airline. Thank you for this opportunity.\n\n【Tips】\n- Practice with recording\n- Prepare answers for common follow-ups\n- Know aviation terminology\n- Stay calm if asked unexpected questions" },
        ],
      },
    ],
  },
  {
    id: "role-questions",
    label: "岗位专项题库",
    subcategories: [
      {
        id: "role-pilot", label: "飞行员",
        items: [
          { id: "r-pl-1", title: "飞行训练经历介绍", difficulty: "中级",
            content: "【岗位基础题】\n\n请介绍你的飞行训练经历。\n\n【考察点】\n- 飞行训练阶段和进度\n- 理论学习和实操能力\n- 遇到的困难和应对\n- 职业规划和目标\n\n【回答要点】\n- 说明训练阶段（私照/商照/仪表等）\n- 累计飞行小时\n- 训练中的收获和挑战\n- 下一步训练计划\n\n【无飞行经历的回答方向】\n即使目前没有飞行经历，也可以从理论学习、模拟机体验、航空知识积累等方面说明自己为成为飞行员所做的准备。" },
          { id: "r-pl-2", title: "如何理解CRM（机组资源管理）", difficulty: "高级",
            content: "【专业知识题】\n\n【CRM核心要素】\n1. 沟通（Communication）\n2. 团队协作（Teamwork）\n3. 任务分配（Task分配）\n4. 决策制定（Decision Making）\n5. 情景意识（Situation Awareness）\n\n【回答要点】\nCRM的核心是利用所有可用资源（人力、设备、信息）来确保飞行安全。好的CRM要求机组成员之间信息共享、互相支持、明确分工。比如在进近阶段，机长和副驾驶应该交叉检查、互相提醒，任何一个环节发现异常都要及时报告和确认。" },
        ],
      },
      {
        id: "role-cabin", label: "客舱乘务员",
        items: [
          { id: "r-cb-1", title: "为什么想做乘务员", difficulty: "入门",
            content: "【岗位基础题】\n\n【回答方向】\n- 对服务行业的热爱\n- 与人沟通的乐趣\n- 对民航的向往\n- 帮助他人的成就感\n\n【注意事项】\n❌'因为可以免费旅游'\n❌'因为工作轻松'\n❌'别人的建议'\n✅'热爱服务行业，喜欢与人交流'\n✅'航空工作的严谨性和专业性吸引我'" },
          { id: "r-cb-2", title: "旅客投诉餐食质量如何处理", difficulty: "中级",
            content: "【情景模拟题】\n\n【处理步骤】\n1. 认真倾听，不打断\n2. 表示理解，道歉\n3. 提供可选方案（其他餐食、小食等）\n4. 记录反馈，后续改进\n\n【回答模板】\n首先我会耐心听完旅客的不满，表示理解并真诚道歉。然后了解具体是哪些方面不满意，看看能否提供其他餐食选项或者小食。同时向旅客说明会将意见反馈给相关部门进行改进。最后再次表示歉意，让旅客感受到我们在认真对待他的反馈。" },
        ],
      },
      {
        id: "role-maintenance", label: "机务维修",
        items: [
          { id: "r-mt-1", title: "发现维修记录异常如何处理", difficulty: "中级",
            content: "【行为面试题】\n\n【处理流程】\n1. 立即停止相关工作\n2. 核对维修记录的准确性\n3. 追溯异常原因\n4. 按照维修手册重新确认\n5. 报告上级\n\n【回答要点】\n维修记录是飞机适航的重要依据，发现异常必须高度重视。首先我会停止当前工作，确保不因为错误记录导致后续操作出错。然后核对原始记录，找出异常的原因。如果是记录错误，按照程序更正并确认。如果是实际维修问题，需要重新检查确认状态。整个过程必须严格遵循维修手册，确保万无一失。" },
        ],
      },
    ],
  },
  {
    id: "star-cases",
    label: "STAR案例库",
    subcategories: [
      {
        id: "star-team", label: "团队合作",
        items: [
          { id: "s-tm-1", title: "成功组织校园活动", frequency: 5,
            content: "【STAR拆解】\n\nS（情境）：大二时组织全院迎新晚会，500人规模\nT（任务）：担任总导演，负责节目编排和现场统筹\nA（行动）：\n- 提前两个月组建执行团队，明确分工\n- 每周两次排练，及时解决配合问题\n- 制定应急预案，应对突发情况\nR（结果）：晚会圆满完成，获得全院好评\n\n【可替换模板】\nS：在XXX活动中，我担任XXX角色\nT：负责XXX任务\nA：①XXX ②XXX ③XXX\nR：最终XXX（量化结果更好）" },
        ],
      },
      {
        id: "star-service", label: "服务案例",
        items: [
          { id: "s-sv-1", title: "志愿者服务经历", frequency: 5,
            content: "【STAR拆解】\n\nS（情境）：在火车站担任春运志愿者\nT（任务）：帮助老弱病残旅客进站候车\nA（行动）：\n- 主动巡视候车大厅发现需要帮助的旅客\n- 帮助提行李、引导至重点旅客候车区\n- 与车站工作人员协调提供轮椅服务\nR（结果）：累计服务旅客约200人次，获得优秀志愿者称号\n\n【关键词】\n主动服务、细节关怀、耐心、责任心" },
        ],
      },
      {
        id: "star-pressure", label: "压力处理",
        items: [
          { id: "s-pr-1", title: "应对紧急项目截止日期", frequency: 4,
            content: "【STAR拆解】\n\nS（情境）：期末考试周同时要完成一个团队项目\nT（任务）：必须在三天内完成项目答辩和报告\nA（行动）：\n- 立即与团队成员开会，明确分工\n- 制定详细时间表，按小时拆分任务\n- 每天早晚两次碰头同步进度\n- 主动协调资源解决难题\nR（结果）：项目按时完成并取得优秀成绩\n\n【关键词】\n时间管理、优先级排序、沟通协调、执行力" },
        ],
      },
    ],
  },
  {
    id: "self-intro",
    label: "自我介绍中心",
    subcategories: [
      {
        id: "si-1min", label: "1分钟版",
        items: [
          { id: "si-1m-1", title: "1分钟自我介绍模板（通用）", difficulty: "入门",
            content: "【适用场景】校招初面、群面\n\n【模板】\n面试官你好，我是XXX，来自XXX大学XXX专业。在校期间，我着重培养了XXX能力（与岗位相关）。通过XXX经历（实践/项目/实习），我对民航服务/航空工作有了更深刻的理解。我性格XXX，善于沟通、有耐心，非常渴望加入贵航司。谢谢。\n\n【字数控制】\n约150-180字，语速中等约55-60秒\n\n【Tips】\n- 突出与岗位匹配的核心能力\n- 用一句话概括最有价值的经历\n- 结尾简洁有力" },
        ],
      },
      {
        id: "si-2min", label: "2分钟版",
        items: [
          { id: "si-2m-1", title: "2分钟自我介绍模板（深度版）", difficulty: "初级",
            content: "【适用场景】终面、深度面试\n\n【结构】\n1. 基本信息 + 专业背景（15秒）\n2. 核心经历 + 能力展示（60秒）\n3. 职业动机 + 岗位理解（30秒）\n4. 结尾展望（15秒）\n\n【模板】\n面试官你好，我是XXX，来自XXX大学XXX专业。在校期间，我的专业成绩排名前XX%，并获得了XXX奖项。\n\n在实践方面，我参加了XXX（重要经历），这段经历让我学会了XXX，提升了我XXX的能力。\n\n我对民航行业充满热情，尤其是贵航司的XXX（企业文化）让我深感认同。我相信自己的XXX能力能够很好地胜任这个岗位。\n\n未来我希望在贵航司持续成长，成为一名优秀的民航人。谢谢。" },
        ],
      },
      {
        id: "si-cabin", label: "乘务版",
        items: [
          { id: "si-cb-1", title: "乘务员专用模板", difficulty: "初级",
            content: "【侧重方向】服务意识、沟通能力、形象气质\n\n【模板】\n面试官你好，我是XXX，身高XXXcm，来自XXX学校XXX专业。在校期间，我学习了民航服务礼仪、客舱安全等课程，并参加了XXX（服务相关经历）。这段经历让我深刻理解了服务不仅是流程，更是用心。我性格开朗、有耐心，擅长与不同的人沟通。我梦想成为一名优秀的乘务员，用真诚的服务让每一位旅客感受到温暖。" },
        ],
      },
      {
        id: "si-pilot", label: "飞行版",
        items: [
          { id: "si-pl-1", title: "飞行员专用模板", difficulty: "初级",
            content: "【侧重方向】安全意识、纪律性、学习能力\n\n【模板】\n面试官你好，我是XXX，来自XXX航校/大学XXX专业。目前飞行训练进度为XXX，累计飞行XXX小时，已获得XXX执照。在训练过程中，我深刻体会到飞行安全的重要性，培养了严谨细致的工作作风和良好的团队协作意识。我渴望成为一名优秀的民航飞行员，用专业和责任心守护每一次飞行安全。" },
        ],
      },
      {
        id: "si-english", label: "英文版",
        items: [
          { id: "si-en-1", title: "English Self-Introduction Template", difficulty: "中级",
            content: "【English Version】\n\nGood morning, dear interviewers. My name is XXX, and I graduated from XXX University with a major in XXX.\n\nDuring college, I actively participated in XXX activities, which cultivated my communication skills and team spirit. I have also completed XXX training/courses related to civil aviation.\n\nI am a patient and responsible person with a strong sense of service. The aviation industry has always been my dream, and I am eager to join your airline to provide professional service to passengers.\n\nThank you for your time." },
        ],
      },
      {
        id: "si-tips", label: "写作技巧",
        items: [
          { id: "si-tp-1", title: "自我介绍写作技巧", difficulty: "入门",
            content: "【核心原则】\n1. 目标导向：根据岗位定制内容\n2. 优势聚焦：突出1-2个核心能力\n3. 有据可依：用经历支撑能力描述\n4. 结构清晰：逻辑层次分明\n5. 语言自然：有交流感而非背诵感\n\n【结构公式】\n我是谁 + 我有什么能力（经历佐证）+ 我为什么适合这个岗位 + 我未来想怎样\n\n【常见错误】\n❌ 太多形容词没有实例\n❌ 流水账式叙述经历\n❌ 与应聘岗位无关的信息过多\n❌ 语速过快像背稿\n\n【优化建议】\n- 录音听一遍再修改\n- 请朋友模拟面试官提问\n- 对着镜子练习表情和肢体语言" },
        ],
      },
    ],
  },
  {
    id: "expression",
    label: "回答结构与表达技巧",
    subcategories: [
      {
        id: "exp-star", label: "STAR法则",
        items: [
          { id: "ex-star-1", title: "STAR法则详解与应用", difficulty: "入门",
            content: "【STAR法则】\n\nS - Situation（情境）\n描述事情发生的背景和环境\n\nT - Task（任务）\n你在其中承担的角色和任务\n\nA - Action（行动）\n你具体采取了哪些行动\n\nR - Result（结果）\n最终取得了什么结果\n\n【应用场景】\n行为面试题、经历描述、情景题\n\n【例句】\nS：大二时我参与组织了一场校园招聘会\nT：我负责企业对接工作\nA：我提前两周与企业沟通，制作了详细的时间表和分工表\nR：最终10家企业全部按时到场，活动顺利完成\n\n【常见错误】\n❌ 只描述情境没有具体行动\n❌ 用'我们'代替'我'\n❌ 结果不够具体（最好有数据）" },
        ],
      },
      {
        id: "exp-prep", label: "PREP法则",
        items: [
          { id: "ex-prep-1", title: "PREP表达法", difficulty: "入门",
            content: "【PREP法则】\n\nP - Point（观点）\n先亮出核心观点\n\nR - Reason（理由）\n解释为什么\n\nE - Example（例子）\n举例说明\n\nP - Point（重申观点）\n总结强化\n\n【应用场景】\n开放性问答、观点表述、自我介绍\n\n【例句】\nP：我认为乘务员最重要的能力是情绪管理\nR：因为在航班中会遇到各种突发情况，只有保持冷静才能妥善处理\nE：比如遇到旅客情绪激动时，你先冷静下来才能安抚对方\nP：所以情绪管理是做好乘务工作的基础能力" },
        ],
      },
      {
        id: "exp-pyramid", label: "金字塔表达",
        items: [
          { id: "ex-py-1", title: "金字塔表达原则", difficulty: "中级",
            content: "【金字塔原则】\n\n核心思想：结论先行，以上统下\n\n【结构】\n1. 中心论点（一句话回答）\n2. 分论点1 + 论据\n3. 分论点2 + 论据\n4. 总结\n\n【示例】\n结论：我认为安全是民航服务的首要前提\n\n分论点1：安全是民航业的生命线\n论据：民航法规明确规定安全第一原则\n\n分论点2：服务必须在安全基础上进行\n论据：再好的服务也不能以牺牲安全为代价\n\n总结：在保障安全的前提下提供优质服务" },
        ],
      },
    ],
  },
  {
    id: "aviation",
    label: "民航专业知识",
    subcategories: [
      {
        id: "av-law", label: "民航法规",
        items: [
          { id: "av-law-1", title: "CCAR-91部与121部概述", difficulty: "中级",
            content: "【CCAR-91部】一般运行和飞行规则\n适用于通用航空和部分商业航空运营\n\n【CCAR-121部】大型飞机公共航空运输承运人运行合格审定规则\n适用于民航客货运航空公司\n\n【核心要点】\n- 121部对安全标准要求更高\n- 飞行机组配备、休息期、培训等都有严格规定\n- 了解基本框架即可，面试不考具体条款" },
        ],
      },
      {
        id: "av-basic", label: "航空基础知识",
        items: [
          { id: "av-basic-1", title: "民航基础知识概述", difficulty: "初级",
            content: "【中国民航体系】\n- 民航局（CAAC）：行业管理机构\n- 航空公司：提供运输服务\n- 机场：提供起降和地面服务\n- 空管：提供空中交通管制\n\n【三大航】国航、东航、南航\n【主要民航法规】CCAR系列\n【国际组织】ICAO（国际民航组织）、IATA（国际航空运输协会）" },
        ],
      },
      {
        id: "av-safety", label: "安全管理",
        items: [
          { id: "av-saf-1", title: "安全管理体系（SMS）基础知识", difficulty: "中级",
            content: "【安全管理体系SMS】\n\n四大支柱：\n1. 安全政策（Safety Policy）\n2. 风险管理（Risk Management）\n3. 安全保证（Safety Assurance）\n4. 安全促进（Safety Promotion）\n\n【核心概念】\n- 主动安全：提前识别风险\n- 系统安全：从系统角度分析问题\n- 安全文化：人人重视安全\n\n【面试应用】\n了解SMS基本框架，面试中展现安全意识" },
        ],
      },
      {
        id: "av-service", label: "服务礼仪",
        items: [
          { id: "av-srv-1", title: "民航服务礼仪要点", difficulty: "入门",
            content: "【基本礼仪】\n- 微笑服务：真诚自然的微笑\n- 目光接触：与旅客交流时保持适度目光接触\n- 站姿：挺胸收腹，双手自然下垂或交叉\n- 手势：指引时五指并拢，掌心向上\n- 语言：使用敬语，语速适中\n\n【服务用语】\n- 您好、欢迎登机\n- 请问有什么可以帮您\n- 感谢您的理解和配合\n- 祝您旅途愉快\n\n【禁忌】\n❌ 插兜、抱胸\n❌ 背对旅客说话\n❌ 与同事闲聊\n❌ 使用手机" },
        ],
      },
    ],
  },
  {
    id: "tips",
    label: "面试技巧",
    subcategories: [
      {
        id: "tip-basic", label: "基础技巧",
        items: [
          { id: "tp-basic-1", title: "如何回答不会的问题", difficulty: "入门",
            content: "【策略】\n1. 诚实表态：'这个问题我目前了解还不够深入'\n2. 关联已知：'但我对XXX有一些了解……'\n3. 展示学习意愿：'面试结束后我会认真研究这个问题'\n\n【禁忌】\n❌ 不懂装懂\n❌ 沉默不语\n❌ 转移话题\n\n【话术示例】\n'关于这个问题，我现有的了解还不够全面。不过根据我目前的认知，我认为……（关联相关知识）。后续我会进一步学习和补充，以提升在这方面的专业度。'" },
        ],
      },
      {
        id: "tip-stress", label: "缓解紧张",
        items: [
          { id: "tp-stress-1", title: "面试中如何缓解紧张", difficulty: "入门",
            content: "【紧张原因】\n- 对未知的恐惧\n- 过于在意结果\n- 准备不充分\n\n【缓解方法】\n1. 充分准备：模拟面试至少3次\n2. 呼吸法：面试前深呼吸3次\n3. 正向暗示：'我已经做了充分准备'\n4. 把面试当聊天：面试官也是普通人\n5. 焦点转移：专注问题本身而非'我在被评价'\n\n【面试中】\n- 语速放慢\n- 可以停顿思考，不要说'呃'填充\n- 带一瓶水，紧张时可以喝一口\n- 记住：面试是双向选择" },
        ],
      },
      {
        id: "tip-dress", label: "着装建议",
        items: [
          { id: "tp-dress-1", title: "民航面试着装指南", difficulty: "入门",
            content: "【基本要求】\n干净、整洁、大方、职业\n\n【男生】\n- 西装套装（深色为佳）\n- 白色或浅蓝色衬衫\n- 领带（花色不宜太花哨）\n- 皮鞋（擦亮）\n- 发型整洁\n\n【女生】\n- 职业套装或连衣裙\n- 妆容淡雅\n- 头发整洁（长发建议盘起或扎起）\n- 中跟皮鞋\n- 丝袜（肉色）\n\n【禁忌】\n❌ 过于随意的休闲装\n❌ 浓妆艳抹\n❌ 过多饰品\n❌ 运动鞋\n❌ 香水过浓" },
        ],
      },
      {
        id: "tip-mistakes", label: "常见扣分点",
        items: [
          { id: "tp-mist-1", title: "面试常见扣分行为", difficulty: "入门",
            content: "【面试前】\n❌ 迟到\n❌ 着装不得体\n❌ 手机未静音\n\n【面试中】\n❌ 打断面试官\n❌ 回答过长无重点\n❌ 对前东家/学校负面评价\n❌ 小动作过多（抖腿、玩头发）\n❌ 眼神游移不看面试官\n❌ 语气词过多（嗯、啊、然后）\n\n【回答内容】\n❌ 简历内容背诵\n❌ 空洞套话\n❌ 缺乏具体事例\n❌ 与岗位无关的信息过多\n❌ 对行业/航司缺乏了解" },
        ],
      },
    ],
  },
  {
    id: "records",
    label: "收藏与学习记录",
    subcategories: [
      {
        id: "rec-fav", label: "我的收藏",
        items: [
          { id: "rec-fav-1", title: "收藏的内容会显示在这里", difficulty: "入门",
            content: "点击内容卡片上的☆按钮即可收藏。\n收藏的内容会保存在本地浏览器中。\n清除浏览器缓存会导致收藏记录丢失。" },
        ],
      },
      {
        id: "rec-history", label: "最近学习",
        items: [
          { id: "rec-hist-1", title: "最近浏览的内容会显示在这里", difficulty: "入门",
            content: "你浏览过的内容会自动记录在最近学习中。\n最多保存最近100条浏览记录。" },
        ],
      },
    ],
  },
];
