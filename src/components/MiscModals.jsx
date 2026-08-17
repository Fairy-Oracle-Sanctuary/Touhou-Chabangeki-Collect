import { useMemo, useState } from "react";
import { Modal, Icon, LazyImage } from "./ui.jsx";
import { getTranslators } from "../utils.js";
import { newcomerList } from "../data.js";
import { DEFAULT_SETTINGS } from "../hooks.js";

/* ---------------- 新人推荐 ---------------- */
export function NewcomerModal({ dramas, onClose, onOpenDetail, onToggleFilter }) {
    return (
        <Modal title="新人观看推荐" icon="sparkles" onClose={onClose} wide>
            <div className="newcomer-list">
                {newcomerList.map((item, index) => {
                    const drama = dramas.find((d) => d.id === item.id);
                    if (!drama) return null;
                    return (
                        <div key={item.id} className="newcomer-card">
                            <span className="newcomer-rank">{index + 1}</span>
                            <div className="newcomer-info">
                                <button className="newcomer-title" onClick={() => onOpenDetail(drama)}>{drama.title}</button>
                                <div className="newcomer-meta">
                                    <span>#{drama.id}</span>
                                    <span>·</span>
                                    <button onClick={() => { onToggleFilter("artist", drama.author); onClose(); }}>{drama.author}</button>
                                    <span>·</span>
                                    <span>{drama.dateAdded}</span>
                                </div>
                                <div className="newcomer-translator">
                                    {drama.isTranslated ? "已汉化" : "未汉化"}
                                    {getTranslators(drama).length > 0 && ` · 译者: ${getTranslators(drama).join("、")}`}
                                </div>
                                <div className="newcomer-reason">
                                    <p className="reason-title"><Icon name="bulb" size={14} /> 推荐理由</p>
                                    <p className="reason-text">{item.reason}</p>
                                </div>
                            </div>
                            <LazyImage src={drama.thumbnail} alt={drama.title} fallbackTitle={drama.title} className="newcomer-thumb" />
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}

/* ---------------- 批量操作 ---------------- */
export function BatchModal({ filteredCount, onClose, onBatchFavorite, onBatchUnfavorite, onExport }) {
    return (
        <Modal title="收藏批量操作" icon="layers" onClose={onClose}>
            <p className="batch-hint">对当前筛选出的 <strong>{filteredCount}</strong> 个作品执行批量操作：</p>
            <div className="batch-actions">
                <button className="btn-primary" onClick={() => { onBatchFavorite(); onClose(); }}>
                    <Icon name="heart" size={15} /> 批量收藏
                </button>
                <button className="btn-ghost" onClick={() => { onBatchUnfavorite(); onClose(); }}>
                    批量取消收藏
                </button>
                <button className="btn-ghost" onClick={() => { onExport(); onClose(); }}>
                    <Icon name="external" size={15} /> 导出收藏 JSON
                </button>
            </div>
        </Modal>
    );
}

/* ---------------- 快捷键说明 ---------------- */
export function ShortcutsModal({ onClose }) {
    const rows = [
        ["Ctrl + K", "聚焦搜索框"],
        ["Ctrl + Shift + F", "查看我的收藏"],
        ["Ctrl + M", "新人观看推荐"],
        ["Esc", "关闭弹窗 / 清空搜索"],
    ];
    return (
        <Modal title="键盘快捷键" icon="keyboard" onClose={onClose}>
            <div className="shortcuts">
                {rows.map(([key, desc]) => (
                    <div key={key} className="shortcut-row">
                        <kbd>{key}</kbd>
                        <span>{desc}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

/* ---------------- 个性化设置 ---------------- */
export function SettingsModal({ settings, onUpdate, onReset, onClose }) {
    const [draft, setDraft] = useState(settings);
    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

    return (
        <Modal
            title="个性化设置" icon="settings" onClose={onClose}
            footer={
                <>
                    <button className="btn-primary" onClick={() => { onUpdate(draft); onClose(); }}>保存设置</button>
                    <button className="btn-ghost" onClick={() => setDraft(DEFAULT_SETTINGS)}>恢复默认</button>
                </>
            }
        >
            <div className="settings">
                <div className="setting-row">
                    <label>卡片布局</label>
                    <div className="segmented">
                        <button className={draft.cardLayout === "grid" ? "active" : ""} onClick={() => set({ cardLayout: "grid" })}>
                            <Icon name="grid" size={15} /> 网格
                        </button>
                        <button className={draft.cardLayout === "list" ? "active" : ""} onClick={() => set({ cardLayout: "list" })}>
                            <Icon name="list" size={15} /> 列表
                        </button>
                    </div>
                </div>
                <div className="setting-row">
                    <label>每页数量</label>
                    <select value={draft.itemsPerPage} onChange={(e) => set({ itemsPerPage: e.target.value })}>
                        <option value="12">12 个</option>
                        <option value="24">24 个</option>
                        <option value="48">48 个</option>
                        <option value="all">全部</option>
                    </select>
                </div>
                <div className="setting-row">
                    <label>默认排序</label>
                    <select value={draft.defaultSort} onChange={(e) => set({ defaultSort: e.target.value })}>
                        <option value="date-desc">最新收录</option>
                        <option value="date-asc">最早收录</option>
                        <option value="name-asc">标题 A→Z</option>
                        <option value="name-desc">标题 Z→A</option>
                        <option value="id-asc">编号 升序</option>
                        <option value="id-desc">编号 降序</option>
                    </select>
                </div>
                <div className="setting-row">
                    <label>启用动画</label>
                    <label className="switch">
                        <input type="checkbox" checked={draft.enableAnimations} onChange={(e) => set({ enableAnimations: e.target.checked })} />
                        <span className="switch-slider" />
                    </label>
                </div>
            </div>
        </Modal>
    );
}

/* ---------------- 提交作品（生成 JSON） ---------------- */
const EMPTY = { title: "", author: "", translator: "", tags: "", isTranslated: "false", isDomestic: false, originalUrl: "", translatedUrl: "", thumbnail: "", description: "", dateAdded: "" };

export function SubmitModal({ dramas, onClose, onToast }) {
    const [form, setForm] = useState(EMPTY);
    const [json, setJson] = useState(null);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const suggestions = useMemo(() => ({
        authors: [...new Set(dramas.map((d) => d.author))].sort(),
        translators: [...new Set(dramas.flatMap((d) => getTranslators(d)))].sort(),
        tags: [...new Set(dramas.flatMap((d) => d.tags))].sort(),
    }), [dramas]);

    const submit = (e) => {
        e.preventDefault();
        const errors = [];
        if (!form.title.trim()) errors.push("请输入标题");
        if (!form.author.trim()) errors.push("请输入作者");
        if (!form.originalUrl.trim()) errors.push("请输入原版链接");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateAdded)) errors.push("日期格式不正确，请使用 YYYY-MM-DD");
        if (errors.length) {
            alert("请修正以下错误：\n" + errors.join("\n"));
            return;
        }
        const tags = form.tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
        setJson({
            id: "（自动分配）",
            title: form.title.trim(),
            author: form.author.trim(),
            translator: form.translator.trim(),
            tags,
            isTranslated: form.isTranslated === "true",
            isDomestic: form.isDomestic,
            originalUrl: form.originalUrl.trim(),
            translatedUrl: form.translatedUrl.trim(),
            description: form.description.trim(),
            thumbnail: form.thumbnail.trim() || `cover/（新ID）.jpg`,
            dateAdded: form.dateAdded,
        });
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(json, null, 4));
            onToast("JSON 已复制到剪贴板");
        } catch {
            onToast("复制失败，请手动复制");
        }
    };

    return (
        <Modal title="提交茶番剧" icon="upload" onClose={onClose} wide>
            <form className="submit-form" onSubmit={submit}>
                <div className="form-grid">
                    <label className="field">
                        <span>标题 *</span>
                        <input value={form.title} onChange={(e) => set({ title: e.target.value })} list="sug-authors-outer" placeholder="作品标题" />
                    </label>
                    <label className="field">
                        <span>作者 *</span>
                        <input value={form.author} onChange={(e) => set({ author: e.target.value })} list="sug-authors" placeholder="作者名" />
                        <datalist id="sug-authors">{suggestions.authors.map((a) => <option key={a} value={a} />)}</datalist>
                    </label>
                    <label className="field">
                        <span>译者</span>
                        <input value={form.translator} onChange={(e) => set({ translator: e.target.value })} list="sug-translators" placeholder="多人用 、 分隔" />
                        <datalist id="sug-translators">{suggestions.translators.map((t) => <option key={t} value={t} />)}</datalist>
                    </label>
                    <label className="field">
                        <span>标签</span>
                        <input value={form.tags} onChange={(e) => set({ tags: e.target.value })} list="sug-tags" placeholder="逗号分隔" />
                        <datalist id="sug-tags">{suggestions.tags.map((t) => <option key={t} value={t} />)}</datalist>
                    </label>
                    <label className="field">
                        <span>汉化状态</span>
                        <select value={form.isTranslated} onChange={(e) => set({ isTranslated: e.target.value })}>
                            <option value="false">未汉化</option>
                            <option value="true">已汉化</option>
                        </select>
                    </label>
                    <label className="field">
                        <span>国产作品</span>
                        <label className="switch">
                            <input type="checkbox" checked={form.isDomestic} onChange={(e) => set({ isDomestic: e.target.checked })} />
                            <span className="switch-slider" />
                        </label>
                    </label>
                    <label className="field">
                        <span>原版链接 *</span>
                        <input value={form.originalUrl} onChange={(e) => set({ originalUrl: e.target.value })} placeholder="https://..." />
                    </label>
                    <label className="field">
                        <span>汉化链接</span>
                        <input value={form.translatedUrl} onChange={(e) => set({ translatedUrl: e.target.value })} placeholder="https://..." />
                    </label>
                    <label className="field">
                        <span>封面图链接</span>
                        <input value={form.thumbnail} onChange={(e) => set({ thumbnail: e.target.value })} placeholder="留空则按封面规则生成" />
                    </label>
                    <label className="field">
                        <span>收录日期 *</span>
                        <input type="date" value={form.dateAdded} onChange={(e) => set({ dateAdded: e.target.value })} />
                    </label>
                    <label className="field field-full">
                        <span>简介</span>
                        <textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                    </label>
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn-primary">生成 JSON</button>
                    <button type="button" className="btn-ghost" onClick={() => { setForm(EMPTY); setJson(null); }}>重置</button>
                </div>
            </form>
            {json && (
                <div className="json-output">
                    <div className="json-head">
                        <span>生成的条目 JSON（复制后交给 data_manage_gui.py 添加）</span>
                        <button className="btn-primary" onClick={copy}><Icon name="copy" size={14} /> 复制</button>
                    </div>
                    <pre>{JSON.stringify(json, null, 4)}</pre>
                </div>
            )}
        </Modal>
    );
}
