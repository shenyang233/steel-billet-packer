# 🏗️ 钢坯堆积优化系统

> Steel Billet Container Packing Optimizer — 自动生成最优钢坯堆积方案

基于 **py3dbp** 三维装箱算法的钢坯堆积优化系统，提供 **FastAPI** 后端 API 和 **React + Three.js** 3D 可视化前端。支持多种集装箱/货车预设，自动计算最优摆放位置，实时 3D 预览堆积结果。

---

## ✨ 功能特性

- 🚢 **集装箱预设** — 内置 20ft、40ft、40ft 高柜、9.6m 货车、13m 货车等常用规格
- 📐 **多规格钢坯** — 支持同时输入多种不同尺寸的钢坯，每种可设不同数量和颜色
- 🔄 **旋转优化** — 支持钢坯旋转（绕任意轴/仅垂直轴/禁止旋转），最大化空间利用率
- ⚖️ **重力稳定** — 可选强制重力稳定放置，确保堆积方案实际可行
- 🎯 **优化目标** — 支持以利用率优先或以装载数量优先
- 📊 **详细统计** — 容器利用率、各类型装载率、分层信息、未装载物品及原因
- 🎨 **3D 可视化** — 基于 Three.js 的交互式 3D 场景，可旋转/缩放/点击查看钢坯详情
- ⚡ **超时控制** — 可配置的计算超时，避免大规模问题长时间等待
- 🧪 **单元测试** — 完整的 pytest 后端测试覆盖

---

## 📸 界面预览

前端提供完整的可视化操作界面：

1. **左侧面板** — 设置容器尺寸（或选择预设）、添加钢坯类型、调整打包选项
2. **右侧面板** — 3D 堆积场景展示 + 结果统计数据
3. **3D 场景** — 鼠标拖拽旋转、滚轮缩放、点击钢坯高亮查看详情

---

## 🚀 快速开始

### 环境要求

| 组件 | 版本要求 |
|------|----------|
| Python | ≥ 3.10 |
| Node.js | ≥ 18 |
| npm | ≥ 9 |

### 1. 克隆仓库

```bash
git clone https://github.com/shenyang233/steel-billet-packer.git
cd steel-billet-packer
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动 API 服务（默认端口 8000）
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端启动后可访问：
- API 文档 (Swagger UI): http://localhost:8000/docs
- 健康检查: http://localhost:8000/api/v1/health
- 预设查询: http://localhost:8000/api/v1/presets

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（默认端口 5173）
npm run dev
```

前端开发服务器会在 http://localhost:5173 启动，并自动代理 `/api` 请求到后端。

> **注意**: 如果后端使用非 8000 端口，请修改 `frontend/vite.config.ts` 中的 proxy target。

---

## 🔧 后端 API

### `POST /api/v1/pack` — 执行打包优化

**请求示例：**

```json
{
  "container": {
    "length": 12032,
    "width": 2352,
    "height": 2393
  },
  "billets": [
    {
      "id": "方坯-150",
      "length": 6000,
      "width": 150,
      "height": 150,
      "quantity": 200,
      "color": "#B87333"
    },
    {
      "id": "板坯-200",
      "length": 6000,
      "width": 200,
      "height": 1200,
      "quantity": 10,
      "color": "#C0C0C0"
    }
  ],
  "options": {
    "clearance_mm": 5,
    "allow_rotation": true,
    "rotation_axes": "all",
    "optimize_for": "utilization",
    "gravity_stable": true,
    "solver_timeout_ms": 30000
  }
}
```

**响应示例：**

```json
{
  "success": true,
  "result": {
    "packed_items": [
      {
        "billet_id": "方坯-150",
        "instance_id": 1,
        "position": { "x": 0, "y": 0, "z": 0 },
        "dimensions": { "length": 6000, "width": 150, "height": 150 },
        "rotation": "lwh",
        "color": "#B87333"
      }
    ],
    "unplaced_items": [],
    "metrics": {
      "total_billets": 210,
      "placed_count": 200,
      "unplaced_count": 10,
      "container_volume_m3": 67.69,
      "placed_volume_m3": 61.20,
      "utilization_pct": 90.41,
      "remaining_volume_m3": 6.49,
      "by_type": {
        "方坯-150": { "placed": 190, "unplaced": 10, "placed_volume_m3": 25.65 }
      },
      "compute_time_ms": 1523.4
    },
    "layers": [
      { "z_min": 0, "z_max": 150, "item_count": 50 }
    ]
  }
}
```

### 其他端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | API 信息 |
| GET | `/api/v1/health` | 健康检查 |
| GET | `/api/v1/presets` | 获取容器预设列表 |

---

## 📁 项目结构

```
steel-billet-packer/
├── backend/                       # Python 后端
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py          # API 路由定义
│   │   ├── models/
│   │   │   ├── domain.py          # 领域模型
│   │   │   └── schemas.py         # Pydantic 请求/响应模型
│   │   ├── services/
│   │   │   ├── packing_service.py # 打包服务编排
│   │   │   └── py3dbp_adapter.py  # py3dbp 算法适配器
│   │   ├── utils/
│   │   │   └── converters.py      # 数据转换工具
│   │   ├── config.py              # 配置常量
│   │   └── main.py                # FastAPI 入口
│   ├── tests/
│   │   ├── test_api.py            # API 测试
│   │   └── test_packing_service.py # 打包服务测试
│   └── requirements.txt
│
├── frontend/                      # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── forms/             # 表单组件
│   │   │   ├── layout/            # 布局组件
│   │   │   ├── results/           # 结果展示组件
│   │   │   └── visualization/     # 3D 可视化组件
│   │   ├── api/                   # API 客户端
│   │   ├── store/                 # Zustand 状态管理
│   │   ├── types/                 # TypeScript 类型定义
│   │   └── styles/                # 全局样式
│   ├── public/                    # 静态资源
│   └── package.json
│
└── .gitignore
```

---

## 🧪 运行测试

```bash
cd backend
pytest -v
```

---

## 🛠️ 技术栈

### 后端
- **[FastAPI](https://fastapi.tiangolo.com/)** — 高性能 Python Web 框架
- **[py3dbp](https://github.com/enzoruiz/3dbinpacking)** — 三维装箱启发式算法库
- **[Pydantic](https://docs.pydantic.dev/)** — 数据校验与序列化
- **[NumPy](https://numpy.org/)** — 数值计算

### 前端
- **[React 19](https://react.dev/)** — UI 框架
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全
- **[Vite](https://vite.dev/)** — 构建工具
- **[Three.js](https://threejs.org/)** — 3D 渲染引擎
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber)** — React 的 Three.js 封装
- **[Zustand](https://zustand.docs.pmnd.rs/)** — 轻量状态管理
- **[Recharts](https://recharts.org/)** — 图表组件库

---

## ⚙️ 算法说明

系统使用 **py3dbp** 三维装箱算法，基于启发式搜索策略：

1. **排序策略** — 按钢坯体积从大到小排序优先放置
2. **放置策略** — 扫描容器内可放置位置，选择最优的角落位置
3. **旋转策略** — 尝试 6 种旋转姿态，选择最贴合的位置
4. **重力稳定** — 确保每个钢坯下方有足够的支撑面积
5. **分批处理** — 逐层堆叠，生成清晰的分层结构

通过调整 `options` 参数可控制算法行为，包括是否允许旋转、旋转轴限制、钢坯间隙、重力稳定性要求等。

---

## 📄 License

MIT

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
