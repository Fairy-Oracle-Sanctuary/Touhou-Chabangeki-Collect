# 东方 Project 茶番剧收藏 - 开发手册

请注意所有的代码都是由AI编写，团队只负责维护和更新数据，如果ui实在让你感到不适请发issue。

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [数据结构](#数据结构)
5. [开发环境搭建](#开发环境搭建)
6. [功能模块说明](#功能模块说明)
7. [添加新茶番剧](#添加新茶番剧)
8. [样式定制](#样式定制)
9. [部署流程](#部署流程)
10. [常见问题](#常见问题)

---

## 项目概述

本项目是一个用于收集和展示东方 Project 二次创作茶番剧的静态网站，具有以下特点：

- 纯前端实现，无需后端服务器
- 使用 GitHub Pages 免费托管
- 响应式设计，支持移动端和桌面端
- 支持搜索、筛选、排序等功能
- 区分汉化版和原版链接

---

## 技术栈

- **HTML5**: 页面结构
- **Tailwind CSS**: 样式框架（通过 CDN 引入）
- **Vanilla JavaScript**: 前端逻辑
- **GitHub Pages**: 静态网站托管
- **GitHub Actions**: 自动化部署

---

## 项目结构

```
Touhou-Chabangeki-Collect/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署配置
├── index.html                  # 主页面
├── data.js                     # 茶番剧数据文件
├── app.js                      # 前端逻辑文件
├── .gitignore                  # Git 忽略文件
├── README.md                   # 项目说明文档
└── DEVELOPMENT.md              # 开发手册（本文件）
```

### 文件说明

#### index.html
网站的主页面，包含：
- 头部区域：标题和简介
- 搜索和筛选区域：搜索框、状态筛选器、排序选择器
- 统计区域：显示总数、已汉化数、未汉化数
- 内容区域：茶番剧卡片网格
- 底部区域：版权信息

#### data.js
存储所有茶番剧的数据，是一个 JavaScript 数组。

#### app.js
前端逻辑文件，包含：
- 数据过滤和排序功能
- 页面渲染功能
- 事件监听器
- 统计数据更新

---

## 数据结构

每个茶番剧对象包含以下字段：

```javascript
{
    id: 1,                              // 唯一标识符（数字）
    title: "幻想郷の日常",              // 标题（字符串）
    author: "作者A",                    // 作者（字符串）
    translator: "译者A",                // 译者（字符串，未汉化为 null）
    tags: ["日常", "搞笑", "灵梦"],     // 标签数组（字符串数组）
    isTranslated: true,                 // 是否已汉化（布尔值）
    originalUrl: "https://...",         // 原版链接（字符串）
    translatedUrl: "https://...",       // 汉化版链接（字符串，未汉化为 null）
    description: "描述信息",            // 描述（字符串）
    thumbnail: "https://...",            // 缩略图 URL（字符串）
    dateAdded: "2026-01-15"             // 添加日期（字符串，格式：YYYY-MM-DD）
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Number | 是 | 唯一标识符，必须唯一 |
| title | String | 是 | 茶番剧标题 |
| author | String | 是 | 原作者名称 |
| translator | String/null | 否 | 译者名称，未汉化时为 null |
| tags | Array | 是 | 标签数组，每个标签为字符串 |
| isTranslated | Boolean | 是 | 是否已汉化 |
| originalUrl | String | 是 | 原版视频链接 |
| translatedUrl | String/null | 否 | 汉化版链接，未汉化时为 null |
| description | String | 是 | 茶番剧描述 |
| thumbnail | String | 是 | 缩略图 URL |
| dateAdded | String | 是 | 添加日期，格式 YYYY-MM-DD |

---

## 开发环境搭建

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/Touhou-Chabangeki-Collect.git
cd Touhou-Chabangeki-Collect
```

### 2. 本地预览

由于使用了 CDN 引入 Tailwind CSS，可以直接在浏览器中打开 `index.html` 文件预览。

或者使用 HTTP 服务器：

**使用 Python:**
```bash
python -m http.server 8000
```

**使用 Node.js:**
```bash
npx http-server
```

**使用 PHP:**
```bash
php -S localhost:8000
```

然后在浏览器中访问 `http://localhost:8000`

### 3. 推荐的代码编辑器

- Visual Studio Code
- WebStorm
- Sublime Text

推荐安装的 VS Code 扩展：
- Live Server（实时预览）
- ESLint（代码检查）
- Prettier（代码格式化）

---

## 功能模块说明

### 1. 搜索功能

搜索功能支持以下字段的模糊匹配：
- 标题（title）
- 作者（author）
- 译者（translator）
- 标签（tags）
- 描述（description）

搜索不区分大小写。

### 2. 筛选功能

支持按汉化状态筛选：
- 全部（all）
- 已汉化（translated）
- 未汉化（untranslated）

### 3. 排序功能

支持以下排序方式：
- 最新添加（date-desc）
- 最早添加（date-asc）
- 名称 A-Z（name-asc）
- 名称 Z-A（name-desc）

### 4. 统计功能

实时显示：
- 总数
- 已汉化数
- 未汉化数

### 5. 卡片显示

每个茶番剧以卡片形式展示，包含：
- 缩略图
- 汉化状态标签
- 标题
- 描述
- 标签
- 作者和译者信息
- 添加日期
- 查看按钮（汉化版/原版）
- 原版链接按钮

---

## 添加新茶番剧

### 步骤 1: 打开 data.js 文件

编辑 `data.js` 文件，在 `dramas` 数组中添加新对象。

### 步骤 2: 添加数据

按照数据结构格式添加新茶番剧：

```javascript
{
    id: 11,                                      // 使用下一个可用的 ID
    title: "新茶番剧标题",
    author: "原作者名称",
    translator: "译者名称",                       // 未汉化则设为 null
    tags: ["标签1", "标签2", "标签3"],
    isTranslated: true,                          // 已汉化设为 true
    originalUrl: "https://www.youtube.com/watch?v=xxx",
    translatedUrl: "https://www.bilibili.com/video/BV1xxx",
    description: "茶番剧的详细描述信息",
    thumbnail: "https://example.com/image.jpg",
    dateAdded: "2026-02-02"                      // 使用当前日期
}
```

### 步骤 3: 验证数据

确保：
- ID 唯一且递增
- URL 格式正确
- 日期格式为 YYYY-MM-DD
- `isTranslated` 与 `translatedUrl` 一致

### 步骤 4: 测试

在浏览器中刷新页面，确认新茶番剧正确显示。

---

## 样式定制

### Tailwind CSS 配置

本项目使用 Tailwind CSS 的 CDN 版本，默认配置即可满足大部分需求。

如需自定义主题，可以在 `<head>` 中添加 Tailwind 配置：

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    primary: '#667eea',
                    secondary: '#764ba2',
                }
            }
        }
    }
</script>
```

### 自定义样式

在 `<style>` 标签中添加自定义 CSS：

```html
<style>
    .custom-class {
        /* 自定义样式 */
    }
</style>
```

### 修改颜色主题

主要颜色定义在 `index.html` 的 `<style>` 标签中：

```css
.gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tag-translated {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.tag-untranslated {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}
```

修改这些颜色值即可改变主题色。

---

## 部署流程

### GitHub Pages 部署

#### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "添加新茶番剧"
git push origin main
```

#### 2. 启用 GitHub Pages

1. 进入仓库的 Settings 页面
2. 在左侧菜单中选择 Pages
3. 在 Build and deployment 下，选择 Source 为 GitHub Actions
4. 保存设置

#### 3. 自动部署

推送代码到 main 或 master 分支后，GitHub Actions 会自动部署到 GitHub Pages。

#### 4. 访问网站

部署完成后，访问 `https://your-username.github.io/Touhou-Chabangeki-Collect/`

### 自定义域名

如需使用自定义域名：

1. 在仓库的 Pages 设置中添加自定义域名
2. 在域名服务商处配置 DNS 记录
3. 等待 DNS 生效

---

## 常见问题

### Q1: 如何修改网站标题？

编辑 `index.html` 文件，修改 `<title>` 标签和 `<h1>` 标签的内容。

### Q2: 如何更改缩略图？

在 `data.js` 中修改对应茶番剧的 `thumbnail` 字段。

### Q3: 搜索功能不工作？

检查：
- `data.js` 文件是否正确加载
- 浏览器控制台是否有错误
- JavaScript 是否被禁用

### Q4: 如何添加更多筛选条件？

在 `index.html` 中添加新的筛选器，然后在 `app.js` 的 `filterAndSortDramas` 函数中添加相应的逻辑。

### Q5: 如何导出数据？

可以直接复制 `data.js` 中的 `dramas` 数组内容，或使用浏览器控制台：

```javascript
console.log(JSON.stringify(dramas, null, 2));
```

### Q6: 如何批量添加茶番剧？

在 `data.js` 中一次性添加多个对象到 `dramas` 数组中。

### Q7: 如何备份数据？

- 定期提交代码到 Git 仓库
- 导出 `data.js` 文件到本地备份

### Q8: 网站加载慢怎么办？

- 优化缩略图大小
- 使用 CDN 加速
- 减少 JavaScript 文件大小

### Q9: 如何添加多语言支持？

创建语言文件，根据用户语言切换显示内容。

### Q10: 如何添加评论功能？

由于是静态网站，需要使用第三方评论服务，如：
- Disqus
- Gitalk
- Valine

---

## 最佳实践

### 1. 数据管理

- 定期备份数据
- 使用版本控制追踪数据变更
- 保持数据格式一致

### 2. 图片优化

- 使用适当的图片格式（WebP 优先）
- 压缩图片大小
- 使用懒加载

### 3. 性能优化

- 减少不必要的 DOM 操作
- 使用事件委托
- 避免频繁的重排重绘

### 4. 可访问性

- 使用语义化 HTML
- 添加适当的 ARIA 标签
- 确保键盘导航可用

### 5. 安全性

- 验证所有外部链接
- 避免使用 eval()
- 使用 CSP（内容安全策略）

---

## 扩展功能建议

- 添加收藏功能（使用 localStorage）
- 支持分享到社交媒体
- 添加评分系统
- 支持视频预览
- 添加相关推荐
- 支持夜间模式
- 添加数据导出功能
- 支持批量导入数据

---

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

本项目采用 MIT 许可证。

---

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 参与讨论

---

## 更新日志

### v1.0.0 (2026-02-02)

- 初始版本发布
- 实现基本的搜索、筛选、排序功能
- 支持汉化状态标识
- 响应式设计

---

## 附录

### 有用的链接

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [MDN Web 文档](https://developer.mozilla.org/)

### 快捷键

- `Ctrl/Cmd + F`: 在浏览器中搜索
- `F12`: 打开开发者工具
- `Ctrl/Cmd + R`: 刷新页面

---

**祝开发愉快！**