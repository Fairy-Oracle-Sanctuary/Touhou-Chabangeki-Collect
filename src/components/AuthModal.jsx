import { useEffect, useRef, useState } from "react";
import { Modal, Icon } from "./ui.jsx";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "";
const hasCaptcha = Boolean(HCAPTCHA_SITE_KEY);

// 将 Supabase 错误码翻译为中文
function translateError(message) {
    if (!message) return "发生未知错误";
    const m = message.toLowerCase();
    if (m.includes("invalid login")) return "邮箱或密码错误";
    if (m.includes("email not confirmed")) return "请先到邮箱点击验证链接";
    if (m.includes("user already registered")) return "该邮箱已注册";
    if (m.includes("password should be at least")) return "密码至少 6 位";
    if (m.includes("captcha")) return "人机验证失败，请重试";
    if (m.includes("for security purposes")) return "请求过于频繁，请稍后再试";
    if (m.includes("rate limit")) return "请求过于频繁，请稍后再试";
    return message;
}

/**
 * 鉴权弹窗：登录 / 注册（用户名+确认密码+可选验证码）/ 找回密码
 *
 * props:
 *  - onClose()
 *  - onSignIn(email, password, captchaToken)
 *  - onSignUp(email, password, username, captchaToken)
 *  - onReset(email, captchaToken)
 */
export default function AuthModal({ onClose, onSignIn, onSignUp, onReset }) {
    const [mode, setMode] = useState("signin");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [captchaToken, setCaptchaToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const captchaRef = useRef(null);

    // 可选 hCaptcha：有 site key 才加载，否则跳过
    useEffect(() => {
        if (!hasCaptcha) return;
        let mounted = true;
        const render = () => {
            if (!mounted || !window.hcaptcha || !captchaRef.current) return;
            window.hcaptcha.render(captchaRef.current, {
                sitekey: HCAPTCHA_SITE_KEY,
                callback: (token) => setCaptchaToken(token),
                "expired-callback": () => setCaptchaToken(""),
            });
        };
        if (window.hcaptcha) {
            render();
        } else {
            const s = document.createElement("script");
            s.src = "https://js.hcaptcha.com/1/api.js?onload=__onHcaptchaLoaded&render=explicit";
            s.async = true;
            window.__onHcaptchaLoaded = render;
            document.body.appendChild(s);
        }
        return () => { mounted = false; };
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setNotice("");

        if (!EMAIL_REGEX.test(email.trim())) {
            setError("邮箱格式不正确");
            return;
        }
        if (mode === "signup") {
            if (!username.trim()) {
                setError("请输入用户名");
                return;
            }
            if (username.trim().length > 20) {
                setError("用户名最长 20 个字符");
                return;
            }
        }
        if (mode !== "forgot") {
            if (password.length < 6) {
                setError("密码至少 6 位");
                return;
            }
            if (mode === "signup" && password !== confirmPassword) {
                setError("两次输入的密码不一致");
                return;
            }
        }
        if (hasCaptcha && !captchaToken) {
            setError("请完成人机验证");
            return;
        }

        setLoading(true);
        try {
            if (mode === "signin") {
                await onSignIn(email.trim(), password, captchaToken);
                onClose();
            } else if (mode === "signup") {
                const data = await onSignUp(email.trim(), password, username.trim(), captchaToken);
                // 关键判断：新注册返回 user.identities 非空；
                // 已注册邮箱返回空 identities（或 user 为 null），Supabase 不会发邮件
                const identitiesEmpty = Array.isArray(data?.user?.identities) && data.user.identities.length === 0;
                if (data?.user && !identitiesEmpty) {
                    // 新注册，或邮箱已存在但未验证（Supabase 会重发确认邮件）
                    setMode("verify");
                    setNotice(
                        data.session
                            ? "注册成功，已自动登录！"
                            : `验证邮件已发送至 ${email.trim()}，请到邮箱点击确认链接完成注册。`
                    );
                } else {
                    // Supabase 防枚举安全策略：已注册的邮箱不再发邮件
                    setMode("sent");
                    setNotice(
                        `该邮箱可能已经注册。若是你的账号请直接登录；若忘记密码，请使用「找回密码」。`
                    );
                }
            } else if (mode === "forgot") {
                await onReset(email.trim(), captchaToken);
                setMode("sent");
                setNotice(`重置链接已发送至 ${email.trim()}，请到邮箱查收。`);
            }
        } catch (err) {
            setError(translateError(err?.message));
        } finally {
            setLoading(false);
        }
    };

    const titles = { signin: "登录", signup: "注册", forgot: "找回密码", verify: "查收邮件", sent: "邮件已发送" };
    const icons = { signin: "user", signup: "user", forgot: "user", verify: "user", sent: "user" };

    // 注册成功后的「等待验证」界面
    if (mode === "verify" || mode === "sent") {
        return (
            <Modal title={titles[mode]} icon={icons[mode]} onClose={onClose}>
                <div className="auth-notice">
                    <div className="auth-notice-icon"><Icon name="check" size={28} /></div>
                    <p>{notice}</p>
                    <p className="auth-notice-sub">
                        {mode === "verify"
                            ? "若一直收不到邮件，该邮箱可能已注册，请直接登录或使用「找回密码」。"
                            : "若未收到邮件，请检查垃圾邮件，或等待 1-2 分钟后重试。"}
                    </p>
                    <div className="auth-actions">
                        {mode !== "forgot" && (
                            <button className="btn-primary" onClick={() => setMode("signin")}>前往登录</button>
                        )}
                        <button className="btn-ghost" onClick={onClose}>关闭</button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal title={titles[mode]} icon={icons[mode]} onClose={onClose}>
            <form className="auth-form" onSubmit={submit}>
                <label className="field">
                    <span>邮箱</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoFocus
                        autoComplete="email"
                    />
                </label>

                {mode === "signup" && (
                    <label className="field">
                        <span>用户名</span>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="展示名称，最长 20 字"
                            maxLength={20}
                            autoComplete="nickname"
                        />
                    </label>
                )}

                {mode !== "forgot" && (
                    <label className="field">
                        <span>密码</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="至少 6 位"
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        />
                    </label>
                )}

                {mode === "signup" && (
                    <label className="field">
                        <span>确认密码</span>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="再次输入密码"
                            autoComplete="new-password"
                        />
                    </label>
                )}

                {hasCaptcha && (
                    <div className="field">
                        <span>人机验证</span>
                        <div className="h-captcha-wrap" ref={captchaRef} />
                    </div>
                )}

                {error && <p className="auth-error">{error}</p>}

                <div className="auth-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? "处理中…" : (mode === "signin" ? "登录" : mode === "signup" ? "注册" : "发送重置链接")}
                    </button>
                </div>

                <div className="auth-switch">
                    {mode === "signin" && (
                        <>
                            <button type="button" onClick={() => setMode("signup")}>没有账号？注册</button>
                            <button type="button" onClick={() => setMode("forgot")}>忘记密码？</button>
                        </>
                    )}
                    {mode === "signup" && (
                        <button type="button" onClick={() => setMode("signin")}>已有账号？登录</button>
                    )}
                    {mode === "forgot" && (
                        <button type="button" onClick={() => setMode("signin")}>返回登录</button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
