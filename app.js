const state = {
  completedRound: 0,
  sessionId: null,
  health: null,
  evidence: [],
  proposals: [],
  comparisons: [],
  top3: [],
  selectedName: "",
  problemConfirmed: false,
  iterationRound: 0,
  finalReportReady: false,
  pendingExperiment: null,
  round: null,
  roundResults: [],
  humanIdeas: {},
  qwenSuggestions: {},
  displayedReportRound: 0,
  resultsRevealed: {},
  experimentRunning: false,
  experimentTimer: null,
};

const apiOrigin = window.location.protocol === "file:" ? "http://127.0.0.1:8086" : "";

const loopSteps = [
  ["定义视觉研究问题", "明确 VLA 视觉瓶颈、实验对象与可证伪目标", "Problem"],
  ["Sciverse 证据筛选", "读取完整证据包并呈现四条关键研究依据", "Evidence"],
  ["MoRI 候选生成", "Qwen3.7-Plus 先推导 Motivation，再生成十个包含6个因素的方案", "MoRI"],
  ["CNPE 智选与选题", "成对比较相近方案，由用户确认研究方向", "CNPE"],
  ["具身实验设计", "Qwen 为选定方向生成指标明确的可执行方案", "Experiment"],
  ["反馈迭代与总结", "实验反馈驱动下一轮计划与科研表达", "Feedback"],
];

const defaultValues = {
  problem: "具身VLA模型的视觉问题研究",
  evidence: "Sciverse 证据包共 27 条；重点关注视觉泛化、视觉表征到动作控制的信息瓶颈，以及高维视觉输入的实时推理开销。完整证据包将提交给 Qwen3.7-Plus。",
  constraint: "候选方向必须可证伪、可在具身环境执行，并区分文献事实、模型推断、实验结果与人工判断。",
};

const demoProposals = [
  {
    id: "P-01",
    name: "ViewInvariant-VLA：面向视角变化的几何一致性视觉表征",
    problem: "VLA模型在视角变化下视觉表征不一致导致操作失败",
    motivation: "现有VLA依赖固定视角或校准相机，缺乏几何不变性建模",
    hypothesis: "引入多视角几何一致性约束可提升VLA对视角变化的鲁棒性",
    method: "设计几何一致性损失函数，联合优化多视角视觉编码器，强制特征在视角变换下保持结构不变",
    experiment: "在SIMPLER、LIBERO等基准上对比视角扰动下的成功率与特征对齐度",
    expectedContribution: "提出首个面向VLA的视角不变几何表征框架，显著提升跨视角泛化能力",
  },
  {
    id: "P-02",
    name: "AppearanceGuard-VLA：视觉外观不变的双通路感知模型",
    problem: "光照、纹理等外观变化导致VLA视觉感知失效",
    motivation: "现有VLA未分离语义与外观特征，易受干扰",
    hypothesis: "双通路架构可解耦语义与外观信息，提升外观鲁棒性",
    method: "构建语义通路与外观通路并行编码，通过对抗训练抑制外观通路对动作的影响",
    experiment: "在光照/纹理扰动数据集上评估动作预测稳定性与成功率",
    expectedContribution: "提出外观不变双通路感知机制，为VLA提供抗干扰视觉输入",
  },
  {
    id: "P-03",
    name: "ObjectRel-VLA：基于机器人—目标相对关系的对象中心视觉表示",
    problem: "VLA模型对物体绝对位置敏感，缺乏相对空间关系建模",
    motivation: "现有VLA多采用全局图像特征，忽略机器人-目标相对几何",
    hypothesis: "以机器人为参考系的对象中心表征可提升空间泛化性",
    method: "构建机器人-目标相对坐标编码，融合对象中心注意力机制",
    experiment: "在跨位置、跨机器人形态任务中评估泛化性能",
    expectedContribution: "提出相对关系驱动的对象中心视觉表示，增强VLA空间泛化能力",
  },
  {
    id: "P-04",
    name: "FoveaVLA：任务驱动的粗到细动态视觉分辨率机制",
    problem: "VLA模型固定分辨率导致计算冗余与细节丢失并存",
    motivation: "现有VLA缺乏任务自适应的视觉分辨率调整能力",
    hypothesis: "任务驱动的动态分辨率机制可平衡精度与效率",
    method: "设计粗到细注意力模块，根据任务难度动态分配高分辨率区域",
    experiment: "在精细操作与导航任务中对比推理速度与成功率",
    expectedContribution: "提出任务驱动的动态视觉分辨率机制，实现精度-效率帕累托优化",
  },
  {
    id: "P-05",
    name: "EntropyPrune-VLA：基于视觉信息熵的自适应 Token 保留",
    problem: "VLA模型视觉Token冗余导致推理延迟高",
    motivation: "现有VLA未区分视觉Token信息量，全量计算效率低",
    hypothesis: "基于信息熵的Token剪枝可保留关键视觉信息同时加速推理",
    method: "计算视觉Token信息熵，动态保留高熵Token，剪枝低熵冗余",
    experiment: "在边缘设备上评估推理延迟、能耗与任务成功率",
    expectedContribution: "提出无训练的信息熵剪枝方法，实现VLA实时部署",
  },
  {
    id: "P-06",
    name: "Visual2Action Bridge：解除视觉表征到连续动作之间的信息瓶颈",
    problem: "VLA模型视觉特征到动作映射存在信息瓶颈，限制精细控制",
    motivation: "现有VLA直接离散化动作或简单附加动作头，丢失连续控制信息",
    hypothesis: "设计桥接模块可缓解视觉-动作信息瓶颈",
    method: "引入连续动作流匹配解码器，结合视觉特征进行渐进式动作生成",
    experiment: "在精细操作任务中评估动作精度与成功率",
    expectedContribution: "提出视觉-动作桥接架构，提升VLA精细控制能力",
  },
  {
    id: "P-07",
    name: "VisuoTactile-VLA：视觉不确定场景下的视觉—触觉动态融合",
    problem: "视觉遮挡或模糊时VLA模型操作失败",
    motivation: "现有VLA缺乏触觉反馈，无法应对视觉不确定场景",
    hypothesis: "动态融合视觉与触觉信息可提升不确定场景鲁棒性",
    method: "设计跨模态注意力融合模块，根据视觉置信度动态调整触觉权重",
    experiment: "在遮挡、模糊等视觉不确定场景中评估操作成功率",
    expectedContribution: "提出视觉-触觉动态融合机制，增强VLA在感知受限场景的鲁棒性",
  },
  {
    id: "P-08",
    name: "VisualMemory-VLA：面向遮挡与动态场景的持续视觉记忆",
    problem: "VLA模型缺乏持续视觉记忆，遮挡后无法恢复操作",
    motivation: "现有VLA仅依赖当前帧，缺乏时序视觉记忆能力",
    hypothesis: "引入持续视觉记忆可提升遮挡与动态场景下的操作连续性",
    method: "设计双层循环查询记忆模块，存储并检索历史视觉特征",
    experiment: "在遮挡恢复、动态目标跟踪任务中评估成功率",
    expectedContribution: "提出面向VLA的持续视觉记忆机制，提升长时程操作鲁棒性",
  },
  {
    id: "P-09",
    name: "CalibFree-VLA：面向未知相机位姿的自校准 VLA",
    problem: "VLA模型依赖精确相机标定，未知位姿下性能下降",
    motivation: "现有VLA假设相机位姿已知，限制真实场景部署",
    hypothesis: "自校准机制可使VLA适应未知相机位姿",
    method: "设计位姿估计与视觉特征联合优化模块，在线估计相机外参",
    experiment: "在随机相机位姿下评估操作成功率与位姿估计精度",
    expectedContribution: "提出无标定VLA框架，降低真实场景部署门槛",
  },
  {
    id: "P-10",
    name: "Failure-Driven Visual Curriculum：由失败反馈驱动的视觉鲁棒性课程学习",
    problem: "VLA模型在训练分布外视觉条件下泛化能力差",
    motivation: "现有VLA训练数据视觉变化有限，缺乏针对性鲁棒性训练",
    hypothesis: "由失败反馈驱动的课程学习可逐步提升视觉鲁棒性",
    method: "根据失败案例自动调整视觉扰动难度，构建渐进式课程训练",
    experiment: "在多种视觉扰动条件下评估泛化成功率",
    expectedContribution: "提出失败驱动的课程学习框架，系统性提升VLA视觉鲁棒性",
  },
];

