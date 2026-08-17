import { Icon } from "./ui.jsx";

export default function Hero({ stats }) {
    const items = [
        { label: "总收藏", value: stats.total, color: "var(--text)" },
        { label: "已汉化", value: stats.translated, color: "var(--green)" },
        { label: "未汉化", value: stats.untranslated, color: "var(--amber)" },
        { label: "国产", value: stats.domestic, color: "var(--blue)" },
        { label: "我的收藏", value: stats.favorites, color: "var(--red)" },
    ];
    return (
        <header className="hero">
            <div className="hero-banner" aria-hidden="true">
                <span className="particle" style={{ left: "12%", "--drift": "8px", animationDelay: "0s" }} />
                <span className="particle" style={{ left: "32%", "--drift": "-6px", animationDelay: "1.4s" }} />
                <span className="particle" style={{ left: "55%", "--drift": "10px", animationDelay: "2.8s" }} />
                <span className="particle" style={{ left: "74%", "--drift": "-9px", animationDelay: "4.1s" }} />
                <span className="particle" style={{ left: "88%", "--drift": "5px", animationDelay: "5.2s" }} />
            </div>
            <div className="container hero-body">
                <h1>东方 Project 茶番剧收藏馆</h1>
                <p>收集整理东方 Project 二次创作茶番剧，按汉化状态 / 作者 / 标签筛选，支持收藏与批量操作</p>
                <div className="hero-stats">
                    {items.map((item) => (
                        <div key={item.label} className="stat-chip">
                            <span className="stat-value" style={{ color: item.color }}>{item.value}</span>
                            <span className="stat-label">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </header>
    );
}
