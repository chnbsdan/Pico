## 基于 **Vercel + GitHub 私有仓库** 的独立图床服务，采用 React + Tailwind CSS 构建现代化管理界面。
```markdown
# ImgBed - 现代化个人图床

基于 **Vercel + GitHub 私有仓库** 的独立图床服务，采用 React + Tailwind CSS 构建现代化管理界面。

## ✨ 功能特点

- 🖼️ **随机图片 API** - 支持 `/api/random` 接口，每次返回随机图片
- 📂 **分类管理** - 支持横屏（wallpaper）和竖屏（cover）两种分类
- 📤 **批量上传** - 支持多文件选择和拖拽上传，自动压缩大图
- 🔒 **私有仓库** - 图片存储在 GitHub 私有仓库中，安全可控
- 🌐 **代理访问** - 通过 `/wallpaper/` 和 `/cover/` 代理访问图片
- 📊 **统计信息** - 提供 `/api/stats` 接口查看各类图片数量
- 📋 **图片列表** - 提供 `/api/list` 接口查看所有图片
- 📦 **JSON 格式** - 提供 `/api/json` 接口返回随机图片的 JSON 信息
- 🎨 **自动压缩** - 大图片自动压缩至 3MB 以内，确保上传成功
- 🚀 **现代化界面** - React + Tailwind CSS + shadcn/ui 风格

## 📁 项目结构

```
imgbed/
├── api/                        # Vercel Serverless Functions
│   ├── img/
│   │   └── [filename].js      # 图片代理服务
│   ├── random.js              # 随机图片接口（全部分类）
│   ├── wallpaper.js           # 横屏图片接口
│   ├── cover.js               # 竖屏图片接口
│   ├── json.js                # JSON 格式接口
│   ├── list.js                # 图片列表接口
│   ├── stats.js               # 统计信息接口
│   └── upload.js              # 图片上传接口
├── src/                       # React 前端源码
│   ├── components/            # UI 组件
│   │   ├── Header.jsx
│   │   ├── StatsCard.jsx
│   │   ├── ApiSection.jsx
│   │   ├── UploadArea.jsx
│   │   ├── UploadResult.jsx
│   │   └── Footer.jsx
│   ├── lib/
│   │   └── api.js             # API 调用封装
│   ├── App.jsx                # 主应用
│   ├── main.jsx               # 入口文件
│   └── index.css              # 全局样式
├── index.html                 # HTML 模板
├── package.json               # 依赖配置
├── vite.config.js             # Vite 配置
├── tailwind.config.js         # Tailwind CSS 配置
├── postcss.config.js          # PostCSS 配置
├── vercel.json                # Vercel 路由配置
└── README.md                  # 项目说明
```

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/random` | GET | 随机返回一张图片（全部分类） |
| `/api/wallpaper` | GET | 随机返回横屏图片 |
| `/api/cover` | GET | 随机返回竖屏图片 |
| `/api/json` | GET | 返回随机图片的 JSON 信息 |
| `/api/list` | GET | 返回所有图片列表 |
| `/api/stats` | GET | 返回统计信息 |
| `/api/upload` | POST | 上传图片（multipart/form-data） |
| `/wallpaper/:filename` | GET | 代理访问横屏图片 |
| `/cover/:filename` | GET | 代理访问竖屏图片 |

### 使用示例

```bash
# 随机获取图片
curl https://imgbed.vercel.app/api/random

# 随机获取横屏图片
curl https://imgbed.vercel.app/api/wallpaper

# 随机获取竖屏图片
curl https://imgbed.vercel.app/api/cover

# 获取 JSON 格式
curl https://imgbed.vercel.app/api/json

# 获取统计信息
curl https://imgbed.vercel.app/api/stats

# 获取图片列表
curl https://imgbed.vercel.app/api/list

# 上传图片
curl -X POST -F "file=@image.jpg" -F "folder=wallpaper" https://imgbed.vercel.app/api/upload

# 直接访问图片
https://imgbed.vercel.app/wallpaper/20260610_image.jpg
```

### JSON 返回示例

```json
{
  "code": "200",
  "imgurl": "https://imgbed.vercel.app/api/random",
  "source": "https://raw.githubusercontent.com/chnbsdan/imgbed-storage/main/wallpaper/20260610_image.jpg",
  "filename": "20260610_image.jpg",
  "id": "20260610_image",
  "total": 38
}
```

### 统计返回示例

```json
{
  "github_folders": {
    "wallpaper": 33,
    "cover": 5
  },
  "github_total": 38,
  "external_total": 0,
  "grand_total": 38
}
```