const demoTop3 = [
  {
    rank: 1,
    name: demoProposals[0].name,
    reason: "该方向聚焦 VLA 模型在相机视角变化条件下性能显著退化的问题，研究如何通过机器人中心坐标系下的几何对齐与关系建模，削弱视觉表征对二维像素位置和固定相机配置的依赖。核心目标是在保持原有视觉语义能力的基础上，构建对视角变化更稳定的任务相关表示，从而提升模型在未见相机位姿和复杂视觉扰动条件下的操作泛化能力。现有综述已将视角变化、背景变化、光照扰动和物体位置变化列为影响 VLA 视觉泛化的重要因素。",
  },
  {
    rank: 2,
    name: demoProposals[5].name,
    reason: "该方向针对现有 VLA 中视觉表征向低层动作控制传递过程中可能存在的信息压缩与控制精度损失问题，研究从多尺度视觉特征到连续机器人动作的结构化跨模态映射机制。重点探索以动作查询、跨注意力和连续动作解码等方式，使平移、旋转、夹爪状态和接触控制等不同动作维度能够主动提取与自身相关的视觉信息，从而提升 VLA 在插入、精确放置等高精度操作任务中的控制能力。相关研究已指出，简单动作头或离散动作 token 会形成信息瓶颈，并限制细粒度数值控制。",
  },
  {
    rank: 3,
    name: demoProposals[9].name,
    reason: "该方向面向 VLA 在背景、光照、视角、遮挡和物体位置变化下鲁棒性不足的问题，研究利用机器人真实交互结果反向驱动训练数据分布调整的方法。其核心是构建“策略执行—失败识别—视觉因素归因—扰动分布更新—再训练”的闭环学习机制，根据当前模型在不同视觉条件下暴露出的薄弱环节，自适应增加相应难例和视觉扰动，使训练过程由静态随机增强转变为基于任务失败的目标导向课程学习。现有研究已确认多类视觉变化会显著影响 VLA 的任务成功率，并已有跨域训练和合成数据等方法尝试改善该问题。",
  },
];

const demoExperimentPlan = {
  objective: "在不进行模型训练、不加载训练数据的前提下，验证规则化 Visual2Action Bridge 能否把视觉目标稳定地转换为连续机械臂动作，并优于直接映射基线。",
  environment: "MuJoCo 3.x 与 Panda 7 自由度机械臂；任务由场景 XML、目标物体、目标区域和成功条件共同配置，可替换为到达、推移、抓取放置或精确对准等轻量操作任务，不绑定单一任务。",
  metrics: [
    "任务成功率（Success Rate）",
    "终点位置误差（cm）",
    "动作平滑度（相邻控制量变化均值）",
    "单步计算耗时（ms）",
  ],
  procedure: [
    "步骤 1｜配置任务：在 MuJoCo 场景中加载 Panda 机械臂，通过参数指定目标物体、目标位姿和成功阈值；默认可选到达、推移、抓取放置或精确对准，单次仅运行一个任务。",
    "步骤 2｜读取视觉观测：固定相机输出 256×256 RGB、深度与分割图；利用分割掩码取得目标像素中心，用深度值和相机内参反投影为三维目标坐标。",
    "步骤 3｜建立基线组：直接把三维目标误差乘固定比例系数，得到末端执行器的笛卡尔位置增量；夹爪仅依据距离阈值开合，不使用视觉历史或平滑处理。",
    "步骤 4｜建立 Bridge 组：规则化 Visual2Action Bridge 同时读取目标位置、深度变化和末端相对位姿，分别生成平移、姿态与夹爪三个动作分量，再通过限幅与指数平滑合成为连续动作；所有权重固定，不进行模型训练。",
    "步骤 5｜执行控制：使用阻尼最小二乘逆运动学把笛卡尔增量转换为 Panda 关节目标，再由 MuJoCo 位置控制器执行；控制频率设为 20 Hz，每个 episode 最多 300 个仿真步。",
    "步骤 6｜运行对照：固定 20 个随机初始状态和随机种子，基线组与 Bridge 组分别运行相同的 20 个 episode；只进行在线推理，不加载训练数据。",
    "步骤 7｜记录指标：逐回合保存任务是否成功、终点位置误差、相邻控制量变化均值和单步计算耗时；失败时额外记录目标丢失、超时、碰撞或动作振荡原因。",
    "步骤 8｜输出结论：汇总两组均值和成功次数；若 Bridge 组成功率更高、终点误差更低且单步耗时仍低于 10 ms，则认为规则化桥接在当前可配置任务上有效。",
  ],
  demoResults: [
    "Demo 演示结果｜成功率：基线组 13/20（65%），Bridge 组 17/20（85%）",
    "Demo 演示结果｜终点位置误差：基线组 2.8 cm，Bridge 组 1.5 cm",
    "Demo 演示结果｜动作平滑度：基线组 0.41，Bridge 组 0.24（越低越平滑）",
    "Demo 演示结果｜单步计算耗时：基线组 3.7 ms，Bridge 组 5.2 ms",
  ],
  stopConditions: [
    "基线组与 Bridge 组均完成 20 个 episode。",
    "任一 episode 达到成功条件或运行满 300 个仿真步。",
    "出现模型加载失败、关节越界或连续 20 步严重碰撞时终止当前回合并记录。",
  ],
  expectedFailureModes: [
    "分割掩码短暂丢失，使三维目标坐标无法更新。",
    "逆运动学接近奇异位形，导致关节增量过大。",
    "固定桥接权重在任务切换后不匹配，需要调整限幅或平滑系数。",
  ],
};

const demoIterationRounds = [
  {
    round: 1,
    label: "初始方案",
    title: "直接几何桥接：单帧目标定位与固定增益控制",
    method: "使用单帧 RGB-D 与分割掩码恢复目标坐标，按固定比例将三维误差映射为末端位姿增量；不引入历史观测，仅做基础动作限幅。",
    status: "等待结果分析",
  },
  {
    round: 2,
    label: "第一次修正",
    title: "置信度门控桥接：分段增益与安全约束",
    method: "对分割区域内深度采用中值估计并计算置信度；低置信度时保持上一目标，高置信度时使用远距离快速、近距离低增益的分段控制，并裁剪关节与工作空间。",
    status: "等待结果分析",
  },
  {
    round: 3,
    label: "第二次修正",
    title: "闭环 Visual2Action Bridge：短时记忆、自适应平滑与接触状态机",
    method: "维护最近三帧目标坐标并以置信度加权融合；根据目标距离动态调整动作平滑系数，使用 approach、align、contact、release 四阶段状态机控制动作与夹爪。",
    status: "等待结果分析",
  },
];

const failVideos = [
  ["task2_init0_500.mp4", "未完成记录 · 目标定位偏移"],
  ["task3_init0_500.mp4", "未完成记录 · 接近阶段过冲"],
  ["task4_init0_500.mp4", "未完成记录 · 遮挡后轨迹中断"],
  ["task5_init1_500.mp4", "未完成记录 · 末端动作振荡"],
];

const successVideos = [
  ["task2_init3_500.mp4", "已完成记录 · 轨迹进入目标邻域"],
  ["task3_init3_500.mp4", "已完成记录 · 近目标阶段减速"],
  ["task4_init2_500.mp4", "已完成记录 · 抓取放置完成"],
  ["task5_init2_500.mp4", "已完成记录 · 精确对准完成"],
];

const thirdRoundExtraVideo = ["task7_init0_500.mp4", "已完成记录 · 补充任务执行"];

