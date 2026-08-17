import { useEffect, useRef, useState } from "react";
import { makeFallbackImage } from "../utils.js";
import { useBodyScrollLock } from "../hooks.js";

const PATHS = {
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    x: "M6 18L18 6M6 6l12 12",
    sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
    heart: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    external: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    layers: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m7-4l-7-4-7 4 7 4 7-4z",
    keyboard: "M8 9h1m4 0h1m-6 4h8M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
    chevronLeft: "M15 19l-7-7 7-7",
    chevronRight: "M9 5l7 7-7 7",
    chevronDown: "M19 9l-7 7-7-7",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    arrowUp: "M5 10l7-7m0 0l7 7m-7-7v18",
    menu: "M4 6h16M4 12h16M4 18h16",
    grid: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
    list: "M4 6h16M4 10h16M4 14h16M4 18h16",
    eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    play: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    bulb: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    copy: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
    check: "M5 13l4 4L19 7",
};

export function Icon({ name, size = 18, className = "", filled = false }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}

// 带骨架屏与失败兜底的懒加载图片
export function LazyImage({ src, alt, className = "", fallbackTitle }) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    return (
        <div className={`img-box ${className}`}>
            {!loaded && !failed && <div className="img-skeleton" />}
            <img
                src={failed ? makeFallbackImage(fallbackTitle || alt) : src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                style={loaded || failed ? { opacity: 1 } : { opacity: 0 }}
            />
        </div>
    );
}

// 状态徽章
export function StatusBadge({ status, size = "sm" }) {
    return <span className={`badge badge-${status.kind} ${size === "lg" ? "badge-lg" : ""}`}>{status.text}</span>;
}

// 通用弹窗壳：遮罩 + 面板 + Esc 关闭
export function Modal({ title, icon, onClose, children, wide = false, footer = null }) {
    useBodyScrollLock(true);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal-panel ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true">
                <header className="modal-header">
                    <h2>
                        {icon && <Icon name={icon} />}
                        {title}
                    </h2>
                    <button className="icon-btn" onClick={onClose} aria-label="关闭">
                        <Icon name="x" />
                    </button>
                </header>
                <div className="modal-body">{children}</div>
                {footer && <footer className="modal-footer">{footer}</footer>}
            </div>
        </div>
    );
}

// 轻提示
export function Toast({ message }) {
    if (!message) return null;
    return (
        <div className="toast" key={message.id}>
            <Icon name="check" size={16} />
            {message.text}
        </div>
    );
}

export function useToast() {
    const [message, setMessage] = useState(null);
    const timer = useRef(null);
    const show = (text) => {
        setMessage({ id: Date.now(), text });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setMessage(null), 3000);
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    return { message, show };
}
