# 东方 Project 茶番剧收藏

这是一个用于收集和展示东方 Project 二次创作茶番剧的网站，使用 GitHub Pages 托管。请注意所有的代码都是由AI编写，团队只负责维护和更新数据，如果ui实在让你感到不适请发issue。

## 功能特性

- 🔍 **搜索功能**: 支持按标题、作者、译者、标签和描述搜索
- 🏷️ **筛选功能**: 可按汉化状态（已汉化/未汉化）筛选
- 📊 **排序功能**: 支持按添加时间、名称排序
- 🎨 **现代化界面**: 使用 Tailwind CSS 构建的响应式设计
- 🌐 **双语链接**: 支持原版和汉化版链接跳转
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 👤 **译者信息**: 显示汉化作品的译者信息

## 数据结构

每个茶番剧包含以下信息：

- `id`: 唯一标识符
- `title`: 标题
- `author`: 作者
- `translator`: 译者（可选，未汉化为 null）
- `tags`: 标签数组
- `isTranslated`: 是否已汉化
- `originalUrl`: 原版链接
- `translatedUrl`: 汉化版链接（可选）
- `description`: 描述
- `thumbnail`: 缩略图 URL
- `dateAdded`: 添加日期

## 添加新的茶番剧

在 `data.js` 文件中添加新的茶番剧数据：

```javascript
{
    id: 11,
    title: "新茶番剧标题",
    author: "作者名",
    translator: "译者名",
    tags: ["标签1", "标签2"],
    isTranslated: true,
    originalUrl: "原版链接",
    translatedUrl: "汉化版链接",
    description: "描述信息",
    thumbnail: "缩略图链接",
    dateAdded: "2026-02-02"
}
```

详细的开发指南请查看 [DEVELOPMENT.md](DEVELOPMENT.md)

## 本地预览

1. 克隆仓库到本地
2. 使用任意 HTTP 服务器预览，例如：

```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js (需要安装 http-server)
npx http-server
```

3. 在浏览器中打开 `http://localhost:8000`

## 部署到 GitHub Pages

1. 将代码推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择 GitHub Actions 作为部署源
4. 推送代码到 main 或 master 分支即可自动部署

## 技术栈

- HTML5
- Tailwind CSS (通过 CDN)
- Vanilla JavaScript
- GitHub Pages

## 注意事项

- 所有内容版权归原作者所有
- 仅供学习交流使用
- 请勿用于商业用途

## 许可证

本项目采用 MIT 许可证。