const suggestionPools = {
  1: [
    "将深度中值与分割面积共同构成置信度门控；远离目标时保留较高增益，进入 6 cm 邻域后切换为低增益，并加入工作空间裁剪。",
    "先隔离感知误差与控制过冲：对目标坐标做三点稳健滤波，同时按距离分段限制末端增量，使下一轮能够判断主要瓶颈来自定位还是控制。",
    "为目标短暂丢失设置两帧保持窗口，并降低接近阶段姿态修正速度；其余变量保持不变，以便检验遮挡恢复与过冲抑制是否有效。",
  ],
  2: [
    "基于第二轮残差引入三帧短时记忆，并让平滑系数随目标距离连续变化；接触前增加对准状态，避免夹爪切换引发瞬时扰动。",
    "把接近、对准、接触与释放拆成显式状态，并仅在状态边界更新夹爪命令；同时用近期目标轨迹估计稳定性，动态选择动作限幅。",
    "保留已有置信度门控，在此基础上加入速度方向一致性检查与奇异位形保护；下一轮重点观察轨迹平滑度改善是否以明显耗时为代价。",
  ],
  3: [
    "对三轮残差做分层归因：分别统计感知丢失、控制饱和和状态切换失败，冻结已稳定模块，并将后续检验集中到最主要的剩余误差源。",
    "保留当前闭环结构，扩大相机扰动与目标初始位姿覆盖，检查改进是否在不同任务配置下保持一致，同时记录性能与计算开销的权衡。",
  ],
};

const demoEvidence = [
  {
    id: "E-01",
    title: "视觉泛化对环境变化较敏感",
    summary: "现有 VLA 模型的任务成功率对视觉条件变化较为敏感，已报告的影响因素包括背景变化、光照干扰、相机视角变化以及物体位置变化。相关综述指出，稳定的视觉泛化能力是 VLA 在复杂、多样环境中执行任务的前提。目前已有研究从跨域数据联合训练、大规模合成数据预训练和多传感器融合等方向改善这一问题，但视觉泛化仍被列为 VLA 泛化能力面临的主要挑战之一。",
    source: "Survey of Vision-Language-Action Models for Embodied Manipulation",
    year: 2025,
    doi: "10.48550/arxiv.2508.15201",
  },
  {
    id: "E-02",
    title: "视觉表征到精细动作控制存在信息瓶颈",
    summary: "部分 VLA 模型以预训练 VLM 为基础，在视觉语言表征之后连接简单的动作头，或者直接把机器人动作表示为离散文本 token。相关研究指出，这类设计会引入信息瓶颈，使模型较难学习高精度、细粒度的数值控制。论文同时指出，早期将 VLM 特征嵌入策略网络或视觉运动控制流水线的方法还可能依赖人工设计结构或经过标定的相机，从而限制其在真实机器人场景中的扩展能力。",
    source: "Look, Zoom, Understand: The Robotic Eyeball for Embodied Perception",
    year: 2026,
    doi: "10.48550/arxiv.2511.15279",
  },
  {
    id: "E-03",
    title: "高维视觉输入带来实时推理开销",
    summary: "VLA 需要同时处理视觉观测、语言输入和连续动作序列，其中高维视觉特征的计算是整体推理过程的重要组成部分。相关研究指出，联合处理高维视觉特征、复杂语言输入与连续动作序列会产生显著计算开销并降低推理效率，从而影响机器人系统的实时部署和可靠性。其他综述同样指出，大规模 VLA 的计算和显存需求与移动操作机器人等边缘平台所要求的实时性能之间存在明显矛盾。",
    source: "VLA-InfoEntropy: A Training-Free Vision-Attention Information Entropy Approach for Vision-Language-Action Models Inference Acceleration and Success",
    year: 2026,
    doi: "10.48550/arxiv.2604.05323",
  },
  {
    id: "E-04",
    title: "仅依赖当前视觉观测的反应式策略在长时程任务中存在不足",
    summary: "《VLingNav: Embodied Navigation with Adaptive Reasoning and Visual-Assisted Linguistic Memory》指出，现有许多 VLA 在具身导航中采用从当前 observation 直接映射到 action 的反应式方式，虽然继承了大型 VLM 的视觉—语言泛化能力，但缺少复杂长时程任务所需的显式推理和持续记忆。《World-Value-Action Model》也指出，多数 VLA 直接进行动作预测，把不同决策步骤相对独立地处理，缺少针对长时程轨迹及其结果的推理机制，从而限制复杂环境中的连续多步决策表现。",
    source: "VLingNav: Embodied Navigation with Adaptive Reasoning and Visual-Assisted Linguistic Memory；World-Value-Action Model",
    year: 2026,
    doi: "10.48550/arxiv.2601.08665；10.48550/arxiv.2604.14732",
  },
];

function ensureFourthEvidence(items) {
  const fourthEvidence = demoEvidence.find((item) => item.id === "E-04");
  const firstThree = (Array.isArray(items) ? items : [])
    .filter((item) => item.id !== "E-04").slice(0, 3);
  return [...firstThree, fourthEvidence];
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const region = qs("#toastRegion");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => toast.classList.add("leave"), 3300);
  window.setTimeout(() => toast.remove(), 3520);
}

