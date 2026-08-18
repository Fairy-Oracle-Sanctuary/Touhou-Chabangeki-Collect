import { useEffect, useMemo, useState } from "react";
import { Icon } from "./ui.jsx";
import { supabase } from "../lib/supabaseClient.js";
import DramaGrid from "./DramaGrid.jsx";

const ROLE_LABEL = { admin: "管理员", creator: "汉化者 · 作者", user: "会员" };

// 用户头像（有图用图，加载失败/无图回退到名字首字母）
export function UserAvatar({ profile, size = 48 }) {
    const [imgError, setImgError] = useState(false);
    const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
    const name = (profile?.username || "?").slice(0, 2).toUpperCase();
    if (profile?.avatar_url && !imgError) {
        return (
            <img
                className="user-avatar-img"
                src={profile.avatar_url}
                alt={name}
                style={style}
                onError={() => setImgError(true)}
            />
        );
    }
    return <span className="user-avatar-fallback" style={style}>{name}</span>;
}

/* ============ 用户列表页 #/users ============ */
export function UsersPage({ onToast, onOpenUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase
                    .from("profiles")
                    .select("user_id, username, bio, avatar_url, role, creator_names, created_at")
                    .order("created_at", { ascending: false });
                if (!cancelled) setUsers(data || []);
            } catch (e) {
                console.error("[users] 加载失败:", e);
                if (!cancelled) onToast("用户列表加载失败");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [onToast]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return users.filter((u) => {
            if (roleFilter !== "all" && u.role !== roleFilter) return false;
            if (!q) return true;
            return (u.username || "").toLowerCase().includes(q) || (u.bio || "").toLowerCase().includes(q);
        });
    }, [users, query, roleFilter]);

    return (
        <div className="users-wrap">
            <div className="users-toolbar">
                <input
                    className="admin-note-input"
                    placeholder="搜索用户名 / 简介…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <select className="admin-role-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="all">全部角色</option>
                    <option value="admin">管理员</option>
                    <option value="creator">汉化者/作者</option>
                    <option value="user">会员</option>
                </select>
            </div>
            <div className="users-list">
                {loading ? (
                    <p className="admin-empty">加载中…</p>
                ) : filtered.length === 0 ? (
                    <p className="admin-empty">没有匹配的用户</p>
                ) : (
                    filtered.map((u) => (
                        <button key={u.user_id} className="user-card" onClick={() => onOpenUser(u.user_id)}>
                            <UserAvatar profile={u} />
                            <div className="user-card-info">
                                <div className="user-card-name">
                                    <strong>{u.username || "（未设置用户名）"}</strong>
                                    {u.role && <span className={`user-role user-role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>}
                                </div>
                                {u.bio && <span className="user-card-bio">{u.bio}</span>}
                                <span className="user-info-email">注册于 {new Date(u.created_at).toLocaleDateString()}</span>
                            </div>
                            <Icon name="chevronRight" size={16} className="user-card-arrow" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

/* ============ 用户主页 #/user/:id（资料 + 收藏夹） ============ */
export function UserProfilePage({
    userId,
    dramas,
    isFavorite,
    onToggleFavorite,
    onOpenDetail,
    onToggleFilter,
    isSelf,
    onBack,
    onEditProfile,
}) {
    const [profile, setProfile] = useState(null);
    const [favIds, setFavIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const [{ data: p }, { data: favs }] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select("user_id, username, bio, avatar_url, role, creator_names, created_at")
                        .eq("user_id", userId)
                        .maybeSingle(),
                    supabase.from("favorites").select("drama_id").eq("user_id", userId),
                ]);
                if (cancelled) return;
                if (!p) setNotFound(true);
                else setProfile(p);
                setFavIds((favs || []).map((f) => f.drama_id));
            } catch (e) {
                console.error("[user] 加载失败:", e);
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const userDramas = useMemo(() => {
        const set = new Set(favIds);
        return dramas.filter((d) => set.has(d.id));
    }, [dramas, favIds]);

    if (loading) {
        return <p className="admin-empty">加载中…</p>;
    }
    if (notFound || !profile) {
        return (
            <div className="auth-notice">
                <div className="auth-notice-icon"><Icon name="user" size={28} /></div>
                <p>未找到该用户。</p>
                <div className="auth-actions">
                    <button className="btn-primary" onClick={onBack}>返回</button>
                </div>
            </div>
        );
    }

    return (
        <div className="user-profile">
            <div className="user-profile-head">
                <UserAvatar profile={profile} size={72} />
                <div className="user-profile-info">
                    <div className="user-profile-name">
                        <h2>{profile.username || "（未设置用户名）"}</h2>
                        {profile.role && <span className={`user-role user-role-${profile.role}`}>{ROLE_LABEL[profile.role] || profile.role}</span>}
                    </div>
                    {profile.bio && <p className="user-profile-bio">{profile.bio}</p>}
                    <span className="user-info-email">
                        注册于 {new Date(profile.created_at).toLocaleDateString()} · 收藏 {favIds.length} 个作品
                    </span>
                </div>
                {isSelf && (
                    <button className="btn-ghost user-profile-edit" onClick={onEditProfile}>
                        <Icon name="user" size={14} /> 编辑资料
                    </button>
                )}
            </div>

            <h3 className="user-profile-fav-title">
                {isSelf ? "我的收藏" : `${profile.username || "TA"} 的收藏`}
            </h3>
            <div id="dramaGrid">
                <DramaGrid
                    dramas={userDramas}
                    layout="grid"
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                    onOpenDetail={onOpenDetail}
                    onToggleFilter={onToggleFilter}
                    noResultsTitle="暂无收藏作品"
                    noResultsText="TA 还没有收藏任何作品"
                />
            </div>
        </div>
    );
}
