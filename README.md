<h1 align="center">
  东方 Project 茶番剧收藏
</h1>

<p align="center">
  <a style="text-decoration:none">
    <img src="https://img.shields.io/badge/LICENSE-Apache%202.0-blue" alt="LICENSE Apache 2.0"/>
  </a>
</p>

## 功能特性

**作品浏览**
- 🔍 搜索：标题 / 作者 / 译者 / 标签 / 描述，支持 `tag="博丽灵梦"` 语法
- 🏷️ 筛选：已汉化 / 未汉化 / 国产 / 我的收藏
- 📊 排序：收录时间、标题、编号
- 🎨 卡片 / 列表双布局，暗色主题
- 🌟 新人推荐、时间线、统计图表、批量收藏操作
- 🌐 原版与汉化版链接，相关作品推荐

**用户体系**
- 📧 邮箱注册 / 登录 / 找回密码（可选 hCaptcha 验证码）
- 👤 用户名与密码自助修改，个人资料（用户名 / 简介）
- 📋 公开用户列表与个人主页，可查看他人收藏夹（邮箱严格保密）

**社区互动**
- ❤️ 云端收藏同步：未登录可本地收藏，登录后自动合并
- 👍 点赞、💬 评论（每作品每人一条，可编辑 / 删除，管理员可删任意）
- 🔔 站内通知：审核结果实时推送，管理员头像显示待审核角标

**权限与审核**
- 🛡️ 三级权限：管理员（最高） / 汉化者·作者 / 普通用户
- 📤 用户提交茶番 → 管理员审核通过后上线（审核时可修改提交内容）
- ⚙️ 管理后台：审核、作品管理（管理员直接编辑任意作品）、用户管理（角色 / 资料 / 头像 / 邮箱）

## 技术栈

- React 19 + Vite 6（静态站点）
- Supabase：Auth（邮箱登录）+ PostgreSQL（RLS 行级权限）+ Resend SMTP（邮件）
- Chart.js（统计图表）
- Cloudflare Pages（部署）

## 项目结构

```
├── data.js                     # 基础作品数据（静态）
├── index.html                  # Vite 入口
├── public/
│   ├── cover/                  # 封面图（cover/{id}.jpg）
│   ├── avatar/                 # 头像图（管理员指定直链）
│   └── images/                 # 站点图
├── src/
│   ├── main.jsx / App.jsx      # 入口与路由（极简 hash 路由）
│   ├── App.css / styles/       # 样式
│   ├── hooks.js                # 鉴权/作品/收藏/通知等 hooks
│   ├── utils.js                # 工具函数
│   ├── lib/supabaseClient.js   # Supabase 客户端
│   ├── data.js                 # data.js 重导出
│   └── components/             # 页面与弹窗组件
│       ├── Header.jsx          # 顶栏（搜索/通知/用户菜单）
│       ├── DramaGrid.jsx       # 作品卡片
│       ├── DetailModal.jsx     # 详情（点赞/评论/收藏）
│       ├── AuthModal.jsx       # 登录/注册/找回密码
│       ├── ProfileModal.jsx    # 个人资料
│       ├── AdminModals.jsx     # 管理后台 / 我的作品
│       ├── UsersPages.jsx      # 用户列表 / 用户主页
│       └── MiscModals.jsx      # 提交/批量/设置等
├── legacy/                     # 旧版静态页面（已弃用）
└── *.py                        # 数据维护脚本
```

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：复制 `.env.example` 为 `.env.local` 并填入 Supabase 项目配置

```bash
cp .env.example .env.local
```

3. 启动开发服务器：

```bash
npm run dev
```

4. 生产构建（产物输出到 `dist/`）：

```bash
npm run build
```

## 部署（Cloudflare Pages）

1. 在 Cloudflare Pages 控制台连接本仓库
2. 构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
3. 环境变量（生产环境必填）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_HCAPTCHA_SITE_KEY`（可选，需在 Supabase Auth 开启 CAPTCHA）
4. 自定义域名：Cloudflare Pages 控制台 → Settings → Custom domains（如 `touhou.ora-san.org`）

## 数据库

站点依赖 Supabase 数据库（用户、提交、收藏、点赞、评论、通知等），需在 Supabase SQL Editor 中创建对应表并启用 RLS（行级安全策略）。详细的建表 SQL、权限设计与开发说明请查看 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 数据来源

- `data.js`：基础作品静态数据
- `submissions` 表：用户新提交的作品，管理员审核通过后与静态数据合并展示（`approved` 记录覆盖静态数据，新提交自动追加）

## 注意事项

- 所有内容版权归原作者所有
- 仅供学习交流使用
- 请勿用于商业用途

## 许可证

本项目采用 MIT 许可证。

---

<a href="https://github.com/Fairy-Oracle-Sanctuary/Touhou-Chabangeki-Collect/graphs/contributors"> <img src="https://contrib.rocks/image?repo=Fairy-Oracle-Sanctuary/Touhou-Chabangeki-Collect" /> </a>