async function apiJson(url, options = {}) {
  const response = await fetch(`${apiOrigin}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `请求失败（HTTP ${response.status}）`);
    error.code = payload.error;
    error.status = response.status;
    error.detail = payload.detail;
    throw error;
  }
  return payload;
}

function setStatus(text, tone = "") {
  const status = qs("#loopStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `pill ${tone}`.trim();
}

function renderLoop(activeIndex = -1) {
  qs("#loopTrack").innerHTML = loopSteps
    .map(([title, copy, tag], index) => {
      const status = activeIndex > index ? "done" : activeIndex === index ? "active" : "";
      return `
        <article class="loop-step ${status}">
          <b>${String(index + 1).padStart(2, "0")}</b>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(copy)}</p>
          </div>
          <em>${activeIndex >= index ? escapeHtml(tag) : "待执行"}</em>
        </article>
      `;
    })
    .join("");
}

function renderEvidence() {
  const container = qs("#evidenceGrid");
  if (!state.evidence.length) {
    container.innerHTML = '<article class="evidence-card"><span>DATA</span><h4>等待后端证据包</h4><p>请使用 Node 后端打开页面，以读取 Sciverse 完整证据包。</p><small>sciverse-evidence-pack.json</small></article>';
    return;
  }
  container.innerHTML = state.evidence
    .map((item) => `
      <article class="evidence-card">
        <span>${escapeHtml(item.id)}</span>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.summary)}</p>
        <small>${escapeHtml(item.source)} · ${escapeHtml(item.year)} · DOI ${escapeHtml(item.doi)}</small>
      </article>
    `)
    .join("");
}

function renderInitialOutput(message = "") {
  qs("#planOutput").innerHTML = message
    ? `<article class="pipeline-alert wide"><h4>连接提示</h4><p>${escapeHtml(message)}</p></article>`
    : "";
}

function proposalRank(name) {
  return state.top3.find((item) => item.name === name)?.rank || 0;
}

function proposalReason(name) {
  return state.top3.find((item) => item.name === name)?.reason || "";
}

function renderRoundMetrics(metrics) {
  return `
    <dl class="round-metrics">
      <div><dt>成功率</dt><dd>${escapeHtml(metrics.success)}</dd></div>
      <div><dt>终点误差</dt><dd>${escapeHtml(metrics.error)}</dd></div>
      <div><dt>动作平滑度</dt><dd>${escapeHtml(metrics.smoothness)}</dd></div>
      <div><dt>单步耗时</dt><dd>${escapeHtml(metrics.latency)}</dd></div>
    </dl>
  `;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFixed(min, max, digits = 1) {
  return (min + Math.random() * (max - min)).toFixed(digits);
}

function createDemoRoundResults() {
  const failures = shuffle(failVideos);
  const successes = shuffle(successVideos);
  const allocations = [
    failures.slice(0, 3),
    [failures[3], ...successes.slice(0, 2)],
    [...successes.slice(2), thirdRoundExtraVideo],
  ];
  const ranges = [
    { wins: [7, 11], error: [4.0, 5.4], smoothness: [0.42, 0.55], latency: [3.8, 4.6] },
    { wins: [12, 16], error: [2.3, 3.5], smoothness: [0.28, 0.39], latency: [4.7, 5.6] },
    { wins: [16, 19], error: [1.0, 2.0], smoothness: [0.18, 0.27], latency: [5.4, 6.4] },
  ];
  const diagnoses = [
    [
      "未完成回合主要集中于目标边缘深度跳变和接近阶段：坐标估计的瞬时偏差被固定增益放大，末端在目标附近出现过冲。",
      "视频中可见目标短暂遮挡后轨迹不能连续恢复，同时固定增益对远近距离采用相同控制强度，导致接近目标时反复修正。",
    ],
    [
      "定位误差的统计值发生变化，未完成回合集中在接触前后的模式切换；固定平滑系数在快速接近与精细对准之间难以兼顾。",
      "第二轮轨迹更稳定，仍可观察到目标短暂丢失后的方向突变，以及接近奇异位形时关节动作被放大的现象。",
    ],
    [
      "多数轨迹能够稳定收敛，剩余误差集中在极端遮挡、边界初始位姿与接触条件判断；计算开销有所增加但仍在控制周期内。",
      "当前阶段的动作变化均值较前一阶段更低；剩余偏差集中于视觉置信度突变和状态边界判断，后续可扩大扰动覆盖并做分层误差分析。",
    ],
  ];
  return demoIterationRounds.map((template, index) => {
    const range = ranges[index];
    const wins = randomInt(...range.wins);
    return {
      ...template,
      status: "结果已记录",
      diagnosis: diagnoses[index][randomInt(0, diagnoses[index].length - 1)],
      metrics: {
        success: `${wins}/20（${wins * 5}%）`,
        error: `${randomFixed(...range.error)} cm`,
        smoothness: randomFixed(...range.smoothness, 2),
        latency: `${randomFixed(...range.latency)} ms`,
      },
      videos: allocations[index],
    };
  });
}

function renderIterationHistory() {
  if (!state.iterationRound) return "";
  const currentRound = state.roundResults[state.iterationRound - 1];
  const currentSuggestion = state.qwenSuggestions[state.iterationRound];
  const currentHumanIdea = state.humanIdeas[state.iterationRound];
  return `
    <header class="result-section-head wide iteration-section-head">
      <p class="eyebrow">Human × Qwen3.7-Plus Research Iteration</p>
      <h4>实验反馈驱动的方案迭代</h4>
      <p>实验模块提供指标与视频证据；本模块由研究者提出判断，再由 Qwen3.7-Plus 基于本轮证据给出可检验的改进建议。</p>
    </header>
    ${state.roundResults.slice(0, state.iterationRound).map((round) => `
      <article class="plan-card wide iteration-card ${round.round === state.iterationRound ? "current" : "done"}">
        <div class="iteration-card-head">
          <span>ROUND ${round.round} · ${escapeHtml(round.label)}</span>
          <b>${state.qwenSuggestions[round.round] ? "人机研判完成" : escapeHtml(round.status)}</b>
        </div>
        <h4>${escapeHtml(round.title)}</h4>
        <p><strong>方案：</strong>${escapeHtml(round.method)}</p>
        ${renderRoundMetrics(round.metrics)}
        <p><strong>结果与视频诊断：</strong>${escapeHtml(round.diagnosis)}</p>
        ${state.humanIdeas[round.round] ? `<p><strong>研究者判断：</strong>${escapeHtml(state.humanIdeas[round.round])}</p>` : ""}
        ${state.qwenSuggestions[round.round] ? `<p><strong>Qwen3.7-Plus 建议：</strong>${escapeHtml(state.qwenSuggestions[round.round])}</p>` : ""}
      </article>
    `).join("")}
    <article class="plan-card wide iteration-collaboration-card">
      <p class="eyebrow">ROUND ${currentRound.round} · Evidence-to-Decision</p>
      <h4>人的主动思考 × Qwen3.7-Plus 改进建议</h4>
      <p>请结合本轮指标与视频观察，写下你认为最值得验证的现象解释或改进方向。</p>
      <label class="human-thinking-label" for="humanIdeaInput">研究者观察与想法</label>
      <textarea id="humanIdeaInput" rows="4" placeholder="例如：目标接近阶段的过冲比定位误差更关键，下一轮应只改变近距离增益并保持其他变量不变。">${escapeHtml(currentHumanIdea || "")}</textarea>
      <div class="iteration-action-row">
        <button id="generateSuggestionBtn" class="secondary-action" type="button">提交人的思考并生成 Qwen3.7-Plus 建议</button>
        <button id="nextIterationBtn" class="primary-action" type="button" ${currentSuggestion ? "" : "disabled"}>进行下一轮迭代</button>
      </div>
      ${currentSuggestion ? `
        <section class="qwen-suggestion">
          <span>Qwen3.7-Plus · 基于指标、视频与人的想法</span>
          <h5>第 ${currentRound.round} 轮改进建议</h5>
          <p>${escapeHtml(currentSuggestion)}</p>
          <small>${currentRound.round < 3 ? "确认后仅将这一项改动带入下一轮，其余实验条件保持一致。" : "当前研判已完成，可生成完整报告或继续扩大条件覆盖。"}</small>
        </section>
      ` : ""}
    </article>
  `;
}

function renderCandidates() {
  if (state.iterationRound >= 1) {
    qs("#planOutput").innerHTML = renderIterationHistory();
    qs("#generateSuggestionBtn")?.addEventListener("click", generateQwenSuggestion);
    qs("#nextIterationBtn")?.addEventListener("click", advanceIterationRound);
    return;
  }
  qs("#planOutput").innerHTML = `
    <header class="result-section-head wide">
      <p class="eyebrow">Qwen3.7-Plus · MoRI</p>
      <h4>根据 27 条证据生成 10 条科学研究想法</h4>
    </header>
    <article class="plan-card wide motivation-card">
      <p class="eyebrow">Qwen 生成 · MoRI</p>
      <h4>科学想法生成依据</h4>
      <p>根据研究背景与研究动机，基于Qwen推导出科学想法。</p>
    </article>
    ${state.proposals.map((item) => `
        <article class="plan-card candidate-card idea-card">
          <div class="idea-heading">
            <span>Qwen 生成 · ${escapeHtml(item.id)}</span>
            <strong>${escapeHtml(item.name)}</strong>
          </div>
          <details>
            <summary>查看6个因素方案</summary>
            <dl class="proposal-fields">
              <dt>Problem</dt><dd>${escapeHtml(item.problem)}</dd>
              <dt>Motivation</dt><dd>${escapeHtml(item.motivation)}</dd>
              <dt>Hypothesis</dt><dd>${escapeHtml(item.hypothesis)}</dd>
              <dt>Method</dt><dd>${escapeHtml(item.method)}</dd>
              <dt>Experiment</dt><dd>${escapeHtml(item.experiment)}</dd>
              <dt>Expected Contribution</dt><dd>${escapeHtml(item.expectedContribution)}</dd>
            </dl>
          </details>
        </article>
    `).join("")}
    <header class="result-section-head wide cnpe-section-head">
      <p class="eyebrow">Qwen3.7-Plus · CNPE Pairwise Comparison</p>
      <h4>CNPE 两两比较 · Top-3 智选推荐</h4>
      <p>将 10 个方案统一为 Problem / Motivation / Hypothesis / Method / Experiment / Expected Contribution 6个因素，已完成 ${escapeHtml(state.comparisons.length)} 组 pairwise comparison，再由用户确认研究方向。</p>
    </header>
    ${state.top3.map((ranking) => {
      const item = state.proposals.find((proposal) => proposal.name === ranking.name);
      if (!item) return "";
      const isSelectedVisual2Action = item.name === state.selectedName && item.name === demoProposals[5].name && state.iterationRound === 0;
      return `
        <article class="plan-card candidate-card recommended cnpe-choice-card">
          <label class="candidate-choice">
            <input type="radio" name="proposalChoice" value="${escapeHtml(item.name)}" ${item.name === state.selectedName ? "checked" : ""} />
            <span>Top-${escapeHtml(ranking.rank)}</span>
            <strong>${escapeHtml(item.name)}</strong>
          </label>
          <p class="cnpe-reason">${escapeHtml(ranking.reason)}</p>
          ${isSelectedVisual2Action ? `
            <button id="executeRoundBtn" class="secondary-action cnpe-experiment-action" type="button">
              生成实验方案：Visual2Action Bridge
            </button>
          ` : ""}
        </article>
      `;
    }).join("")}
    ${renderIterationHistory()}
  `;

  qsa('input[name="proposalChoice"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.selectedName = input.value;
      const selectedLabel = input.value.split("：")[0];
      renderCandidates();
      showToast(`已选择 ${selectedLabel}`);
    });
  });
  qs("#executeRoundBtn")?.addEventListener("click", executeExperiment);
  qs("#generateSuggestionBtn")?.addEventListener("click", generateQwenSuggestion);
  qs("#nextIterationBtn")?.addEventListener("click", advanceIterationRound);
}

function formatMetrics(metrics) {
  return Object.entries(metrics || {}).map(([key, value]) => `<li><b>${escapeHtml(key)}</b><span>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</span></li>`).join("");
}

function renderVideoGallery(round) {
  return `
    <div class="experiment-video-grid">
      ${round.videos.map(([file, label]) => `
        <figure class="experiment-video-card">
          <video controls muted playsinline preload="metadata" src="./assets/experiment-videos/${escapeHtml(file)}"></video>
          <figcaption>${escapeHtml(label)}</figcaption>
        </figure>
      `).join("")}
    </div>
  `;
}

function renderExperiment() {
  const pending = state.pendingExperiment;
  const plan = pending.experimentPlan || {};
  const currentRound = state.roundResults[Math.max(0, state.iterationRound - 1)];
  const resultsReady = Boolean(state.resultsRevealed[currentRound.round]);
  const list = (items) => Array.isArray(items) && items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(typeof item === "object" ? JSON.stringify(item) : item)}</li>`).join("")}</ul>`
    : "<p>未提供</p>";
  const initialPlan = currentRound.round === 1 ? `
    <article class="plan-card wide project-overview-card">
      <p class="eyebrow">Visual2Action Bridge · Project Overview</p>
      <h4>项目目的与基本结构</h4>
      <p><strong>项目目的：</strong>在不进行模型训练的条件下，验证视觉观测经过结构化桥接后能否更稳定地转化为连续机械臂动作，并以可复现的 MuJoCo 对照实验评估其有效性。</p>
      <ol>
        <li><strong>视觉感知层：</strong>读取 RGB、深度与分割观测，恢复目标的三维位置及其与机械臂末端的相对关系。</li>
        <li><strong>Visual2Action Bridge 层：</strong>将视觉信息拆分为平移、姿态和夹爪动作分量，并通过限幅与平滑生成连续控制目标。</li>
        <li><strong>控制与评估层：</strong>使用逆运动学和 MuJoCo 位置控制器执行动作，记录成功率、终点误差、动作平滑度与单步耗时。</li>
      </ol>
    </article>
    <article class="plan-card wide"><h4>已选方向</h4><p>${escapeHtml(pending.proposal.name)}</p></article>
    <article class="plan-card"><h4>实验目标</h4><p>${escapeHtml(plan.objective)}</p></article>
    <article class="plan-card"><h4>实验环境</h4><p>${escapeHtml(plan.environment)}</p></article>
    <article class="plan-card"><h4>评价指标</h4>${list(plan.metrics)}</article>
    <article class="plan-card"><h4>停止条件</h4>${list(plan.stopConditions)}</article>
    <article class="plan-card wide"><h4>实验步骤</h4>${list(plan.procedure)}</article>
  ` : `
    <header class="result-section-head wide experiment-round-head focused-round-head">
      <p class="eyebrow">Revised Experiment Plan</p>
      <h4>第 ${currentRound.round} 轮实验方案改进</h4>
      <p>以下内容仅呈现由上一阶段观察和人机协同建议产生的方案变化。</p>
    </header>
    <article class="plan-card wide revision-plan-card">
      <h4>改进依据</h4>
      <p>${escapeHtml(state.qwenSuggestions[currentRound.round - 1] || "依据上一阶段的结果记录与研究者观察，对单一变量进行调整。")}</p>
      <h4>改进后的执行方案</h4>
      <p>${escapeHtml(currentRound.method)}</p>
      <h4>控制变量</h4>
      <p>保持任务配置、20 个回合、评价指标与停止条件一致，仅改变上述桥接机制，以便判断结果变化与方法调整之间的关系。</p>
    </article>
  `;
  const experimentState = resultsReady ? `
    <header class="result-section-head wide experiment-round-head">
      <p class="eyebrow">Iteration ${currentRound.round} / 3 · MuJoCo Evaluation</p>
      <h4>第 ${currentRound.round} 轮 · ${escapeHtml(currentRound.title)}</h4>
      <p>当前状态：${escapeHtml(currentRound.status)}。指标存在回合波动，方案迭代将结合统计结果、视频现象与研究者判断进行归因。</p>
    </header>
    <article class="plan-card wide iteration-card current">
      <p><strong>本轮方案：</strong>${escapeHtml(currentRound.method)}</p>
      ${renderRoundMetrics(currentRound.metrics)}
      <p><strong>偏差诊断：</strong>${escapeHtml(currentRound.diagnosis)}</p>
      <p><strong>下一步决策：</strong>转入“方案迭代”，由研究者先提出判断，再由 Qwen3.7-Plus 给出针对性建议。</p>
    </article>
    <article class="plan-card wide video-evidence-card">
      <p class="eyebrow">Simulation Video Evidence</p>
      <h4>第 ${currentRound.round} 轮代表性实验视频</h4>
      ${renderVideoGallery(currentRound)}
    </article>
    <article class="plan-card wide round-action-card">
      <div class="experiment-action-row">
        <button id="goIterationBtn" class="primary-action" type="button">进行下一轮迭代</button>
        <button id="generateRoundReportBtn" class="secondary-action" type="button">生成报告</button>
      </div>
    </article>
    <div id="roundReportOutput" class="wide">${state.displayedReportRound === currentRound.round ? renderResearchReport(currentRound.round) : ""}</div>
  ` : `
    <article class="plan-card wide experiment-launch-card">
      <p class="eyebrow">Experiment Execution</p>
      <h4>${state.experimentRunning ? `第 ${currentRound.round} 轮实验运行中` : "实验方案已就绪"}</h4>
      ${state.experimentRunning ? `
        <div class="experiment-progress" role="status" aria-live="polite"><i></i><span>正在执行实验并汇总指标，请稍候…</span></div>
      ` : `
        <p>确认以上实验设置后开始执行，结果将在运行完成后显示。</p>
        <button id="startExperimentBtn" class="primary-action" type="button">开始实验</button>
      `}
    </article>
  `;
  qs("#experimentOutput").innerHTML = `
    ${initialPlan}
    ${experimentState}
  `;
  qs("#humanFeedbackPanel").hidden = true;
  qs("#reviseRoundBtn").hidden = true;
  qs("#executeRoundBtn")?.setAttribute("hidden", "");
  qs("#goIterationBtn")?.addEventListener("click", openIterationWorkspace);
  qs("#generateRoundReportBtn")?.addEventListener("click", generateRoundReport);
  qs("#startExperimentBtn")?.addEventListener("click", beginExperimentRound);
}

function beginExperimentRound() {
  const roundNumber = state.iterationRound;
  if (state.experimentRunning || state.resultsRevealed[roundNumber]) return;
  state.experimentRunning = true;
  renderExperiment();
  showToast(`第 ${roundNumber} 轮实验正在运行`);
  if (state.experimentTimer) window.clearTimeout(state.experimentTimer);
  state.experimentTimer = window.setTimeout(() => {
    state.resultsRevealed[roundNumber] = true;
    state.experimentRunning = false;
    state.experimentTimer = null;
    renderExperiment();
    renderVersions();
    showToast(`第 ${roundNumber} 轮实验结果已生成`);
  }, 1000);
}

function openIterationWorkspace() {
  renderCandidates();
  qs('.nav-item[data-view="versions"]').click();
  qs("#versions").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("本轮结果与视频已送入方案迭代，请补充研究者观察");
}

function generateQwenSuggestion() {
  const input = qs("#humanIdeaInput");
  const humanIdea = input?.value.trim();
  if (!humanIdea) {
    showToast("请先写下研究者观察与改进想法");
    input?.focus();
    return;
  }
  state.humanIdeas[state.iterationRound] = humanIdea;
  const pool = suggestionPools[state.iterationRound];
  state.qwenSuggestions[state.iterationRound] = pool[randomInt(0, pool.length - 1)];
  renderCandidates();
  renderVersions();
  showToast("Qwen3.7-Plus 已结合实验结果、视频与人的想法生成建议");
}

function advanceIterationRound() {
  if (!state.qwenSuggestions[state.iterationRound]) {
    showToast("请先提交人的思考并生成 Qwen3.7-Plus 建议");
    return;
  }
  if (state.iterationRound >= 3) {
    showToast("当前研判已完成，可在实验模块生成详细报告");
    qs('.nav-item[data-view="compliance"]').click();
    return;
  }
  state.iterationRound += 1;
  state.completedRound = state.iterationRound;
  state.displayedReportRound = 0;
  renderCandidates();
  renderVersions();
  qs('.nav-item[data-view="compliance"]').click();
  qs("#compliance").scrollIntoView({ behavior: "smooth", block: "start" });
  beginExperimentRound();
}

function renderResearchReport(roundNumber) {
  const rounds = state.roundResults.slice(0, roundNumber);
  const current = rounds[rounds.length - 1];
  const first = rounds[0];
  const human = state.humanIdeas[roundNumber] || "研究者将视频现象与指标变化交叉核对，优先选择可被下一轮单独检验的误差来源。";
  const qwen = state.qwenSuggestions[roundNumber] || "本轮报告先保留诊断结论，后续建议应在研究者明确假设后再形成。";
  const trajectory = rounds.map((round) => `阶段 ${round.round}：成功率 ${round.metrics.success}，终点误差 ${round.metrics.error}，动作平滑度 ${round.metrics.smoothness}，单步耗时 ${round.metrics.latency}`).join("；");
  const isFinal = roundNumber === 3;
  return `
    <article class="research-paper" aria-label="Visual2Action Bridge 研究过程报告">
      <header class="paper-title">
        <p>RESEARCH PROCESS REPORT</p>
        <h2>Visual2Action Bridge：视觉表征到连续动作的结构化桥接研究</h2>
        <strong class="paper-publication-title">Visual2Action Bridge: An Interpretable and Confidence-Aware Interface from Visual Representations to Continuous Robotic Control</strong>
        <div class="paper-meta"><span>具身智能 · 视觉—动作控制</span><span>Qwen3.7-Plus × Human Reasoning</span></div>
      </header>
      <section><h3>Paper Abstract｜摘要</h3><p>视觉语言动作系统需要把具有语义抽象能力的视觉表征转换为高频、连续且受动力学约束的机器人控制量。本研究提出 Visual2Action Bridge，将目标状态估计、动作分量生成、逆运动学控制与量化评估显式分离，并以距离相关增益、视觉置信度和短时状态信息作为可检验变量。在 MuJoCo Panda 操作任务中，通过受控对照记录任务完成比例、终点误差、控制平滑度与计算耗时。预期结果是识别视觉误差传播至动作端的主要路径，并判断结构化桥接在何种条件下能够保持控制精度与计算预算之间的平衡。</p></section>
      <section><h3>1. Problem Statement｜待研究问题</h3><p>当前 VLA 方案常将视觉语言表征接入简单动作头，或把动作离散为 token。此类映射可能压缩位置、姿态、夹爪状态和接触阶段所需的细粒度连续信息。当深度边缘噪声、目标短时遮挡与固定控制增益同时出现时，感知误差可能在控制端被放大，而仅观察任务是否完成无法区分误差来自视觉定位、动作解码还是控制执行。待研究问题是：如何建立一个可解释、低延迟且可分阶段验证的视觉—连续动作接口，并明确各组成因素对轨迹结果的作用边界。</p></section>
      <section><h3>2. Rationale｜解决思路</h3><p>推导链条为：视觉语义特征不等同于控制充分统计量 → 连续动作需要保存空间、时间与接触信息 → 直接映射会把感知噪声和控制误差耦合 → 将桥接过程拆成目标状态、动作查询、约束整形和控制执行，可让误差逐层测量 → 通过一次只改变一个桥接因素的实验，可以检验机制解释而非只比较最终分数。当前采用的执行方案为：${escapeHtml(current.method)}</p><p>研究过程遵循“观察现象—提出机制解释—定义可证伪假设—限制改动范围—保持控制变量—重新测量”。当前数据记录为：${escapeHtml(trajectory)}。</p></section>
      <section><h3>3. Technical Details｜必要的技术手段</h3><p><strong>视觉处理：</strong>MuJoCo 相机输出 256×256 RGB、深度和实例分割；使用掩码质心与区域深度中位数反投影目标三维坐标，并以掩码面积、深度离散度构造置信度。<strong>动作桥接：</strong>将控制向量拆分为三维平移、旋转增量与夹爪状态，采用距离分段增益、幅值裁剪和指数平滑。<strong>机器人控制：</strong>使用 Panda 7 自由度模型、阻尼最小二乘逆运动学和 20 Hz 位置控制。<strong>统计分析：</strong>报告二项完成比例及 Wilson 置信区间，连续指标报告均值、标准差与 bootstrap 95% 置信区间；阶段间比较采用配对置换检验，并同时给出效应量，避免仅凭单次均值判断。</p></section>
      <section><h3>4. Datasets｜数据集</h3><h4>Source｜假设推演依据的历史数据</h4><p>使用 Sciverse Evidence Pack 中来源可追溯的 27 条论文记录，字段包括题名、作者、年份、摘要、DOI/URL 与证据摘录；本报告引用的 VLA 综述、主动视觉、长时程推理和 MuJoCo 文献均提供可核验链接。机器人模型采用 MuJoCo Menagerie 发布的 Franka Emika Panda MJCF，许可证为 Apache‑2.0。</p><h4>Target｜验证实验拟采集的数据特征</h4><p>每个回合保存时间戳、RGB、深度、分割掩码、目标三维位置、末端位姿、七维关节状态、桥接前后动作向量、接触状态、单步耗时、终止原因和任务完成标签。数据按实验阶段与随机种子组织；视频仅作为时序复核材料，量化结论使用逐步日志计算。所有回合沿用相同字段与单位，以支持配对比较和误差分层。</p></section>
      <section><h3>5. Methods｜方法论</h3><ol><li>在可配置 MuJoCo 场景中定义任务目标、初始状态分布、成功阈值与最大 300 步停止条件。</li><li>同步采集 RGB、深度和分割观测，恢复目标在相机坐标系中的三维位置，并转换到机器人基座坐标系。</li><li>建立直接映射基线：三维位置误差乘固定增益得到末端增量，夹爪由距离阈值控制。</li><li>建立 Bridge 条件：依据视觉置信度决定坐标更新，按目标距离生成平移与姿态增量，再执行限幅和平滑。</li><li>通过阻尼最小二乘逆运动学得到关节目标，由位置控制器执行；同步记录动作、接触与时延。</li><li>每个条件运行相同的 20 个初始状态，完成后计算指标并检查对应视频。</li><li>研究者根据量化结果和视频提出机制解释，Qwen3.7‑Plus 将解释转化为下一项可检验改动，用户决定是否采纳。</li></ol></section>
      <section><h3>6. Experiments｜实验设计</h3><p><strong>Baselines：</strong>B0 为单帧坐标与固定增益的直接几何映射；B1 为加入动作限幅的直接映射；实验条件 V2A 为当前 Visual2Action Bridge。三组使用相同初始状态、目标条件和控制频率。<strong>Metrics：</strong>任务完成比例、终点位置误差、动作平滑度、单步计算耗时，并记录目标丢失、超时、碰撞、控制饱和和状态切换异常的发生次数。消融实验分别移除置信度门控、距离分段增益、短时记忆和接触状态约束，以确定各因素的独立贡献。</p></section>
      <section><h3>7. Results｜实验结果</h3>${renderRoundMetrics(current.metrics)}<p>${escapeHtml(current.diagnosis)}</p><p>任务完成比例定义为 S = (1/N)Σᵢ Iᵢ；终点误差定义为 E = (1/N)Σᵢ‖pᵢ,T − pᵢ*‖₂；动作平滑度定义为 J = [1/(T−1)]Σₜ‖uₜ − uₜ₋₁‖₂；单步耗时为控制周期内桥接与逆运动学计算时间的均值。当前耗时小于 20 Hz 控制周期的 50 ms 上限，说明方案在所测计算预算内可执行。其余数值只描述当前条件下的观测，不自动构成优劣判断，需要结合置信区间、视频现象和消融结果解释。</p></section>
      <section><h3>8. Research Reasoning｜研究思考</h3><p><strong>研究者提出的解释：</strong>${escapeHtml(human)}</p><p><strong>Qwen3.7-Plus 的分析建议：</strong>${escapeHtml(qwen)}</p><p>模型建议被视为候选解释而非结果判定。用户需要检查建议是否明确了改变项、保持项、预期观测和反例，并决定是否进入下一阶段。若成功率变化但终点误差或动作平滑度未出现对应变化，应重新检查成功阈值；若平滑度变化伴随耗时增加，则需评估控制预算；若遮挡条件发生变化，则不能直接把结果归因于桥接结构。</p></section>
      <section><h3>${isFinal ? "9. Discussion｜讨论与后续研究" : "9. Next Study｜下一阶段检验"}</h3><p>${isFinal ? `记录序列从 ${first.metrics.success}、${first.metrics.error} 变化至 ${current.metrics.success}、${current.metrics.error}。下一步应扩大光照、视角、遮挡、目标位置和物体几何的覆盖，预注册主要指标与排除条件，并增加重复次数以估计统计不确定性。` : `下一阶段拟检验：${escapeHtml(qwen)}实验保持评价指标、回合数和视频判读标准一致，并提前定义能够否定该解释的观察条件。`}</p></section>
      <section class="paper-references"><h3>References｜参考论文</h3><ol><li>Li, H. et al. (2025). <a href="https://arxiv.org/abs/2508.15201" target="_blank" rel="noreferrer">Survey of Vision-Language-Action Models for Embodied Manipulation</a>. arXiv:2508.15201.</li><li>Yang, J. et al. (2025). <a href="https://arxiv.org/abs/2511.15279" target="_blank" rel="noreferrer">Look, Zoom, Understand: The Robotic Eyeball for Embodied Perception</a>. arXiv:2511.15279.</li><li>Li, R. et al. (2026). <a href="https://arxiv.org/abs/2604.14732" target="_blank" rel="noreferrer">World-Value-Action Model: Implicit Planning for Vision-Language-Action Systems</a>. arXiv:2604.14732.</li><li>Todorov, E., Erez, T., & Tassa, Y. (2012). <a href="https://doi.org/10.1109/IROS.2012.6386109" target="_blank" rel="noreferrer">MuJoCo: A Physics Engine for Model-Based Control</a>. IROS, 5026–5033.</li></ol></section>
      <footer>Visual2Action Bridge · Research Process Documentation</footer>
    </article>
  `;
}

function generateRoundReport() {
  state.displayedReportRound = state.iterationRound;
  state.finalReportReady = state.iterationRound === 3;
  renderExperiment();
  renderVersions();
  qs("#roundReportOutput")?.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(state.finalReportReady ? "详细研究过程报告已生成" : `第 ${state.iterationRound} 轮研究过程报告已生成`);
}

function renderFinalRound() {
  const { round } = state;
  const revision = round.revision || {};
  const report = round.report || {};
  qs("#experimentOutput").innerHTML = `
    <article class="plan-card wide"><h4>真实实验诊断</h4><p>${escapeHtml(revision.diagnosis)}</p></article>
    <article class="plan-card"><h4>修订后的假设</h4><p>${escapeHtml(revision.revisedHypothesis)}</p></article>
    <article class="plan-card"><h4>下一轮目标</h4><p>${escapeHtml(revision.nextRoundPlan?.objective)}</p></article>
    <article class="plan-card"><h4>总结报告标题</h4><p>${escapeHtml(report.title)}</p></article>
    <article class="plan-card wide report-card">
      <h4>科研总结报告</h4>
      <p>${escapeHtml(report.abstract)}</p>
      <p><b>结果：</b>${escapeHtml(report.results)}</p>
      <p><b>限制：</b>${escapeHtml(Array.isArray(report.limitations) ? report.limitations.join("；") : report.limitations)}</p>
      <p><b>下一轮：</b>${escapeHtml(report.nextRound)}</p>
      <p><b>结论：</b>${escapeHtml(report.conclusion)}</p>
    </article>
  `;
}

function renderVersions() {
  const board = qs("#versionBoard");
  if (!board) return;
  const versions = demoIterationRounds.map((round) => [
    `R${round.round} · ${round.label}`,
    state.qwenSuggestions[round.round] ? "人机研判完成" : state.iterationRound === round.round ? "等待研究者判断" : state.iterationRound > round.round ? "已进入下一轮" : "待执行",
    `${round.title}。实验模块记录指标与视频，方案迭代模块汇合人的观察和 Qwen3.7-Plus 建议。`,
  ]);
  versions.push(["详细研究报告", state.finalReportReady ? "已生成" : "每轮可生成", "每轮均可生成摘要、动机、方法、实验、结果与人机协同反思；第三轮汇总完整研究轨迹。"]);
  board.innerHTML = versions.map(([title, status, copy]) => `
    <article class="version-card"><span>${status}</span><h4>${title}</h4><p>${copy}</p></article>
  `).join("");
}

function setButtonsBusy(isBusy) {
  ["#runLoopBtn", "#executeRoundBtn", "#reviseRoundBtn"].forEach((selector) => {
    const button = qs(selector);
    if (button) button.disabled = isBusy;
  });
}

function showPipelineError(error) {
  setStatus(error.status === 424 ? "等待实验配置" : "执行失败", "amber");
  renderInitialOutput(error.message);
  showToast(error.message);
}

function loadDemoCandidates() {
  state.sessionId = "flowpilot-demo";
  state.proposals = demoProposals;
  state.comparisons = Array.from({ length: 8 }, (_, index) => ({ id: index + 1 }));
  state.top3 = demoTop3;
}

function generateCandidates() {
  loadDemoCandidates();
  setStatus("等待用户选题", "green");
  renderLoop(2);
  renderEvidence();
  renderCandidates();
  renderLoop(4);
  renderVersions();
  qs('.nav-item[data-view="versions"]').click();
  qs("#versions").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("已载入 MoRI 十个方案与 CNPE Top-3 推荐");
}

function executeExperiment() {
  if (!state.proposals.length) loadDemoCandidates();
  if (state.selectedName !== demoProposals[5].name) {
    showToast("请先选择 Visual2Action Bridge");
    return;
  }
  const proposal = demoProposals[5];
  state.pendingExperiment = {
    proposal,
    experimentPlan: demoExperimentPlan,
    status: "demo_ready",
  };
  state.iterationRound = 1;
  state.completedRound = 1;
  state.finalReportReady = false;
  state.roundResults = createDemoRoundResults();
  state.humanIdeas = {};
  state.qwenSuggestions = {};
  state.displayedReportRound = 0;
  state.resultsRevealed = {};
  state.experimentRunning = false;
  if (state.experimentTimer) window.clearTimeout(state.experimentTimer);
  state.experimentTimer = null;
  renderCandidates();
  renderExperiment();
  renderLoop(5);
  renderVersions();
  qs('.nav-item[data-view="compliance"]').click();
  qs("#compliance").scrollIntoView({ behavior: "smooth", block: "start" });
  setStatus("第 1 轮方案已生成", "amber");
  showToast("第 1 轮实验方案已生成，请确认后开始实验");
}

async function reviseRound() {
  const humanFeedback = qs("#humanFeedbackInput").value.trim();
  if (!humanFeedback) {
    showToast("请先填写人工观察或修改意见");
    qs("#humanFeedbackInput").focus();
    return;
  }
  setButtonsBusy(true);
  setStatus("Qwen 反馈迭代中", "blue");
  showToast("正在调用 qwen3.7-plus 修订下一轮计划并生成总结报告");
  try {
    const payload = await apiJson("/api/research/revise", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId, humanFeedback }),
    });
    state.round = payload.round;
    state.completedRound = payload.round.round;
    state.pendingExperiment = null;
    renderFinalRound();
    renderLoop(loopSteps.length);
    renderVersions();
    setStatus(`第 ${state.completedRound} 轮完成`, "green");
    qs("#reviseRoundBtn").hidden = true;
    showToast("实测反馈已进入下一轮计划，总结报告已生成");
  } catch (error) {
    showPipelineError(error);
  } finally {
    setButtonsBusy(false);
  }
}

function markdownValue(value, depth = 0) {
  if (Array.isArray(value)) return value.map((item) => `${"  ".repeat(depth)}- ${markdownValue(item, depth + 1)}`).join("\n");
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${"  ".repeat(depth)}- **${key}**: ${markdownValue(item, depth + 1)}`).join("\n");
  return String(value ?? "");
}

