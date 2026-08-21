import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isAuthConfigured } from "./lib/supabaseClient.js";
import { dramas as staticDramas } from "./data.js";

// 作品数据：静态 data.js + 数据库里审核通过的新作品/修改合并
// 数据库行优先（edit_drama_id 覆盖老作品；无 edit_drama_id 视为新作品）
function mergeDramas(base, approved) {
    const overrideById = new Map();
    approved.forEach((s) => {
        if (s.edit_drama_id != null) overrideById.set(s.edit_drama_id, s);
    });
    const result = base.map((d) => {
        const s = overrideById.get(d.id);
        return s ? toDrama(s, d.id) : d;
    });
    let maxId = Math.max(0, ...base.map((d) => d.id), ...result.map((d) => d.id));
    const added = [];
    approved.forEach((s) => {
        if (s.edit_drama_id == null) added.push(toDrama(s, ++maxId));
    });
    return [...result, ...added];
}

function toDrama(s, id) {
    return {
        id,
        title: s.title,
        author: s.author,
        translator: s.translator || "",
        tags: s.tags || [],
        isTranslated: s.is_translated,
        isDomestic: s.is_domestic,
        originalUrl: s.original_url || "",
        translatedUrl: s.translated_url || "",
        thumbnail: s.thumbnail || `cover/${id}.jpg`,
        description: s.description || "",
        dateAdded: s.date_added || "",
    };
}

export function useDramas() {
    const [dramas, setDramas] = useState(staticDramas);
    const [ready, setReady] = useState(false);

    const reload = useCallback(async () => {
        if (!isAuthConfigured) {
            setReady(true);
            return;
        }
        try {
            const { data } = await supabase.from("submissions").select("*").eq("status", "approved");
            setDramas(mergeDramas(staticDramas, data || []));
        } catch (e) {
            console.error("[dramas] 云端数据加载失败:", e);
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { dramas, ready, reload };
}

// 邮箱注册/登录/登出/找回密码
export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthConfigured) {
            setLoading(false);
            return;
        }
        // 初始读取
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
            setLoading(false);
        });
        // 监听变更
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const signIn = useCallback(async (email, password, captchaToken) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
            options: captchaToken ? { captchaToken } : undefined,
        });
        if (error) throw error;
        return data;
    }, []);

    const signUp = useCallback(async (email, password, username, captchaToken) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
                data: username ? { username } : undefined,
                ...(captchaToken ? { captchaToken } : {}),
            },
        });
        if (error) throw error;
        return data;
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    const resetPassword = useCallback(async (email, captchaToken) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
            ...(captchaToken ? { captchaToken } : {}),
        });
        if (error) throw error;
        return data;
    }, []);

    const displayName = user?.email?.split("@")[0] ?? "用户";
    const initials = displayName.slice(0, 2).toUpperCase();

    return { user, loading, isAuthConfigured, signIn, signUp, signOut, resetPassword, displayName, initials };
}

// 用户角色信息（profiles 表）。首次登录且无 profile 时自动创建（默认 user 角色）
export function useProfile(user) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!user) {
            setProfile(null);
            return;
        }
        setLoading(true);
        try {
            // email 列已对客户端撤销权限，显式选择公开列
            let { data } = await supabase
                .from("profiles")
                .select("user_id, username, bio, avatar_url, role, creator_names, created_at")
                .eq("user_id", user.id)
                .maybeSingle();
            if (!data) {
                // 懒创建：注册时填的用户名存在 user_metadata，否则用邮箱前缀
                // email 不写入（视图无此列，由数据库触发器从 auth.users 同步）
                const username = user.user_metadata?.username || user.email?.split("@")[0] || "用户";
                const { data: inserted, error: insErr } = await supabase
                    .from("profiles")
                    .insert({ user_id: user.id, username, role: "user" })
                    .select("user_id, username, bio, avatar_url, role, creator_names, created_at")
                    .single();
                if (!insErr) data = inserted;
            }
            setProfile(data ?? null);
        } catch (e) {
            console.error("[profile] 加载失败:", e);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

    const refresh = useCallback(async () => { await load(); }, [load]);

    return { profile, loading, refresh };
}

// localStorage 持久化 state
export function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const saved = localStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error("保存到 localStorage 失败:", e);
        }
    }, [key, value]);

    return [value, setValue];
}

