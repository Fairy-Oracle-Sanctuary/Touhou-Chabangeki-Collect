import { useCallback, useEffect, useState } from "react";

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

// 收藏（键名沿用旧版，老用户收藏不丢失）
export function useFavorites() {
    const [favorites, setFavorites] = useLocalStorage("touhou-favorites", []);

    const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

    const toggle = useCallback(
        (id) => setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id])),
        [setFavorites]
    );

    const batchFavorite = useCallback(
        (ids) => setFavorites((prev) => [...new Set([...prev, ...ids])]),
        [setFavorites]
    );

    const batchUnfavorite = useCallback(
        (ids) => {
            const set = new Set(ids);
            setFavorites((prev) => prev.filter((f) => !set.has(f)));
        },
        [setFavorites]
    );

    return { favorites, isFavorite, toggle, batchFavorite, batchUnfavorite, setFavorites };
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
