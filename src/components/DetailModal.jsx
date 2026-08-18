import { useEffect, useRef, useState } from "react";
import { Modal, Icon, LazyImage, StatusBadge } from "./ui.jsx";
import { getDramaStatus, getTranslators, getRelatedWorks } from "../utils.js";
import { dramas as allDramas, authorLinks } from "../data.js";
import { supabase } from "../lib/supabaseClient.js";
import { UserAvatar } from "./UsersPages.jsx";

function MetaLink({ name, type, onToggleFilter }) {
    const link = authorLinks[name];
    if (link) {
        return (
            <a className="meta-link" href={link} target="_blank" rel="noopener noreferrer">{name}</a>
        );
    }
    return (
        <button className="meta-link" onClick={() => onToggleFilter(type, name)}>{name}</button>
    );
}

function fmtTime(iso) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return d.toLocaleDateString();
}

export default function DetailModal({
    drama,
    isFavorite,
    onToggleFavorite,
    onClose,
    onOpenDetail,
    onToggleFilter,
    user,
    profile,
    onOpenAuth,
    onStatsUpdate,
}) {
    const PAGE_SIZE = 20;
    const [stats, setStats] = useState({ likes: 0, favorites: 0 });
    const [liked, setLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [myComment, setMyComment] = useState(null);
    const [totalComments, setTotalComments] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [userMap, setUserMap] = useState({});
    const [commentText, setCommentText] = useState("");
    const [commentBusy, setCommentBusy] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [editBusy, setEditBusy] = useState(false);
    const [commentError, setCommentError] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        if (!drama) return;
        setEditingId(null);
        setEditText("");
        setCommentError("");
        setHasMore(false);
        let cancelled = false;
        (async () => {
            try {
                const myQuery = user
                    ? supabase.from("comments").select("*").eq("drama_id", drama.id).eq("user_id", user.id).limit(1).maybeSingle()
                    : Promise.resolve({ data: null });
                const [{ count: likes }, { count: favorites }, { count: cTotal }, { data: cData }, { data: mine }] = await Promise.all([
                    supabase.from("likes").select("id", { count: "exact", head: true }).eq("drama_id", drama.id),
                    supabase.from("favorites").select("id", { count: "exact", head: true }).eq("drama_id", drama.id),
                    supabase.from("comments").select("id", { count: "exact", head: true }).eq("drama_id", drama.id),
                    supabase.from("comments").select("*").eq("drama_id", drama.id).order("created_at", { ascending: true }).range(0, PAGE_SIZE - 1),
                    myQuery,
                ]);
                if (cancelled) return;
                setStats({ likes: likes ?? 0, favorites: favorites ?? 0 });
                setComments(cData || []);
                setHasMore((cData || []).length === PAGE_SIZE);
                setTotalComments(cTotal ?? 0);
                setMyComment(mine || null);
                const ids = [...new Set((cData || []).map((c) => c.user_id))];
                if (mine) ids.push(mine.user_id);
                if (ids.length) {
                    const { data: profs } = await supabase
                        .from("profiles")
                        .select("user_id, username, avatar_url")
                        .in("user_id", ids);
                    const map = {};
                    (profs || []).forEach((p) => { map[p.user_id] = p; });
                    setUserMap(map);
                }
                if (user) {
                    const { data: myLikes } = await supabase
                        .from("likes")
                        .select("id")
                        .eq("drama_id", drama.id)
                        .eq("user_id", user.id);
                    setLiked((myLikes || []).length > 0);
                } else {
                    setLiked(false);
                }
            } catch (e) {
                console.error("[detail] 社交数据加载失败:", e);
            }
        })();
        return () => { cancelled = true; };
    }, [drama?.id, user?.id]);

    if (!drama) return null;

    const status = getDramaStatus(drama);
    const translators = getTranslators(drama);
    const related = getRelatedWorks(allDramas, drama);
    const hasTranslatedLink = drama.isTranslated && drama.translatedUrl && !drama.isDomestic;
    const showComments = myComment && !comments.some((c) => c.id === myComment.id)
        ? [...comments, myComment]
        : comments;

    const toggleLike = async () => {
        if (!user) { onOpenAuth(); return; }
        const newLikes = liked ? Math.max(0, stats.likes - 1) : stats.likes + 1;
        if (liked) {
            await supabase.from("likes").delete().eq("drama_id", drama.id).eq("user_id", user.id);
        } else {
            await supabase.from("likes").insert({ drama_id: drama.id, user_id: user.id });
        }
        setLiked(!liked);
        setStats((s) => ({ ...s, likes: newLikes }));
        onStatsUpdate?.(drama.id, { likes: newLikes });
    };

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const from = comments.length;
            const { data, error } = await supabase
                .from("comments")
                .select("*")
                .eq("drama_id", drama.id)
                .order("created_at", { ascending: true })
                .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            const rows = data || [];
            setComments((prev) => [...prev, ...rows]);
            setHasMore(rows.length === PAGE_SIZE);
            if (rows.length) {
                const ids = [...new Set(rows.map((c) => c.user_id))];
                const { data: profs } = await supabase
                    .from("profiles")
                    .select("user_id, username, avatar_url")
                    .in("user_id", ids);
                const map = {};
                (profs || []).forEach((p) => { map[p.user_id] = p; });
                setUserMap((m) => ({ ...m, ...map }));
            }
        } catch (e) {
            console.error("[detail] 加载更多评论失败:", e);
        } finally {
            setLoadingMore(false);
        }
    };

    const addComment = async (e) => {
        e.preventDefault();
        if (!user) { onOpenAuth(); return; }
        const text = commentText.trim();
        if (!text) return;
        setCommentBusy(true);
        setCommentError("");
        try {
            const { data, error } = await supabase
                .from("comments")
                .insert({ drama_id: drama.id, user_id: user.id, content: text })
                .select()
                .single();
            if (error) throw error;
            setCommentText("");
            setMyComment(data);
            setTotalComments((t) => t + 1);
            setComments((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
            setUserMap((m) => ({
                ...m,
                [user.id]: {
                    user_id: user.id,
                    username: profile?.username || user.email?.split("@")[0] || "用户",
                    avatar_url: profile?.avatar_url || "",
                },
            }));
        } catch (err) {
            console.error("[detail] 评论失败:", err);
            if (err?.code === "23505") {
                setCommentError("你已在本作品下发表过评论，可直接在下方编辑或删除");
                setCommentText("");
                const { data: mine } = await supabase
                    .from("comments")
                    .select("*")
                    .eq("drama_id", drama.id)
                    .eq("user_id", user.id)
                    .limit(1)
                    .maybeSingle();
                if (mine) setMyComment(mine);
            }
        } finally {
            setCommentBusy(false);
        }
    };

    const startEdit = (c) => {
        setEditingId(c.id);
        setEditText(c.content);
        setCommentError("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText("");
    };

    const saveEdit = async (c) => {
        const text = editText.trim();
        if (!text) return;
        setEditBusy(true);
        try {
            const { data, error } = await supabase
                .from("comments")
                .update({ content: text })
                .eq("id", c.id)
                .select()
                .single();
            if (error) throw error;
            setComments((prev) => prev.map((x) => (x.id === c.id ? data : x)));
            if (myComment?.id === c.id) setMyComment(data);
            setEditingId(null);
            setEditText("");
        } catch (err) {
            console.error("[detail] 编辑评论失败:", err);
        } finally {
            setEditBusy(false);
        }
    };

    const removeComment = async (c) => {
        const canDelete = c.user_id === user?.id || profile?.role === "admin";
        if (!canDelete) return;
        await supabase.from("comments").delete().eq("id", c.id);
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setTotalComments((t) => Math.max(0, t - 1));
        if (myComment?.id === c.id) setMyComment(null);
    };

    return (
        <Modal title="作品详情" icon="play" onClose={onClose} wide>
            <div className="detail">
                <div className="detail-main">
                    <LazyImage src={drama.thumbnail} alt={drama.title} fallbackTitle={drama.title} className="detail-thumb" />
                    <div className="detail-info">
                        <div className="detail-title-row">
                            <h3>{drama.title}</h3>
                            <StatusBadge status={status} size="lg" />
                        </div>
                        <dl className="detail-meta">
                            <div className="meta-row">
                                <dt>作者</dt>
                                <dd><MetaLink name={drama.author} type="artist" onToggleFilter={onToggleFilter} /></dd>
                            </div>
                            <div className="meta-row">
                                <dt>译者</dt>
                                <dd>
                                    {translators.length > 0
                                        ? translators.map((t, i) => (
                                            <span key={t}>
                                                {i > 0 && "、"}
                                                <MetaLink name={t} type="translator" onToggleFilter={onToggleFilter} />
                                            </span>
                                        ))
                                        : "无"}
                                </dd>
                            </div>
                            <div className="meta-row">
                                <dt>收录日期</dt>
                                <dd>{drama.dateAdded}</dd>
                            </div>
                            <div className="meta-row">
                                <dt>编号</dt>
                                <dd>#{drama.id}</dd>
                            </div>
                        </dl>
                        {drama.description && <p className="detail-desc">{drama.description}</p>}
                        <div className="detail-tags">
                            {drama.tags.map((tag) => (
                                <button key={tag} className="tag-pill" onClick={() => { onToggleFilter("tag", tag); onClose(); }}>
                                    #{tag}
                                </button>
                            ))}
                        </div>

                        <div className="detail-stats">
                            <button className={`pill-btn ${liked ? "pill-btn-liked" : ""}`} onClick={toggleLike} title="点赞">
                                <Icon name="thumbsUp" size={15} filled={liked} />
                                {stats.likes} 点赞
                            </button>
                            <span className="detail-stat" title="收藏数">
                                <Icon name="heart" size={15} />
                                {stats.favorites} 收藏
                            </span>
                            <span className="detail-stat" title="评论数">
                                <Icon name="chat" size={15} />
                                {totalComments} 评论
                            </span>
                        </div>

                        <div className="detail-actions">
                            <button className={`pill-btn ${isFavorite(drama.id) ? "pill-btn-fav" : ""}`} onClick={() => onToggleFavorite(drama.id)}>
                                <Icon name="heart" size={15} filled={isFavorite(drama.id)} />
                                {isFavorite(drama.id) ? "取消收藏" : "添加收藏"}
                            </button>
                            {hasTranslatedLink && (
                                <a className="pill-btn pill-btn-primary" href={drama.translatedUrl} target="_blank" rel="noopener noreferrer">
                                    <Icon name="play" size={15} />
                                    观看汉化版
                                </a>
                            )}
                            <a className="pill-btn pill-btn-ghost" href={drama.originalUrl} target="_blank" rel="noopener noreferrer">
                                <Icon name="external" size={15} />
                                查看原版
                            </a>
                        </div>
                    </div>
                </div>

                <div className="detail-related">
                    <h4>相关推荐</h4>
                    {related.length === 0 ? (
                        <p className="side-empty">暂无相关推荐</p>
                    ) : (
                        <div className="related-grid">
                            {related.map((r) => (
                                <button key={r.id} className="related-item" onClick={() => onOpenDetail(r)}>
                                    <LazyImage src={r.thumbnail} alt={r.title} fallbackTitle={r.title} className="related-thumb" />
                                    <div className="related-info">
                                        <span className="related-title">{r.title}</span>
                                        <span className="related-author">{r.author}</span>
                                        <span className="related-bottom">
                                            <StatusBadge status={getDramaStatus(r)} />
                                            {isFavorite(r.id) && <Icon name="heart" size={12} filled className="related-fav" />}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="detail-comments">
                    <h4>评论 ({totalComments})</h4>
                    {myComment ? (
                        <div className="comment-already">
                            <span>你已在本作品下发表过评论，可编辑或删除</span>
                        </div>
                    ) : (
                        <form className="comment-form" onSubmit={addComment}>
                            <input
                                ref={inputRef}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder={user ? "写下你的评论…" : "登录后发表评论"}
                                disabled={!user}
                                maxLength={500}
                            />
                            <button type="submit" className="btn-primary" disabled={!user || commentBusy || !commentText.trim()}>
                                {commentBusy ? "发送中…" : "发送"}
                            </button>
                        </form>
                    )}
                    {commentError && <p className="comment-error">{commentError}</p>}
                    <div className="comment-list">
                        {showComments.length === 0 ? (
                            <p className="side-empty">暂无评论，来抢沙发~</p>
                        ) : (
                            showComments.map((c) => (
                                <div key={c.id} className="comment-item">
                                    <UserAvatar profile={userMap[c.user_id]} size={32} />
                                    <div className="comment-main">
                                        <div className="comment-head">
                                            <span className="comment-user">{userMap[c.user_id]?.username || "用户"}</span>
                                            <span className="comment-time">{fmtTime(c.created_at)}</span>
                                            {(c.user_id === user?.id || profile?.role === "admin") && (
                                                <div className="comment-actions">
                                                    {c.user_id === user?.id && (
                                                        <button className="comment-del comment-edit-btn" onClick={() => startEdit(c)} aria-label="编辑评论">
                                                            <Icon name="edit" size={13} />
                                                        </button>
                                                    )}
                                                    <button className="comment-del" onClick={() => removeComment(c)} aria-label="删除评论">
                                                        <Icon name="x" size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {editingId === c.id ? (
                                            <div className="comment-edit">
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    maxLength={500}
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="comment-edit-actions">
                                                    <button className="btn-primary btn-sm" onClick={() => saveEdit(c)} disabled={editBusy || !editText.trim()}>
                                                        {editBusy ? "保存中…" : "保存"}
                                                    </button>
                                                    <button className="btn-ghost btn-sm" onClick={cancelEdit}>取消</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="comment-content">{c.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {hasMore && (
                        <button className="comment-more" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? "加载中…" : "加载更多评论"}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
