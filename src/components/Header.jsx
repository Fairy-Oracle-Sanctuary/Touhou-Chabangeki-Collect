import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./ui.jsx";
import { getTranslators } from "../utils.js";
import { isAuthConfigured } from "../lib/supabaseClient.js";

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
const ROLE_LABEL = { admin: "管理员", creator: "汉化者 · 作者", user: "会员" };

function fmtNotifTime(iso) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} 天前`;
    return d.toLocaleDateString();
}

export default function Header({
    dramas,
    search,
    onSearchChange,
    theme,
    onToggleTheme,
    onOpen,
    user,
    displayName,
    initials,
    avatarUrl,
    role,
    onOpenAuth,
    onSignOut,
    onOpenProfile,
    onOpenMyWorks,
    onOpenAdmin,
    onOpenUsers,
    notifications,
    unreadCount,
    onMarkRead,
    onMarkAllRead,
    onRemoveNotify,
    onOpenNotify,
    pendingReviews,
}) {
    const inputRef = useRef(null);
    const boxRef = useRef(null);
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const userMenuRef = useRef(null);
    const notifRef = useRef(null);

    // 点外关闭用户菜单
    useEffect(() => {
        if (!userMenuOpen) return;
        const onClick = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [userMenuOpen]);

    // 点外关闭通知面板
    useEffect(() => {
        if (!notifOpen) return;
        const onClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [notifOpen]);

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
                    <button className="icon-btn navbar-action" onClick={onOpenUsers}
                        title="用户列表" aria-label="用户列表">
                        <Icon name="users" />
                    </button>

                    {isAuthConfigured && user && (
                        <div className="bell-wrap" ref={notifRef}>
                            <button className="icon-btn bell-btn" onClick={() => setNotifOpen((v) => !v)}
                                title="通知" aria-label="通知">
                                <Icon name="bell" />
                                {unreadCount > 0 && <span className="bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                            </button>
                            {notifOpen && (
                                <div className="notif-panel">
                                    <div className="notif-head">
                                        <span>通知</span>
                                        {unreadCount > 0 && (
                                            <button className="notif-action" onClick={onMarkAllRead}>全部已读</button>
                                        )}
                                    </div>
                                    <div className="notif-list">
                                        {notifications.length === 0 ? (
                                            <p className="notif-empty">暂无通知</p>
                                        ) : (
                                            notifications.map((n) => (
                                                <div key={n.id} className={`notif-item ${n.read ? "" : "notif-unread"}`}
                                                    onClick={() => { if (!n.read) onMarkRead(n.id); onOpenNotify(n); setNotifOpen(false); }}>
                                                    <div className="notif-title">{n.title}</div>
                                                    {n.body && <div className="notif-body">{n.body}</div>}
                                                    <div className="notif-meta">{fmtNotifTime(n.created_at)}</div>
                                                    <button className="notif-del" onClick={(e) => { e.stopPropagation(); onRemoveNotify(n.id); }} aria-label="删除通知">
                                                        <Icon name="x" size={12} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button className="icon-btn navbar-action" onClick={onToggleTheme}
                        title="切换主题" aria-label="切换主题">
                        <Icon name={theme === "dark" ? "sun" : "moon"} />
                    </button>

                    {isAuthConfigured && !user && (
                        <button className="auth-login-btn" onClick={onOpenAuth} title="登录 / 注册">
                            <Icon name="user" size={15} />
                            <span>登录</span>
                        </button>
                    )}
                    {isAuthConfigured && user && (
                        <div className="user-menu-wrap" ref={userMenuRef}>
                            <button className="user-avatar" onClick={() => setUserMenuOpen((v) => !v)}
                                title={user.email} aria-label="用户菜单">
                                {avatarUrl ? <img className="user-avatar-img" src={avatarUrl} alt="" /> : initials}
                                {pendingReviews > 0 && (
                                    <span className="avatar-badge" title={`${pendingReviews} 条待审核`} />
                                )}
                            </button>
                            {userMenuOpen && (
                                <div className="user-dropdown" role="menu">
                                    <div className="user-info">
                                        <span className="user-info-name">{displayName}</span>
                                        {role && <span className={`user-role user-role-${role}`}>{ROLE_LABEL[role] || role}</span>}
                                        <span className="user-info-email">{user.email}</span>
                                    </div>
                                    <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); onOpenProfile(); }}>
                                        <Icon name="user" size={15} />
                                        个人资料
                                    </button>
                                    {(role === "creator" || role === "admin") && (
                                        <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); onOpenMyWorks(); }}>
                                            <Icon name="edit" size={15} />
                                            我的作品
                                        </button>
                                    )}
                                    {role === "admin" && (
                                        <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); onOpenAdmin(); }}>
                                            <Icon name="shield" size={15} />
                                            管理后台
                                        </button>
                                    )}
                                    <button className="user-dropdown-item" onClick={() => { onSignOut(); setUserMenuOpen(false); }}>
                                        <Icon name="logout" size={15} />
                                        退出登录
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button className="icon-btn navbar-menu-btn" onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label="菜单">
                        <Icon name="menu" />
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="mobile-menu open">
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
                    <button onClick={() => { onOpenUsers(); setMobileMenuOpen(false); }}>
                        <Icon name="users" size={16} />
                        用户列表
                    </button>
                    {isAuthConfigured && !user && (
                        <button onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}>
                            <Icon name="user" size={16} />
                            登录 / 注册
                        </button>
                    )}
                    {isAuthConfigured && user && (
                        <>
                            <div className="mobile-user-info">
                                <span className="user-info-name">{displayName}</span>
                                <span className="user-info-email">{user.email}</span>
                            </div>
                            <button onClick={() => { onSignOut(); setMobileMenuOpen(false); }}>
                                <Icon name="logout" size={16} />
                                退出登录
                            </button>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