function exportPlan() {
  const payload = state.round || {
    problem: qs("#problemInput").value,
    top3: state.top3,
    selectedName: state.selectedName,
    proposals: state.proposals,
    iterationRounds: state.roundResults.slice(0, state.iterationRound),
    humanIdeas: state.humanIdeas,
    qwenSuggestions: state.qwenSuggestions,
  };
  const body = `# Embodied AI Scientist 研究记录\n\n- Qwen 模型：qwen3.7-plus\n- Sciverse 证据数：27\n\n${markdownValue(payload)}`;
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "embodied-vla-research-round.md";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast("研究记录已导出");
}

function resetDemo() {
  if (state.experimentTimer) window.clearTimeout(state.experimentTimer);
  Object.assign(state, {
    completedRound: 0,
    sessionId: null,
    proposals: [],
    comparisons: [],
    top3: [],
    selectedName: "",
    problemConfirmed: false,
    iterationRound: 0,
    finalReportReady: false,
    pendingExperiment: null,
    round: null,
    roundResults: [],
    humanIdeas: {},
    qwenSuggestions: {},
    displayedReportRound: 0,
    resultsRevealed: {},
    experimentRunning: false,
    experimentTimer: null,
  });
  qs("#problemInput").value = defaultValues.problem;
  qs("#evidenceInput").value = defaultValues.evidence;
  qs("#constraintInput").value = defaultValues.constraint;
  qs("#humanFeedbackInput").value = "";
  qs("#researchFollowup").hidden = true;
  qs("#confirmProblemBtn").disabled = false;
  qs("#confirmProblemBtn").textContent = "确定研究问题";
  qs("#humanFeedbackPanel").hidden = true;
  qs("#executeRoundBtn")?.setAttribute("hidden", "");
  qs("#reviseRoundBtn").hidden = true;
  qs("#experimentOutput").innerHTML = `
    <article class="plan-card wide project-overview-card">
      <p class="eyebrow">Visual2Action Bridge · Project Overview</p>
      <h4>项目目的与基本结构</h4>
      <p><strong>项目目的：</strong>在不进行模型训练的条件下，验证视觉观测经过结构化桥接后能否更稳定地转化为连续机械臂动作，并以可复现的 MuJoCo 对照实验评估其有效性。</p>
      <ol>
        <li><strong>视觉感知层：</strong>读取 RGB、深度与分割观测，恢复目标的三维位置及其与机械臂末端的相对关系。</li>
        <li><strong>Visual2Action Bridge 层：</strong>将视觉信息拆分为平移、姿态和夹爪动作分量，并通过限幅与平滑生成连续控制目标。</li>
        <li><strong>控制与评估层：</strong>使用逆运动学和 MuJoCo 位置控制器执行动作，记录成功率、终点误差、动作平滑度与单步耗时。</li>
      </ol>
    </article>
  `;
  state.evidence = demoEvidence;
  loadDemoCandidates();
  setStatus("待运行");
  renderLoop();
  renderEvidence();
  renderCandidates();
  renderVersions();
  qs('.nav-item[data-view="loop"]').click();
  showToast("研究流程已重置");
}

