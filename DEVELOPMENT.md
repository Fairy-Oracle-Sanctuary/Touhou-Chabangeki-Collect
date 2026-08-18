# 东方 Project 茶番剧收藏 - 开发手册

代码由 AI 编写，团队负责维护与更新数据；如果 UI 实在让你感到不适，欢迎发 issue。

## 目录

1. [技术栈](#技术栈)
2. [项目结构](#项目结构)
3. [本地开发](#本地开发)
4. [Supabase 配置](#supabase-配置)
5. [数据库设计](#数据库设计)
6. [权限与审核](#权限与审核)
7. [数据双通道](#数据双通道)
8. [部署](#部署)
9. [常见维护操作](#常见维护操作)

---

## 技术栈

- **React 19 + Vite 6**：前端框架与构建工具
- **Supabase**：Auth（邮箱注册/登录）+ PostgreSQL（业务数据）+ RLS（行级安全）
- **Resend SMTP**：Supabase Auth 的邮件发送（`smtp.resend.com:465`）
- **Chart.js + react-chartjs-2**：统计图表
- **Cloudflare Pages**：静态部署（自定义域名 `touhou.ora-san.org`）

## 项目结构

```
├── data.js                     # 基础作品数据（静态数组，166 部）
├── index.html                  # Vite 入口
├── vite.config.js
├── public/
│   ├── cover/                  # 封面图（cover/{id}.jpg）
│   ├── avatar/                 # 头像图（管理员指定直链 avatar/{n}.webp）
│   └── images/                 # 站点图（banner 等）
├── src/
│   ├── main.jsx                # React 入口
│   ├── App.jsx                 # 应用壳 + 极简 hash 路由（#/admin #/myworks #/users #/user/:id）
│   ├── App.css                 # 全局样式
│   ├── styles/tokens.css       # CSS 变量（主题色、圆角、阴影）
│   ├── hooks.js                # useAuth/useProfile/useDramas/useFavorites/useNotifications/usePendingReviews 等
│   ├── utils.js                # 搜索解析、状态判定等工具
│   ├── lib/supabaseClient.js   # Supabase 客户端（读取 VITE_SUPABASE_*）
│   └── components/             # 组件（见 README）
├── legacy/                     # 旧版静态页面（已弃用）
└── *.py                        # 数据维护脚本（data_manage_gui.py 等）
```

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填入 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev                  # 开发服务器
npm run build                # 生产构建，产物在 dist/
```

> 注意：Windows 下若项目路径含 `&`（如 `html&css`），PowerShell 无法直接执行 `npm run`，
> 可改用 `node node_modules/vite/bin/vite.js build` 或进入目录后执行。

## Supabase 配置

1. **Project Settings → Authentication → Providers**：启用 Email 登录
2. **Authentication → URL Configuration**：
   - Site URL / Redirect URLs 必须包含本地开发地址 `http://localhost:5173` 与线上域名，否则确认邮件链接打不开
3. **Authentication → SMTP Settings**：使用 Resend
   - Host: `smtp.resend.com`，Port: `465`
   - Username: `resend`（固定），Password: Resend API Key
   - Sender email: `noreply@email.ora-san.org`（需在 Resend 验证域名）
4. **可选 CAPTCHA**：Authentication 开启 hCaptcha，前端填 `VITE_HCAPTCHA_SITE_KEY`；未配置时不显示验证码
5. **数据表**：在 SQL Editor 执行建表 SQL（见下）

## 数据库设计

所有表均启用 RLS，客户端直接通过 Supabase JS 访问，权限完全由 RLS 控制。

### profiles（用户资料）

| 列 | 说明 |
|---|---|
| user_id (uuid, PK) | 关联 auth.users |
| username | 用户名（可自助修改） |
| bio | 简介 |
| avatar_url | 头像直链（**仅管理员可通过 RPC 设置**，用户不可自填） |
| role | `admin` / `creator`（汉化者·作者）/ `user` |
| creator_names | 作者别名数组 |
| email | **已撤销 select/update 权限**，仅 `admin_user_emails()` RPC 可读 |

### submissions（提交与审核）

用户提交的新作品 / 修改请求。字段：`title, author, translator, tags, is_translated, is_domestic, original_url, translated_url, thumbnail, description, date_added, edit_drama_id（修改哪个旧作品，null 表示新作品）, status（pending/approved/rejected）, review_note, submitted_by, reviewed_by, reviewed_at`。

### favorites / likes / comments / notifications

- `favorites(drama_id, user_id)`：收藏，`unique(drama_id, user_id)`
- `likes(drama_id, user_id)`：点赞，`unique(drama_id, user_id)`
- `comments(drama_id, user_id, content)`：评论，`unique(drama_id, user_id)`（每人每作品一条）
- `notifications(user_id, type, title, body, drama_id, read)`：站内通知

### RLS 策略要点

- 公开读：`favorites_select`、`likes_select`、`comments_select` 均为 `using (true)`
- 写自己：`likes_insert/delete`、`comments_insert/update/delete` 用 `auth.uid() = user_id`；管理员可删任意评论（`or public.is_admin()`）
- 邮箱保密：`revoke select (email) on profiles from anon, authenticated` + `admin_user_emails()`（security definer）
- 头像保密：`revoke update (avatar_url)` + `admin_set_avatar(uid, url)` RPC（security definer）
- 通知：用户只能看/改/删自己的通知；仅管理员（`is_admin()`）可插入
- `is_admin()` / `is_creator()`：security definer 函数，读取 profiles.role 判断

## 权限与审核

- **管理员**：硬编码（profiles.role = admin）。可审核提交（通过/拒绝，可编辑提交内容）、直接编辑所有作品（autoApprove）、管理用户（角色/资料/头像/邮箱）
- **汉化者·作者**：管理自己的作品（改信息，不可删除）
- **普通用户**：可提交茶番，需管理员审核

数据流：用户提交 → `submissions.status = pending` → 管理员审核 → `approved` 后前端 `useDramas` 将其与静态 `data.js` 合并展示 → 审核结果通过 `notifications` 通知用户。

## 数据双通道

- `data.js`：存量静态数据，`thumbnail` 等指向 `public/cover/`
- `submissions`：新增/修改记录
  - `edit_drama_id = null`：新作品，追加到列表末尾（id 自动递增）
  - `edit_drama_id = N`：覆盖静态数据中 id=N 的作品
- 管理员编辑走 autoApprove（`status = approved`）直接生效

## 部署

Cloudflare Pages：

1. 控制台连接仓库，Framework preset 选 Vite
2. 构建命令 `npm run build`，输出目录 `dist`
3. 环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（可选 `VITE_HCAPTCHA_SITE_KEY`）
4. 自定义域名在 **Settings → Custom domains** 添加（如 `touhou.ora-san.org`），不要提交 CNAME 文件
5. GitHub Pages / GitHub Actions 已停用，勿恢复

## 常见维护操作

- **加新作品（静态）**：编辑 `data.js`，同时放入 `public/cover/{id}.jpg`
- **批量下载封面**：`download_thumbnails.py`（yt-dlp，需项目根目录的 yt-dlp.exe）
- **上传封面**：`upload_thumbnails.py`
- **数据管理**：`data_manage_gui.py`（桌面 GUI，可生成本地封面 URL）
- **改用户名/角色/头像**：管理后台 #/admin → 用户管理
- **SQL 变更**：所有建表/策略变更在 Supabase SQL Editor 手动执行，前端代码与数据库版本需保持一致

---

**祝开发愉快！**