// 主题切换（data-theme，键名与旧版一致保证平滑迁移）
export function useTheme() {
    const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem("chabangeki-theme", theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
    return { theme, toggle };
}

// 收藏：匿名模式存 localStorage；登录后与 Supabase 云端同步（favorites 表 + RLS）
// localStorage 始终保留本地镜像，退出登录后收藏不丢
export function useFavorites(user) {
    const [favorites, setFavorites] = useLocalStorage("touhou-favorites", []);
    const [syncing, setSyncing] = useState(false);
    const uid = user?.id ?? null;
    const favRef = useRef(favorites);
    favRef.current = favorites;

    // 登录时拉取云端收藏；首次登录（云端为空且本地有收藏）合并上传
    useEffect(() => {
        let cancelled = false;
        if (!uid) {
            setSyncing(false);
            return;
        }
        setSyncing(true);
        (async () => {
            try {
                const { data } = await supabase.from("favorites").select("drama_id").eq("user_id", uid);
                if (cancelled) return;
                const cloud = (data || []).map((r) => r.drama_id);
                const local = favRef.current;
                let next = cloud;
                if (cloud.length === 0 && local.length > 0) {
                    // 首次登录：把本地收藏并入云端
                    await supabase.from("favorites").insert(local.map((id) => ({ user_id: uid, drama_id: id })));
                    next = local;
                }
                if (!cancelled) {
                    setFavorites(next);
                    setSyncing(false);
                }
            } catch (e) {
                console.error("[favorites] 云端同步失败:", e);
                if (!cancelled) setSyncing(false);
            }
        })();
        return () => { cancelled = true; };
    }, [uid, setFavorites]);

    // 写云端（await + 失败返回 false，让调用方可以回滚/提示）
    const writeCloud = useCallback(
        async (id, has) => {
            if (!uid) return true;
            const { error } = has
                ? await supabase.from("favorites").delete().eq("user_id", uid).eq("drama_id", id)
                : await supabase.from("favorites").insert({ user_id: uid, drama_id: id });
            if (error) {
                console.error("[favorites] 云端写入失败:", error.message);
                return false;
            }
            return true;
        },
        [uid]
    );

    const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

    // 登录时先写云端，成功才更新本地（失败回滚：本地不变）
    const toggle = useCallback(
        async (id) => {
            const has = favorites.includes(id);
            if (!uid) {
                const next = has ? favorites.filter((f) => f !== id) : [...favorites, id];
                setFavorites(next);
                return { ok: true };
            }
            const ok = await writeCloud(id, has);
            if (ok) {
                const next = has ? favorites.filter((f) => f !== id) : [...favorites, id];
                setFavorites(next);
            }
            return { ok };
        },
        [favorites, uid, setFavorites, writeCloud]
    );

    const batchFavorite = useCallback(
        async (ids) => {
            if (!uid) {
                setFavorites([...new Set([...favorites, ...ids])]);
                return { ok: true };
            }
            const toAdd = ids.filter((id) => !favorites.includes(id));
            if (toAdd.length === 0) return { ok: true };
            const { error } = await supabase.from("favorites").insert(toAdd.map((id) => ({ user_id: uid, drama_id: id })));
            if (error) {
                console.error("[favorites] 批量写入失败:", error.message);
                return { ok: false };
            }
            setFavorites([...new Set([...favorites, ...ids])]);
            return { ok: true };
        },
        [favorites, uid, setFavorites]
    );

    const batchUnfavorite = useCallback(
        async (ids) => {
            const set = new Set(ids);
            if (!uid) {
                setFavorites(favorites.filter((f) => !set.has(f)));
                return { ok: true };
            }
            const current = favorites.filter((f) => set.has(f));
            if (current.length === 0) return { ok: true };
            const { error } = await supabase.from("favorites").delete().eq("user_id", uid).in("drama_id", current);
            if (error) {
                console.error("[favorites] 批量删除失败:", error.message);
                return { ok: false };
            }
            setFavorites(favorites.filter((f) => !set.has(f)));
            return { ok: true };
        },
        [favorites, uid, setFavorites]
    );

    return { favorites, isFavorite, toggle, batchFavorite, batchUnfavorite, setFavorites, syncing };
}

// 个性化设置（键名沿用旧版）
export const DEFAULT_SETTINGS = {
    cardLayout: "grid",
    itemsPerPage: "12",
    defaultSort: "date-desc",
    enableAnimations: true,
};

export function useSettings() {
    const [settings, setSettings] = useLocalStorage("touhou-settings", DEFAULT_SETTINGS);
    const update = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), [setSettings]);
    const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);
    return { settings, update, reset };
}

// 站内通知（审核结果等）。登录时加载最近 30 条，30s 轮询未读数，有新通知自动刷新
export function useNotifications(user) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const uid = user?.id ?? null;
    const lastUnreadRef = useRef(0);

    const refresh = useCallback(async () => {
        if (!uid) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        try {
            const [{ data: list }, { count }] = await Promise.all([
                supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30),
                supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("read", false),
            ]);
            setNotifications(list || []);
            setUnreadCount(count ?? 0);
            lastUnreadRef.current = count ?? 0;
        } catch (e) {
            console.error("[notify] 加载失败:", e);
        }
    }, [uid]);

    useEffect(() => { refresh(); }, [refresh]);

    // 30s 轮询未读数，变化时刷新列表（审核通过后用户无需手动刷新即可看到红点）
    useEffect(() => {
        if (!uid) return;
        const timer = setInterval(async () => {
            try {
                const { count } = await supabase
                    .from("notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", uid)
                    .eq("read", false);
                if (count !== lastUnreadRef.current) refresh();
            } catch (e) {
                /* 忽略轮询错误 */
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [uid, refresh]);

    const markRead = useCallback(async (id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        await supabase.from("notifications").update({ read: true }).eq("id", id);
    }, []);

    const markAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    }, [uid]);

    const remove = useCallback(async (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        await supabase.from("notifications").delete().eq("id", id);
    }, []);

    return { notifications, unreadCount, refresh, markRead, markAllRead, remove };
}

// 管理员待审核数：后台有未处理审核时，顶栏头像显示角标。30s 轮询
export function usePendingReviews(user, isAdmin) {
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        if (!user || !isAdmin) {
            setPendingCount(0);
            return;
        }
        let cancelled = false;
        const fetchCount = async () => {
            try {
                const { count } = await supabase
                    .from("submissions")
                    .select("id", { count: "exact", head: true })
                    .eq("status", "pending");
                if (!cancelled) setPendingCount(count ?? 0);
            } catch (e) {
                /* 忽略 */
            }
        };
        fetchCount();
        const timer = setInterval(fetchCount, 30000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [user, isAdmin]);
    return pendingCount;
}

// 弹窗打开时锁定 body 滚动
export function useBodyScrollLock(locked) {
    useEffect(() => {
        if (!locked) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [locked]);
}
