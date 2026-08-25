import { useState } from "react";
import { Modal, Icon } from "./ui.jsx";
import { supabase } from "../lib/supabaseClient.js";

const ROLE_LABEL = { admin: "管理员", creator: "汉化者 · 作者", user: "会员" };

// 个人资料弹窗：修改用户名 + 修改密码（密码托管在 Logto 统一账号系统）
export default function ProfileModal({ user, profile, onClose, onToast, onSaved }) {
    const [username, setUsername] = useState(profile?.username || user?.email?.split("@")[0] || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [pwdBusy, setPwdBusy] = useState(false);

    const saveProfile = async (e) => {
        e.preventDefault();
        const name = username.trim();
        if (!name) {
            setError("用户名不能为空");
            return;
        }
        if (name.length > 20) {
            setError("用户名最长 20 个字符");
            return;
        }
        setSaving(true);
        try {
            const { error: err } = await supabase
                .from("profiles")
                .update({ username: name, bio: bio.trim() })
                .eq("user_id", user.id);
            if (err) throw err;
            onToast("个人资料已更新");
            onSaved?.(name);
            onClose();
        } catch (err) {
            const msg = String(err?.message || "").toLowerCase();
            if (msg.includes("duplicate") || msg.includes("unique")) {
                setError("该用户名已被占用，换一个试试");
            } else {
                setError(err?.message || "保存失败，请重试");
            }
        } finally {
            setSaving(false);
        }
    };

    // 修改密码：跳转统一登录页（Logto），走忘记密码邮件流程
    const goResetPassword = async () => {
        if (pwdBusy) return;
        setPwdBusy(true);
        try {
            window.open("https://sso.sofurry.cloud/oidc", "_blank", "noopener");
        } finally {
            setPwdBusy(false);
        }
    };

    return (
        <Modal title="个人资料" icon="user" onClose={onClose}>
            <div className="profile-info">
                <span className="user-info-email">{user.email}</span>
                {profile?.role && (
                    <span className={`user-role user-role-${profile.role}`}>{ROLE_LABEL[profile.role] || profile.role}</span>
                )}
            </div>

            <form className="auth-form" onSubmit={saveProfile}>
                <h3 className="profile-section-title">基本资料</h3>
                <label className="field">
                    <span>用户名</span>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="展示名称，最长 20 字"
                        maxLength={20}
                        autoFocus
                    />
                </label>
                <label className="field">
                    <span>个人简介</span>
                    <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="介绍一下自己吧（可选）"
                        maxLength={200}
                    />
                </label>
                {error && <p className="auth-error">{error}</p>}
                <div className="auth-actions">
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? "保存中…" : "保存资料"}
                    </button>
                </div>
            </form>

            <div className="auth-form">
                <h3 className="profile-section-title">修改密码</h3>
                <p className="auth-hint">
                    密码由统一账号系统管理。点击下方按钮将跳转到重置密码页面，
                    通过邮箱验证后即可设置新密码。
                </p>
                <div className="auth-actions">
                    <button type="button" className="btn-primary" disabled={pwdBusy} onClick={goResetPassword}>
                        {pwdBusy ? "跳转中…" : "通过邮箱重置密码"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