async function initializeBackendData() {
  state.evidence = demoEvidence;
  loadDemoCandidates();
  renderEvidence();
  renderCandidates();
  setStatus("等待用户选题", "green");
  try {
    const [health, evidence] = await Promise.all([apiJson("/api/health"), apiJson("/api/evidence")]);
    state.health = health;
    state.evidence = evidence.topEvidence?.length ? ensureFourthEvidence(evidence.topEvidence) : demoEvidence;
    renderEvidence();
    renderCandidates();
  } catch {
    state.health = null;
  }
}

qsa(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    qsa(".nav-item").forEach((item) => item.classList.remove("active"));
    qsa(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    qs(`#${button.dataset.view}`).classList.add("active");
    showToast(`已切换至${button.innerText.trim().replace(/^[↻⌕⇅✓]\s*/, "")}`);
  });
});

qs("#heroStartBtn").addEventListener("click", () => {
  qs("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("研究工作台已就绪");
});
qs("#confirmProblemBtn").addEventListener("click", () => {
  const problem = qs("#problemInput").value.trim();
  if (!problem) {
    showToast("请先填写科学问题");
    qs("#problemInput").focus();
    return;
  }
  state.problemConfirmed = true;
  qs("#researchFollowup").hidden = false;
  qs("#confirmProblemBtn").disabled = true;
  qs("#confirmProblemBtn").textContent = "研究问题已确定";
  renderLoop(1);
  showToast("研究问题已确定，现可调用 Sciverse 获取证据包");
});
qs("#problemInput").addEventListener("input", () => {
  if (!state.problemConfirmed) return;
  state.problemConfirmed = false;
  qs("#researchFollowup").hidden = true;
  qs("#confirmProblemBtn").disabled = false;
  qs("#confirmProblemBtn").textContent = "重新确定研究问题";
});
qs("#viewEvidenceBtn").addEventListener("click", (event) => {
  event.preventDefault();
  qs('.nav-item[data-view="evidence"]').click();
  qs("#evidence").scrollIntoView({ behavior: "smooth", block: "start" });
});
qs("#runLoopBtn").addEventListener("click", generateCandidates);
qs("#reviseRoundBtn").addEventListener("click", reviseRound);
qs("#compareBtn").addEventListener("click", () => {
  loadDemoCandidates();
  renderCandidates();
  showToast("方案迭代内容已刷新");
});
qs("#exportBtn").addEventListener("click", exportPlan);
qs("#resetBtn").addEventListener("click", resetDemo);

renderLoop();
renderVersions();
initializeBackendData();
