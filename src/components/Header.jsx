import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./ui.jsx";
import { getTranslators } from "../utils.js";

// 搜索自动补全：标题/作者/译者/标签
function buildSuggestions(dramas, input) {
    if (!input) return [];
    const q = input.toLowerCase();
    const out = [];
    const seen = new Set();

    dramas.forEach((d) => {
        if (d.title.toLowerCase().includes(q) && !seen.has("t" + d.title)) {
            seen.add("t" + d.title);
            out.push({ type: "title", value: d.title, label: d.title });
        }
    });
    const authorCounts = {};
    dramas.forEach((d) => {
        if (d.author.toLowerCase().includes(q)) authorCounts[d.author] = (authorCounts[d.author] || 0) + 1;
    });
    Object.entries(authorCounts).forEach(([name, count]) => {
        if (!seen.has("a" + name)) out.push({ type: "artist", value: name, label: name, count });
    });
    const translatorCounts = {};
    dramas.forEach((d) => {
        getTranslators(d).forEach((t) => {
            if (t.toLowerCase().includes(q)) translatorCounts[t] = (translatorCounts[t] || 0) + 1;
        });
    });
    Object.entries(translatorCounts).forEach(([name, count]) => {
        if (!seen.has("r" + name)) out.push({ type: "translator", value: name, label: name, count });
    });
    const tagCounts = {};
    dramas.forEach((d) => d.tags.forEach((t) => {
        if (t.toLowerCase().includes(q)) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }));
    Object.entries(tagCounts).forEach(([name, count]) => {
        if (!seen.has("g" + name)) out.push({ type: "tag", value: name, label: `#${name}`, count });
    });
    return out.slice(0, 8);
}

const TYPE_LABEL = { title: "作品", artist: "作者", translator: "译者", tag: "标签" };
const TYPE_PREFIX = { title: "", artist: 'artist="', translator: 'translator="', tag: 'tag="' };
const TYPE_SUFFIX = { title: "", artist: '"', translator: '"', tag: '"' };

export default function Header({
    dramas,
    search,
    onSearchChange,
    theme,
    onToggleTheme,
    onOpen,
}) {
    const inputRef = useRef(null);
    const boxRef = useRef(null);
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const suggestions = useMemo(() => buildSuggestions(dramas, search.trim()), [dramas, search]);

    useEffect(() => setActiveIndex(-1), [search]);

    // Ctrl+K 聚焦搜索
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        const onClick = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setFocused(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const pick = (s) => {
        onSearchChange(`${TYPE_PREFIX[s.type]}${s.value}${TYPE_SUFFIX[s.type]}`);
        setFocused(false);
        inputRef.current?.blur();
    };

    const onKeyDown = (e) => {
        if (!focused || suggestions.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            pick(suggestions[activeIndex]);
        }
    };

    const actions = [
        { id: "newcomer", icon: "sparkles", label: "新人推荐", title: "新人观看推荐 (Ctrl+M)" },
        { id: "timeline", icon: "clock", label: "时间线", title: "作品发布时间轴" },
        { id: "charts", icon: "chart", label: "统计图表", title: "统计图表" },
        { id: "submit", icon: "upload", label: "提交作品", title: "提交茶番剧" },
        { id: "batch", icon: "layers", label: "批量操作", title: "收藏批量操作 (Ctrl+Shift+F 显示收藏)" },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <a className="brand" href="#">
                    <span className="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 100 100" width="22" height="22">
                            <path d="M20 20 H80 V30 H70 V80 H80 V90 H20 V80 H30 V30 H20 Z" fill="currentColor" />
                            <rect x="10" y="10" width="80" height="10" fill="currentColor" />
                            <rect x="15" y="35" width="70" height="8" fill="currentColor" />
                        </svg>
                    </span>
                    <span className="brand-text">东方茶番剧收藏</span>
                </a>

                <div className={`searchbox ${focused && suggestions.length ? "searchbox-open" : ""}`} ref={boxRef}>
                    <Icon name="search" size={16} className="searchbox-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        placeholder={'搜索作品/作者/译者/标签… 支持 tag="博丽灵梦" 语法'}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onKeyDown={onKeyDown}
                        id="searchInput"
                        aria-label="搜索"
                    />
                    {search && (
                        <button className="searchbox-clear" onClick={() => onSearchChange("")} aria-label="清空搜索">
                            <Icon name="x" size={14} />
                        </button>
                    )}
                    <kbd className="searchbox-kbd">Ctrl K</kbd>
                    {focused && suggestions.length > 0 && (
                        <ul className="autocomplete">
                            {suggestions.map((s, i) => (
                                <li key={s.type + s.value}>
                                    <button
                                        className={`autocomplete-item ${i === activeIndex ? "active" : ""}`}
                                        onMouseEnter={() => setActiveIndex(i)}
                                        onClick={() => pick(s)}
                                    >
                                        <span className={`autocomplete-type type-${s.type}`}>{TYPE_LABEL[s.type]}</span>
                                        <span className="autocomplete-label">{s.label}</span>
                                        {s.count && <span className="autocomplete-count">{s.count} 个</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="navbar-actions">
                    {actions.map((a) => (
                        <button key={a.id} className="icon-btn navbar-action" title={a.title} aria-label={a.label}
                            onClick={() => onOpen(a.id)}>
                            <Icon name={a.icon} />
                        </button>
                    ))}
                    <button className="icon-btn navbar-action" onClick={onToggleTheme}
                        title="切换主题" aria-label="切换主题">
                        <Icon name={theme === "dark" ? "sun" : "moon"} />
                    </button>
                    <button className="icon-btn navbar-menu-btn" onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label="菜单">
                        <Icon name="menu" />
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="mobile-menu">
                    {actions.map((a) => (
                        <button key={a.id} onClick={() => { onOpen(a.id); setMobileMenuOpen(false); }}>
                            <Icon name={a.icon} size={16} />
                            {a.label}
                        </button>
                    ))}
                    <button onClick={() => { onToggleTheme(); setMobileMenuOpen(false); }}>
                        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
                        切换主题
                    </button>
                </div>
            )}
        </nav>
    );
}
