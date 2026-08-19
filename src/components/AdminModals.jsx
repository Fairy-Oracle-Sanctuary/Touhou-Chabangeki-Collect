import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Icon } from "./ui.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { getTranslators } from "../utils.js";
import { dramas as allDramas } from "../data.js";
import { UserAvatar } from "./UsersPages.jsx";

const ROLE_OPTIONS = [
    { value: "admin", label: "管理员" },
    { value: "creator", label: "汉化者/作者" },
    { value: "user", label: "普通用户" },
];
const STATUS_LABEL = { pending: "待审核", approved: "已通过", rejected: "已拒绝", approved_no_publish: "已通过（未上线）" };

function SubInfo({ sub, emailMap }) {
    return (
        <div className="sub-info">
            <div className="sub-info-title">
                {sub.edit_drama_id != null && <span className="sub-tag">修改 #{sub.edit_drama_id}</span>}
                <strong>{sub.title}</strong>
                <span className={`sub-status sub-status-${sub.status}`}>{STATUS_LABEL[sub.status]}</span>
            </div>
            <div className="sub-info-grid">
                <span><i>作者</i>{sub.author}</span>
                <span><i>译者</i>{sub.translator || "—"}</span>
                <span><i>标签</i>{(sub.tags || []).join("、") || "—"}</span>
                <span><i>汉化</i>{sub.is_translated ? "已汉化" : "未汉化"}</span>
                <span><i>国产</i>{sub.is_domestic ? "是" : "否"}</span>
                <span><i>日期</i>{sub.date_added || "—"}</span>
            </div>
            {sub.original_url && <div className="sub-info-link"><i>原版</i><a href={sub.original_url} target="_blank" rel="noreferrer">{sub.original_url}</a></div>}
            {sub.translated_url && <div className="sub-info-link"><i>汉化</i><a href={sub.translated_url} target="_blank" rel="noreferrer">{sub.translated_url}</a></div>}
            {sub.thumbnail && <div className="sub-info-link"><i>封面</i><span className="sub-thumb-text">{sub.thumbnail}</span></div>}
            {sub.description && <div className="sub-info-desc"><i>简介</i>{sub.description}</div>}
            {sub.review_note && <div className="sub-info-note"><i>备注</i>{sub.review_note}</div>}
            <div className="sub-info-meta">
                提交人：{emailMap[sub.submitted_by] || "未知"} · {new Date(sub.created_at).toLocaleString()}
                {sub.reviewed_at && <> · 审核于 {new Date(sub.reviewed_at).toLocaleString()}</>}
            </div>
        </div>
    );
}

/* ============ 独立页公共壳（管理后台 / 我的作品） ============ */
function PageShell({ title, onBack, children }) {
    return (
        <div className="admin-page">
            <header className="admin-page-head">
                <div className="container admin-page-inner">
                    <button className="icon-btn" onClick={onBack} aria-label="返回主页" title="返回主页">
                        <Icon name="chevronLeft" />
                    </button>
                    <h1>{title}</h1>
                    <span className="admin-page-spacer" />
                </div>
            </header>
            <div className="container admin-page-body">{children}</div>
        </div>
    );
}

/* ============ 管理后台（管理员，独立页面 #/admin） ============ */
export function AdminPage({ user, dramas, onToast, onReloadDramas, onBack }) {
    const [tab, setTab] = useState("review");
    const [submissions, setSubmissions] = useState([]);
    const [users, setUsers] = useState([]);
    const [emailMap, setEmailMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [noteDrafts, setNoteDrafts] = useState({});
    const [nameDrafts, setNameDrafts] = useState({});
    const [avatarDrafts, setAvatarDrafts] = useState({});
    const [basicDrafts, setBasicDrafts] = useState({});
    // 作品管理
    const [dramaQuery, setDramaQuery] = useState("");
    const [editingDrama, setEditingDrama] = useState(null);
    // 审核编辑
    const [editingSub, setEditingSub] = useState(null);
    // 通过审核的选择弹窗（上线 / 仅通知）
    const [approveTarget, setApproveTarget] = useState(null);
    // 头像选择面板当前展开的用户 id
    const [avatarPicker, setAvatarPicker] = useState(null);
    // public/avatar/ 头像清单（由 vite 插件在构建时生成 index.json）
    const [avatarOptions, setAvatarOptions] = useState([]);

    useEffect(() => {
        let cancelled = false;
        fetch("avatar/index.json")
            .then((r) => (r.ok ? r.json() : []))
            .then((list) => { if (!cancelled) setAvatarOptions(Array.isArray(list) ? list : []); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: subs }, { data: profs }, { data: emails }] = await Promise.all([
                supabase.from("submissions").select("*").order("created_at", { ascending: false }),
                // email 列已对客户端撤销权限：用户列表只取公开列
                supabase.from("profiles").select("user_id, username, bio, avatar_url, role, creator_names, created_at").order("created_at", { ascending: false }),
                supabase.rpc("admin_user_emails"), // 邮箱仅管理员可通过 RPC 获取
            ]);
            setSubmissions(subs || []);
            setUsers(profs || []);
            const map = {};
            (emails || []).forEach((e) => { map[e.user_id] = e.email; });
            (profs || []).forEach((p) => { if (!map[p.user_id]) map[p.user_id] = p.username || "未知"; });
            setEmailMap(map);
        } catch (e) {
            console.error("[admin] 加载失败:", e);
            onToast("后台加载失败，请确认已执行数据库 SQL（profiles/submissions 表）");
        } finally {
            setLoading(false);
        }
    }, [onToast]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // data.js 中现有的全部作者/译者名，供别名下拉选择
    const allNames = useMemo(() => {
        const s = new Set();
        allDramas.forEach((d) => {
            if (d.author) s.add(d.author);
            getTranslators(d).forEach((t) => s.add(t));
        });
        return [...s].sort((a, b) => a.localeCompare(b, "zh"));
    }, []);

    // 审核通过/拒绝后给提交人发站内通知
    const notifyReviewResult = async (sub, status, note) => {
        const payload = {
            user_id: sub.submitted_by,
            type: status, // approved / approved_no_publish / rejected
            title: status === "rejected" ? "作品审核未通过" : "作品审核通过",
            body: status === "rejected"
                ? `你的提交《${sub.title}》未通过审核${note ? `，原因：${note}` : ""}`
                : status === "approved"
                    ? `你的提交《${sub.title}》已通过审核并上线`
                    : `你的提交《${sub.title}》已通过审核${note ? `（备注：${note}）` : ""}`,
            drama_id: sub.edit_drama_id ?? null,
        };
        const { error } = await supabase.from("notifications").insert(payload);
        if (error) console.error("[admin] 发送审核通知失败:", error.message);
    };

    const review = async (sub, status) => {
        const note = (noteDrafts[sub.id] || "").trim();
        const { error } = await supabase
            .from("submissions")
            .update({
                status,
                review_note: note || null,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id,
            })
            .eq("id", sub.id);
        if (error) {
            onToast("操作失败：" + error.message);
            return;
        }
        await notifyReviewResult(sub, status, note);
        onToast(status === "approved" ? "已通过，作品已上线" : status === "approved_no_publish" ? "已通过（未上线），作者已收到通知" : "已拒绝");
        loadAll();
        onReloadDramas();
    };

    const setRole = async (p, role) => {
        const { error } = await supabase.from("profiles").update({ role }).eq("user_id", p.user_id);
        if (error) {
            onToast("设置失败：" + error.message);
            return;
        }
        onToast(`已将 ${emailMap[p.user_id] || p.username} 设为${ROLE_OPTIONS.find((r) => r.value === role)?.label}`);
        loadAll();
    };

    const saveCreatorNames = async (p) => {
        const raw = (nameDrafts[p.user_id] ?? (p.creator_names || []).join("、"));
        const names = raw.split(/[,，、]/).map((n) => n.trim()).filter(Boolean);
        const { error } = await supabase.from("profiles").update({ creator_names: names }).eq("user_id", p.user_id);
        if (error) {
            onToast("保存失败：" + error.message);
            return;
        }
        onToast("作者别名已保存");
        loadAll();
    };

    // 编辑任意用户的用户名/简介（管理员）
    const saveBasic = async (p) => {
        const draft = basicDrafts[p.user_id] ?? {};
        const username = (draft.username ?? p.username ?? "").trim();
        if (!username) {
            onToast("用户名不能为空");
            return;
        }
        if (username.length > 20) {
            onToast("用户名最长 20 个字符");
            return;
        }
        const bio = (draft.bio ?? p.bio ?? "").trim();
        const { error } = await supabase
            .from("profiles")
            .update({ username, bio })
            .eq("user_id", p.user_id);
        if (error) {
            const msg = String(error.message || "").toLowerCase();
            onToast(msg.includes("duplicate") || msg.includes("unique") ? "该用户名已被占用" : "保存失败：" + error.message);
            return;
        }
        onToast("资料已更新");
        loadAll();
    };

    // 头像：仅管理员可通过 RPC 指定直链（客户端无直接更新权限）
    const saveAvatar = async (p) => {
        const url = (avatarDrafts[p.user_id] ?? p.avatar_url ?? "").trim();
        const { error } = await supabase.rpc("admin_set_avatar", { uid: p.user_id, url });
        if (error) {
            onToast("保存失败：" + error.message);
            return;
        }
        onToast("头像已更新");
        loadAll();
    };

    const pending = submissions.filter((s) => s.status === "pending");
    const handled = submissions.filter((s) => s.status !== "pending");

    // 作品搜索（标题/作者/译者）
    const filteredDramas = useMemo(() => {
        const q = dramaQuery.trim().toLowerCase();
        if (!q) return dramas;
        return dramas.filter((d) =>
            d.title.toLowerCase().includes(q)
            || d.author.toLowerCase().includes(q)
            || getTranslators(d).some((t) => t.toLowerCase().includes(q))
        );
    }, [dramas, dramaQuery]);

    return (
        <PageShell title="管理后台" onBack={onBack}>
            {editingSub && (
                <SubmissionEditModal
                    sub={editingSub}
                    onClose={() => setEditingSub(null)}
                    onToast={onToast}
                    onSaved={loadAll}
                />
            )}
            {editingDrama && (
                <EditDramaModal
                    drama={editingDrama}
                    user={user}
                    autoApprove
                    onClose={() => setEditingDrama(null)}
                    onToast={onToast}
                    onSubmitted={() => { onReloadDramas(); }}
                />
            )}
            {approveTarget && (
                <Modal title="审核通过" onClose={() => setApproveTarget(null)}>
                    <div className="review-approve-body">
                        <p>「{approveTarget.title}」已通过审核，请选择处理方式：</p>
                        <div className="review-approve-actions">
                            <button className="btn-primary" onClick={() => { review(approveTarget, "approved"); setApproveTarget(null); }}>
                                <Icon name="check" size={14} /> 通过并上线
                            </button>
                            <button className="btn-ghost" onClick={() => { review(approveTarget, "approved_no_publish"); setApproveTarget(null); }}>
                                仅通过（不上线）
                            </button>
                        </div>
                        <p className="review-approve-hint">「仅通过」会通知作者审核已通过，但不会把作品合并到站点（适合已在本地 data.js 中维护的情况）。</p>
                    </div>
                </Modal>
            )}
            <div className="admin-tabs">
                <button className={`admin-tab ${tab === "review" ? "active" : ""}`} onClick={() => setTab("review")}>
                    审核 {pending.length > 0 && <span className="admin-badge">{pending.length}</span>}
                </button>
                <button className={`admin-tab ${tab === "dramas" ? "active" : ""}`} onClick={() => setTab("dramas")}>
                    作品管理
                </button>
                <button className={`admin-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
                    用户管理
                </button>
                <button className={`admin-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
                    已处理
                </button>
            </div>

            {loading && <p className="admin-empty">加载中…</p>}

            {tab === "review" && !loading && (
                pending.length === 0 ? (
                    <p className="admin-empty">没有待审核的提交</p>
                ) : (
                    <div className="admin-list">
                        {pending.map((sub) => (
                            <div key={sub.id} className="admin-card">
                                <SubInfo sub={sub} emailMap={emailMap} />
                                <div className="admin-review-actions">
                                    <input
                                        className="admin-note-input"
                                        placeholder="审核备注（可选）"
                                        value={noteDrafts[sub.id] || ""}
                                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [sub.id]: e.target.value }))}
                                    />
                                    <button className="btn-ghost" onClick={() => setEditingSub(sub)}>
                                        <Icon name="edit" size={14} /> 编辑
                                    </button>
                                    <button className="btn-primary" onClick={() => setApproveTarget(sub)}>
                                        <Icon name="check" size={14} /> 通过
                                    </button>
                                    <button className="btn-ghost btn-danger" onClick={() => review(sub, "rejected")}>
                                        <Icon name="x" size={14} /> 拒绝
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {tab === "history" && !loading && (
                handled.length === 0 ? (
                    <p className="admin-empty">暂无已处理的记录</p>
                ) : (
                    <div className="admin-list">
                        {handled.map((sub) => (
                            <div key={sub.id} className="admin-card">
                                <SubInfo sub={sub} emailMap={emailMap} />
                            </div>
                        ))}
                    </div>
                )
            )}

            {tab === "dramas" && (
                <>
                    <div className="users-toolbar">
                        <input
                            className="admin-note-input"
                            placeholder="搜索标题 / 作者 / 译者…"
                            value={dramaQuery}
                            onChange={(e) => setDramaQuery(e.target.value)}
                        />
                        <span className="admin-count">共 {filteredDramas.length} 个作品</span>
                    </div>
                    {filteredDramas.length === 0 ? (
                        <p className="admin-empty">没有匹配的作品</p>
                    ) : (
                        <div className="admin-drama-list">
                            {filteredDramas.map((d) => (
                                <div key={d.id} className="mywork-card">
                                    <span className="mywork-id">#{d.id}</span>
                                    <div className="mywork-info">
                                        <strong>{d.title}</strong>
                                        <span className="user-info-email">{d.author} · {getTranslators(d).join("、") || "无译者"}</span>
                                    </div>
                                    <button className="btn-ghost" onClick={() => setEditingDrama(d)}>
                                        <Icon name="edit" size={14} /> 编辑
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === "users" && !loading && (
                <div className="admin-list">
                    {users.map((p) => (
                        <div key={p.user_id} className="admin-card admin-user-card">
                            <div className="admin-user-head">
                                <div className="admin-user-id">
                                    <strong>{p.username || "（未设置用户名）"}</strong>
                                    <span className="user-info-email">{emailMap[p.user_id]}</span>
                                </div>
                                <select value={p.role} onChange={(e) => setRole(p, e.target.value)} className="admin-role-select">
                                    {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="admin-user-names">
                                <span>用户名 / 个人简介（管理员可编辑）：</span>
                                <input
                                    className="admin-note-input"
                                    placeholder="用户名（最长 20 字）"
                                    maxLength={20}
                                    value={basicDrafts[p.user_id]?.username ?? p.username ?? ""}
                                    onChange={(e) => setBasicDrafts((d) => ({ ...d, [p.user_id]: { ...(d[p.user_id] || {}), username: e.target.value } }))}
                                />
                                <textarea
                                    className="admin-note-input"
                                    rows={2}
                                    placeholder="个人简介"
                                    maxLength={200}
                                    value={basicDrafts[p.user_id]?.bio ?? p.bio ?? ""}
                                    onChange={(e) => setBasicDrafts((d) => ({ ...d, [p.user_id]: { ...(d[p.user_id] || {}), bio: e.target.value } }))}
                                />
                                <div className="admin-names-row">
                                    <button className="btn-ghost" onClick={() => saveBasic(p)}>保存资料</button>
                                </div>
                            </div>
                            <div className="admin-user-names">
                                <span>作者/译者别名（用 、 分隔，用于匹配"我的作品"）：</span>
                                <div className="admin-names-row">
                                    <select
                                        className="admin-note-input"
                                        value=""
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            if (!name) return;
                                            const cur = nameDrafts[p.user_id] ?? (p.creator_names || []).join("、");
                                            const list = cur.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
                                            if (!list.includes(name)) list.push(name);
                                            setNameDrafts((d) => ({ ...d, [p.user_id]: list.join("、") }));
                                        }}
                                    >
                                        <option value="">从现有作者/译者中选择…</option>
                                        {allNames.map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div className="admin-names-row">
                                    <input
                                        className="admin-note-input"
                                        placeholder="如：ささきの茶釜、就是很一般"
                                        value={nameDrafts[p.user_id] ?? (p.creator_names || []).join("、")}
                                        onChange={(e) => setNameDrafts((d) => ({ ...d, [p.user_id]: e.target.value }))}
                                    />
                                    <button className="btn-ghost" onClick={() => saveCreatorNames(p)}>保存</button>
                                </div>
                            </div>
                            <div className="admin-user-names">
                                <span>头像链接（仅管理员可指定直链，建议只给创作者/管理员配置）：</span>
                                <div className="admin-names-row">
                                    <UserAvatar profile={{ ...p, avatar_url: avatarDrafts[p.user_id] ?? p.avatar_url ?? "" }} size={32} />
                                    <input
                                        className="admin-note-input"
                                        placeholder="avatar/1.webp 或 https://..."
                                        value={avatarDrafts[p.user_id] ?? p.avatar_url ?? ""}
                                        onChange={(e) => setAvatarDrafts((d) => ({ ...d, [p.user_id]: e.target.value }))}
                                    />
                                    <button className="btn-ghost" onClick={() => saveAvatar(p)}>保存</button>
                                </div>
                                <div className="admin-names-row">
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => setAvatarPicker(avatarPicker === p.user_id ? null : p.user_id)}
                                    >
                                        选择本地头像 ▾
                                    </button>
                                </div>
                                {avatarPicker === p.user_id && (
                                    <div className="avatar-pick-grid">
                                        {avatarOptions.length === 0 ? (
                                            <p className="avatar-pick-empty">头像清单未生成，请重启开发服务器或重新构建</p>
                                        ) : (
                                            avatarOptions.map((a) => (
                                                <button
                                                    key={a}
                                                    type="button"
                                                    className={`avatar-pick-item ${(avatarDrafts[p.user_id] ?? p.avatar_url ?? "") === a ? "active" : ""}`}
                                                    title={a}
                                                    onClick={() => {
                                                        setAvatarDrafts((d) => ({ ...d, [p.user_id]: a }));
                                                        setAvatarPicker(null);
                                                    }}
                                                >
                                                    <img src={a} alt="" loading="lazy" />
                                                    <span>{a.replace("avatar/", "")}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="sub-info-meta">注册时间：{new Date(p.created_at).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </PageShell>
    );
}

/* ============ 审核时编辑提交内容（管理员修改 pending submission 后通过） ============ */
export function SubmissionEditModal({ sub, onClose, onToast, onSaved }) {
    const [form, setForm] = useState(() => ({
        title: sub.title,
        author: sub.author,
        translator: sub.translator || "",
        tags: (sub.tags || []).join("、"),
        isTranslated: String(sub.is_translated),
        isDomestic: Boolean(sub.is_domestic),
        originalUrl: sub.original_url || "",
        translatedUrl: sub.translated_url || "",
        thumbnail: sub.thumbnail || "",
        description: sub.description || "",
        dateAdded: sub.date_added || "",
    }));
    const [saving, setSaving] = useState(false);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const submit = async (e) => {
        e.preventDefault();
        const errors = [];
        if (!form.title.trim()) errors.push("请输入标题");
        if (!form.author.trim()) errors.push("请输入作者");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateAdded)) errors.push("日期格式不正确，请使用 YYYY-MM-DD");
        if (errors.length) {
            alert("请修正以下错误：\n" + errors.join("\n"));
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase
                .from("submissions")
                .update({
                    title: form.title.trim(),
                    author: form.author.trim(),
                    translator: form.translator.trim(),
                    tags: form.tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean),
                    is_translated: form.isTranslated === "true",
                    is_domestic: form.isDomestic,
                    original_url: form.originalUrl.trim(),
                    translated_url: form.translatedUrl.trim(),
                    thumbnail: form.thumbnail.trim(),
                    description: form.description.trim(),
                    date_added: form.dateAdded,
                })
                .eq("id", sub.id);
            if (error) throw error;
            onToast("提交内容已更新");
            onSaved?.();
            onClose();
        } catch (err) {
            onToast("保存失败：" + (err?.message || "未知错误"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`编辑提交 #${sub.id}`} icon="edit" onClose={onClose} wide>
            <form className="submit-form" onSubmit={submit}>
                <div className="form-grid">
                    <label className="field">
                        <span>标题 *</span>
                        <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="作品标题" />
                    </label>
                    <label className="field">
                        <span>作者 *</span>
                        <input value={form.author} onChange={(e) => set({ author: e.target.value })} placeholder="作者名" />
                    </label>
                    <label className="field">
                        <span>译者</span>
                        <input value={form.translator} onChange={(e) => set({ translator: e.target.value })} placeholder="多人用 、 分隔" />
                    </label>
                    <label className="field">
                        <span>标签</span>
                        <input value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="逗号分隔" />
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
                        <input value={form.thumbnail} onChange={(e) => set({ thumbnail: e.target.value })} placeholder="图片直链（可选）" />
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
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? "保存中…" : "保存修改"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
                </div>
            </form>
        </Modal>
    );
}

/* ============ 编辑作品（创作者修改待审核；管理员 autoApprove 直接生效） ============ */
export function EditDramaModal({ drama, user, onClose, onToast, onSubmitted, autoApprove = false }) {
    const [form, setForm] = useState(() => ({
        title: drama.title,
        author: drama.author,
        translator: drama.translator || "",
        tags: (drama.tags || []).join("、"),
        isTranslated: String(drama.isTranslated),
        isDomestic: Boolean(drama.isDomestic),
        originalUrl: drama.originalUrl || "",
        translatedUrl: drama.translatedUrl || "",
        thumbnail: drama.thumbnail || "",
        description: drama.description || "",
        dateAdded: drama.dateAdded || "",
    }));
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    if (done) {
        return (
            <Modal title="修改作品" icon="edit" onClose={onClose}>
                <div className="auth-notice">
                    <div className="auth-notice-icon"><Icon name="check" size={28} /></div>
                    {autoApprove ? (
                        <>
                            <p>修改已直接生效！</p>
                            <p className="auth-notice-sub">站点已展示更新后的信息。</p>
                        </>
                    ) : (
                        <>
                            <p>修改已提交，等待管理员审核。</p>
                            <p className="auth-notice-sub">审核通过后站点将展示更新后的信息。</p>
                        </>
                    )}
                    <div className="auth-actions">
                        <button className="btn-primary" onClick={onClose}>完成</button>
                    </div>
                </div>
            </Modal>
        );
    }

    const submit = async (e) => {
        e.preventDefault();
        const errors = [];
        if (!form.title.trim()) errors.push("请输入标题");
        if (!form.author.trim()) errors.push("请输入作者");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateAdded)) errors.push("日期格式不正确");
        if (errors.length) {
            alert("请修正以下错误：\n" + errors.join("\n"));
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase.from("submissions").insert({
                edit_drama_id: drama.id,
                title: form.title.trim(),
                author: form.author.trim(),
                translator: form.translator.trim(),
                tags: form.tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean),
                is_translated: form.isTranslated === "true",
                is_domestic: form.isDomestic,
                original_url: form.originalUrl.trim(),
                translated_url: form.translatedUrl.trim(),
                thumbnail: form.thumbnail.trim(),
                description: form.description.trim(),
                date_added: form.dateAdded,
                submitted_by: user.id,
                // 管理员直接编辑：立即标记为已通过
                ...(autoApprove ? { status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() } : {}),
            });
            if (error) throw error;
            setDone(true);
            onToast(autoApprove ? "修改已直接生效" : "修改已提交，等待审核");
            onSubmitted?.();
        } catch (err) {
            onToast("提交失败：" + (err?.message || "未知错误"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal title={`修改作品 #${drama.id}`} icon="edit" onClose={onClose} wide>
            <form className="submit-form" onSubmit={submit}>
                <div className="form-grid">
                    <label className="field">
                        <span>标题 *</span>
                        <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="作品标题" />
                    </label>
                    <label className="field">
                        <span>作者 *</span>
                        <input value={form.author} onChange={(e) => set({ author: e.target.value })} placeholder="作者名" />
                    </label>
                    <label className="field">
                        <span>译者</span>
                        <input value={form.translator} onChange={(e) => set({ translator: e.target.value })} placeholder="多人用 、 分隔" />
                    </label>
                    <label className="field">
                        <span>标签</span>
                        <input value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="逗号分隔" />
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
                        <input value={form.thumbnail} onChange={(e) => set({ thumbnail: e.target.value })} placeholder="图片直链（可选）" />
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
                    <button type="submit" className="btn-primary" disabled={submitting}>
                        {submitting ? "提交中…" : "提交修改（待审核）"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
                </div>
            </form>
        </Modal>
    );
}

/* ============ 我的作品（汉化者/作者，独立页面 #/myworks） ============ */
export function MyWorksPage({ profile, dramas, user, onToast, onBack }) {
    const [editing, setEditing] = useState(null);
    const [mySubs, setMySubs] = useState([]);

    const names = profile?.creator_names || [];
    const myWorks = useMemo(() => {
        if (!names.length) return [];
        const set = new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean));
        return dramas.filter((d) => {
            if (set.has(String(d.author).toLowerCase())) return true;
            return getTranslators(d).some((t) => set.has(t.toLowerCase()));
        });
    }, [dramas, names]);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        supabase
            .from("submissions")
            .select("*")
            .eq("submitted_by", user.id)
            .order("created_at", { ascending: false })
            .then(({ data }) => { if (!cancelled) setMySubs(data || []); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [user]);

    const refreshSubs = () => {
        if (!user) return;
        supabase
            .from("submissions")
            .select("*")
            .eq("submitted_by", user.id)
            .order("created_at", { ascending: false })
            .then(({ data }) => setMySubs(data || []))
            .catch(() => {});
    };

    return (
        <PageShell title="我的作品" onBack={onBack}>
            {editing && (
                <EditDramaModal
                    drama={editing}
                    user={user}
                    onClose={() => setEditing(null)}
                    onToast={onToast}
                    onSubmitted={refreshSubs}
                />
            )}

            {names.length === 0 ? (
                <div className="auth-notice">
                    <div className="auth-notice-icon"><Icon name="info" size={28} /></div>
                    <p>管理员还未为你绑定作者/译者别名。</p>
                    <p className="auth-notice-sub">请联系管理员在后台「用户管理」中为你设置别名，即可管理自己的作品。</p>
                    <div className="auth-actions">
                        <button className="btn-primary" onClick={onBack}>返回主页</button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="batch-hint">别名：<strong>{names.join("、")}</strong> · 匹配到 <strong>{myWorks.length}</strong> 个作品（可修改信息，提交后待管理员审核）</p>
                    {myWorks.length === 0 ? (
                        <p className="admin-empty">没有匹配到作品</p>
                    ) : (
                        <div className="myworks-list">
                            {myWorks.map((d) => (
                                <div key={d.id} className="mywork-card">
                                    <span className="mywork-id">#{d.id}</span>
                                    <div className="mywork-info">
                                        <strong>{d.title}</strong>
                                        <span className="user-info-email">{d.author} · {getTranslators(d).join("、") || "无译者"}</span>
                                    </div>
                                    <button className="btn-ghost" onClick={() => setEditing(d)}>
                                        <Icon name="edit" size={14} /> 修改信息
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {mySubs.length > 0 && (
                        <div className="myworks-submissions">
                            <h3>我的修改/提交记录</h3>
                            {mySubs.map((s) => (
                                <div key={s.id} className="mywork-sub">
                                    <span className="mywork-sub-title">
                                        {s.edit_drama_id != null ? `修改 #${s.edit_drama_id}：` : "新提交："}{s.title}
                                    </span>
                                    <span className={`sub-status sub-status-${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
                                    <span className="user-info-email">{new Date(s.created_at).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </PageShell>
    );
}
