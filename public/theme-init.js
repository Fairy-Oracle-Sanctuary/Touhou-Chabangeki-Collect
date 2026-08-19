// 首屏前恢复主题，避免闪烁（由 index.html 同步加载）
// 独立文件以便 CSP 不依赖 'unsafe-inline'
(function () {
    try {
        var t = localStorage.getItem("chabangeki-theme");
        if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.dataset.theme = "dark";
        }
    } catch (e) { /* ignore */ }
})();