## 🔧 环境变量

在 Vercel 项目设置中配置以下环境变量：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token（需 `repo` 权限） | ✅ 是 |
| `GITHUB_USER` | GitHub 用户名 | 可选（默认 chnbsdan） |
| `GITHUB_REPO` | 存储图片的仓库名 | 可选（默认 imgbed-storage） |

### 获取 GitHub Token

1. 访问 GitHub → Settings → Developer settings → Personal access tokens
2. 点击 **Generate new token (classic)**
3. 勾选 `repo` 权限（完整控制私有仓库）
4. 生成并复制 Token（以 `ghp_` 开头）

## 📦 部署步骤

### 1. 创建 GitHub 存储仓库

创建一个新的私有仓库用于存储图片，例如 `imgbed-storage`：

```
imgbed-storage/
├── wallpaper/   # 横屏图片存放目录
└── cover/       # 竖屏图片存放目录
```

### 2. 克隆本项目

```bash
git clone https://github.com/chnbsdan/imgbed.git
cd imgbed
```

### 3. 安装依赖

```bash
npm install
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel --prod
```

或在 Vercel 官网导入 GitHub 仓库：

1. 访问 [Vercel](https://vercel.com)
2. 点击 **Add New** → **Project**
3. 导入 `imgbed` 仓库
4. 在 **Environment Variables** 中添加 `GITHUB_TOKEN`
5. 点击 **Deploy**

### 6. 绑定自定义域名（可选）

1. 在 Vercel 项目设置中进入 **Domains**
2. 添加你的域名（如 `imgbed.example.com`）
3. 按提示配置 DNS 解析

## 🎨 前端页面

访问部署后的域名即可看到管理界面：

- 📊 实时统计卡片（总数、横屏、竖屏）
- 🔗 API 接口地址展示（一键复制）
- 📤 分类上传（横屏/竖屏选择）
- 🖼️ 批量上传（拖拽或点击）
- 📋 上传结果展示（链接复制、图片预览）

## 📝 图片命名规则

上传后的图片会按以下格式命名：

```
日期_原文件名.扩展名
```

示例：`20260610_风景照片.jpg`

- 日期格式：`YYYYMMDD`
- 原文件名中的特殊字符会被替换为 `_`
- PNG 大图会自动转换为 JPG 格式

## 🔗 图片访问方式

| 方式 | 地址 | 说明 |
|------|------|------|
| 随机接口 | `/api/random` | 每次返回不同图片 |
| 横屏接口 | `/api/wallpaper` | 仅返回横屏图片 |
| 竖屏接口 | `/api/cover` | 仅返回竖屏图片 |
| 代理访问 | `/wallpaper/文件名.jpg` | 直接访问特定图片 |
| 代理访问 | `/cover/文件名.jpg` | 直接访问特定图片 |

## ⚠️ 注意事项

1. **私有仓库** - 图片存储在私有仓库中，需要通过代理接口访问
2. **Token 安全** - 不要将 `GITHUB_TOKEN` 暴露在客户端代码中
3. **文件大小** - 单张图片限制 10MB，超过 3MB 会自动压缩
4. **支持格式** - JPG、PNG、WebP、GIF（PNG 大图会转为 JPG）
5. **API 限制** - GitHub API 限制 5000 次/小时（已认证）

## 📊 限制说明

| 限制类型 | 限制值 | 说明 |
|----------|--------|------|
| 单张图片大小 | ~4.5 MB | Vercel 免费版 Function 限制 |
| 批量上传总大小 | ~4.5 MB | 多张图片总大小限制 |
| 自动压缩阈值 | 3 MB | 超过此大小自动压缩 |
| 压缩质量 | 85%-60% | 动态调整，保证上传成功 |

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **前端** | React 18 + Vite + Tailwind CSS |
| **图标** | Lucide React |
| **后端** | Vercel Serverless Functions |
| **存储** | GitHub 私有仓库 |
| **API** | GitHub REST API |

## 📄 许可证

MIT License

## 🔗 相关链接

- [GitHub 仓库](https://github.com/chnbsdan/imgbed)
- [Vercel 部署](https://vercel.com)
- [GitHub Token 申请](https://github.com/settings/tokens)

## 👤 作者

- GitHub: [chnbsdan](https://github.com/chnbsdan)
- 博客: [Aoso Blog](https://aoso.hangdn.com)

---

如果觉得这个项目有用，欢迎 Star ⭐


