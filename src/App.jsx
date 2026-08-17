import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Sidebar from "./components/Sidebar.jsx";
import DramaGrid from "./components/DramaGrid.jsx";
import DetailModal from "./components/DetailModal.jsx";
import TimelineModal from "./components/TimelineModal.jsx";
import StatsModal from "./components/StatsModal.jsx";
import PersonModal from "./components/PersonModal.jsx";
import { NewcomerModal, BatchModal, ShortcutsModal, SettingsModal, SubmitModal } from "./components/MiscModals.jsx";
import { Icon, Toast, useToast } from "./components/ui.jsx";
import { useFavorites, useSettings, useTheme } from "./hooks.js";
import { parseSearchInput, getTranslators } from "./utils.js";
import { dramas } from "./data.js";

const SORTERS = {
    "date-desc": (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded),
    "date-asc": (a, b) => new Date(a.dateAdded) - new Date(b.dateAdded),
    "name-asc": (a, b) => a.title.localeCompare(b.title, "zh"),
    "name-desc": (a, b) => b.title.localeCompare(a.title, "zh"),
    "id-asc": (a, b) => a.id - b.id,
    "id-desc": (a, b) => b.id - a.id,
};

export default function App() {
    const { theme, toggle: toggleTheme } = useTheme();
    const { favorites, isFavorite, toggle: toggleFavorite, batchFavorite, batchUnfavorite } = useFavorites();
    const { settings, update: updateSettings, reset: resetSettings } = useSettings();
    const { message: toast, show: showToast } = useToast();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState(settings.defaultSort);
    const [page, setPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [activeModal, setActiveModal] = useState(null); // timeline/charts/batch/settings/shortcuts/newcomer/submit
    const [person, setPerson] = useState(null); // { mode, type, name? }

    // 筛选 + 排序
    const filtered = useMemo(() => {
        const { tags, artists, translators, fuzzyTerm } = parseSearchInput(search);
        const result = dramas.filter((drama) => {
            if (statusFilter !== "all") {
                if (statusFilter === "translated" && !(drama.isTranslated && !drama.isDomestic)) return false;
                if (statusFilter === "untranslated" && !(!drama.isTranslated && !drama.isDomestic)) return false;
                if (statusFilter === "domestic" && !drama.isDomestic) return false;
                if (statusFilter === "favorites" && !isFavorite(drama.id)) return false;
            }
            if (tags.length && !tags.every((t) => drama.tags.some((tag) => tag.toLowerCase() === t))) return false;
            if (artists.length && !artists.every((a) => drama.author.toLowerCase() === a)) return false;
            if (translators.length) {
                const own = getTranslators(drama);
                if (!translators.every((t) => own.some((tr) => tr.toLowerCase() === t))) return false;
            }
            if (fuzzyTerm) {
                const inTitle = drama.title.toLowerCase().includes(fuzzyTerm);
                const inAuthor = drama.author.toLowerCase().includes(fuzzyTerm);
                const inTranslator = getTranslators(drama).some((t) => t.toLowerCase().includes(fuzzyTerm));
                const inTags = drama.tags.some((t) => t.toLowerCase().includes(fuzzyTerm));
                const inDesc = (drama.description || "").toLowerCase().includes(fuzzyTerm);
                if (!(inTitle || inAuthor || inTranslator || inTags || inDesc)) return false;
            }
            return true;
        });
        return result.sort(SORTERS[sortBy] || SORTERS["date-desc"]);
    }, [search, statusFilter, sortBy, favorites]);

    // 筛选变化时回到第一页
    useEffect(() => setPage(1), [search, statusFilter, sortBy, settings.itemsPerPage]);

    const pageSize = settings.itemsPerPage === "all" ? filtered.length : parseInt(settings.itemsPerPage, 10);
    const totalPages = pageSize > 0 ? Math.ceil(filtered.length / pageSize) : 1;
    const safePage = Math.min(page, totalPages);
    const pageDramas = pageSize > 0 ? filtered.slice((safePage - 1) * pageSize, safePage * pageSize) : filtered;

    // 切换搜索筛选语法（tag/artist/translator 互斥逻辑与旧版一致）
    const toggleFilter = (type, value) => {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const single = new RegExp(`${type}="${escaped}"`, "i");
        const any = new RegExp(`${type}="[^"]+"`, "gi");
        let next = search;
        if (single.test(next)) {
            next = next.replace(single, "");
        } else if (type === "artist" || type === "translator") {
            next = next.replace(any, "");
            next = `${next} ${type}="${value}"`;
        } else {
            next = `${next} ${type}="${value}"`;
        }
        setSearch(next.replace(/\s+/g, " ").trim());
    };

    const showFavorites = () => {
        setStatusFilter("favorites");
        document.getElementById("dramaGrid")?.scrollIntoView({ behavior: "smooth" });
    };

    const exportFavorites = () => {
        const favoriteDramas = dramas.filter((d) => favorites.includes(d.id));
        const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), totalCount: favoriteDramas.length, favorites: favoriteDramas }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `touhou-favorites-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`已导出 ${favoriteDramas.length} 个收藏作品`);
    };

    // 全局快捷键
    useEffect(() => {
        const onKey = (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.shiftKey && e.key === "F") {
                e.preventDefault();
                showFavorites();
            } else if (mod && e.key.toLowerCase() === "m") {
                e.preventDefault();
                setActiveModal("newcomer");
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const stats = useMemo(() => ({
        total: dramas.length,
        translated: dramas.filter((d) => d.isTranslated && !d.isDomestic).length,
        untranslated: dramas.filter((d) => !d.isTranslated && !d.isDomestic).length,
        domestic: dramas.filter((d) => d.isDomestic).length,
        favorites: favorites.length,
    }), [favorites]);

    const openModal = (id) => setActiveModal(id);

    return (
        <div className={`app ${settings.enableAnimations ? "" : "no-anim"}`}>
            <Header
                dramas={dramas}
                search={search}
                onSearchChange={setSearch}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpen={openModal}
            />
            <Hero stats={stats} />

            <div className="layout">
                <button className="sidebar-fab" onClick={() => setSidebarOpen(true)} aria-label="打开筛选">
                    <Icon name="filter" size={16} />
                    筛选
                </button>

                <Sidebar
                    dramas={dramas}
                    favoritesCount={favorites.length}
                    search={search}
                    onToggleFilter={toggleFilter}
                    onViewPerson={(type, name) => setPerson({ mode: "detail", type, name })}
                    onBrowse={(type) => setPerson({ mode: "browse", type })}
                    onShowFavorites={showFavorites}
                />

                <main className="content">
                    <div className="toolbar">
                        <button className="icon-btn mobile-filter-btn" onClick={() => setSidebarOpen(true)} aria-label="筛选">
                            <Icon name="filter" size={16} />
                        </button>
                        <h2 id="resultsTitle">
                            {statusFilter === "favorites" ? "我的收藏" : "全部作品"}
                        </h2>
                        <span className="results-count">
                            {filtered.length > 0
                                ? `显示 ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)} 个结果 (共 ${filtered.length} 个)`
                                : "暂无结果"}
                        </span>
                        <div className="toolbar-controls">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="状态筛选">
                                <option value="all">全部状态</option>
                                <option value="translated">已汉化</option>
                                <option value="untranslated">未汉化</option>
                                <option value="domestic">国产</option>
                                <option value="favorites">我的收藏</option>
                            </select>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="排序">
                                <option value="date-desc">最新收录</option>
                                <option value="date-asc">最早收录</option>
                                <option value="name-asc">标题 A→Z</option>
                                <option value="name-desc">标题 Z→A</option>
                                <option value="id-asc">编号 升序</option>
                                <option value="id-desc">编号 降序</option>
                            </select>
                        </div>
                    </div>

                    <div id="dramaGrid">
                        <DramaGrid
                            dramas={pageDramas}
                            layout={settings.cardLayout}
                            isFavorite={isFavorite}
                            onToggleFavorite={toggleFavorite}
                            onOpenDetail={setDetail}
                            onToggleFilter={toggleFilter}
                            noResultsTitle={statusFilter === "favorites" ? "暂无收藏作品" : "无搜索结果"}
                            noResultsText={statusFilter === "favorites" ? "点击作品卡片上的收藏按钮来添加收藏" : "请尝试调整关键词"}
                        />
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="上一页">
                                <Icon name="chevronLeft" size={15} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
                                .map((n, i, arr) => (
                                    <span key={n} className="page-group">
                                        {i > 0 && arr[i - 1] !== n - 1 && <span className="page-ellipsis">…</span>}
                                        <button className={`page-btn ${n === safePage ? "page-btn-active" : ""}`} onClick={() => setPage(n)}>
                                            {n}
                                        </button>
                                    </span>
                                ))}
                            <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label="下一页">
                                <Icon name="chevronRight" size={15} />
                            </button>
                        </div>
                    )}
                </main>
            </div>

            <footer className="footer">
                <div className="container">
                    <p>东方 Project 茶番剧收藏馆 · 共收录 {dramas.length} 部作品</p>
                    <p className="footer-sub">数据与图片来源见各条目链接 · 纯前端静态站点</p>
                </div>
            </footer>

            {/* 移动端侧边栏抽屉 */}
            {sidebarOpen && (
                <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSidebarOpen(false)}>
                    <div className="drawer">
                        <div className="drawer-head">
                            <span>筛选</span>
                            <button className="icon-btn" onClick={() => setSidebarOpen(false)} aria-label="关闭">
                                <Icon name="x" />
                            </button>
                        </div>
                        <Sidebar
                            dramas={dramas}
                            favoritesCount={favorites.length}
                            search={search}
                            onToggleFilter={(t, v) => { toggleFilter(t, v); }}
                            onViewPerson={(type, name) => { setSidebarOpen(false); setPerson({ mode: "detail", type, name }); }}
                            onBrowse={(type) => { setSidebarOpen(false); setPerson({ mode: "browse", type }); }}
                            onShowFavorites={() => { showFavorites(); setSidebarOpen(false); }}
                        />
                    </div>
                </div>
            )}

            <BackToTop />

            {detail && (
                <DetailModal
                    drama={detail}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onClose={() => setDetail(null)}
                    onOpenDetail={setDetail}
                    onToggleFilter={(t, v) => { toggleFilter(t, v); setDetail(null); }}
                />
            )}
            {activeModal === "timeline" && <TimelineModal dramas={dramas} onClose={() => setActiveModal(null)} onOpenDetail={setDetail} />}
            {activeModal === "charts" && <StatsModal dramas={dramas} theme={theme} onClose={() => setActiveModal(null)} />}
            {activeModal === "newcomer" && (
                <NewcomerModal dramas={dramas} onClose={() => setActiveModal(null)} onOpenDetail={setDetail} onToggleFilter={toggleFilter} />
            )}
            {activeModal === "batch" && (
                <BatchModal
                    filteredCount={filtered.length}
                    onClose={() => setActiveModal(null)}
                    onBatchFavorite={() => { batchFavorite(filtered.map((d) => d.id)); showToast(`已收藏 ${filtered.length} 个作品`); }}
                    onBatchUnfavorite={() => { batchUnfavorite(filtered.map((d) => d.id)); showToast(`已取消收藏 ${filtered.length} 个作品`); }}
                    onExport={exportFavorites}
                />
            )}
            {activeModal === "settings" && <SettingsModal settings={settings} onUpdate={updateSettings} onReset={resetSettings} onClose={() => setActiveModal(null)} />}
            {activeModal === "shortcuts" && <ShortcutsModal onClose={() => setActiveModal(null)} />}
            {activeModal === "submit" && <SubmitModal dramas={dramas} onClose={() => setActiveModal(null)} onToast={showToast} />}
            {person && (
                <PersonModal
                    mode={person.mode}
                    type={person.type}
                    name={person.name}
                    dramas={dramas}
                    onClose={() => setPerson(null)}
                    onOpenDetail={setDetail}
                    onToggleFilter={toggleFilter}
                />
            )}
            <Toast message={toast} />
        </div>
    );
}

function BackToTop() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 300);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return (
        <button className={`back-to-top ${visible ? "show" : ""}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="回到顶部">
            <Icon name="arrowUp" />
        </button>
    );
}
