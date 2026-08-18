import { useState } from "react";
import { Modal, Icon } from "./ui.jsx";
import { supabase } from "../lib/supabaseClient.js";

const ROLE_LABEL = { admin: "管理员", creator: "汉化者 · 作者", user: "会员" };

// 个人资料弹窗：修改用户名 + 修改密码
export default function ProfileModal({ user, profile, onClose, onToast, onSaved }) {
    const [username, setUsername] = useState(profile?.username || user?.email?.split("@")[0] || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdError, setPwdError] = useState("");

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

    const changePassword = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setPwdError("新密码至少 6 位");
            return;
        }
        if (password !== confirmPassword) {
            setPwdError("两次输入的新密码不一致");
            return;
        }
        setChangingPwd(true);
        try {
            const { error: err } = await supabase.auth.updateUser({ password });
            if (err) throw err;
            onToast("密码已修改");
            setPassword("");
            setConfirmPassword("");
            setPwdError("");
        } catch (err) {
            setPwdError(err?.message || "修改失败，请重试");
        } finally {
            setChangingPwd(false);
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

            <form className="auth-form" onSubmit={changePassword}>
                <h3 className="profile-section-title">修改密码</h3>
                <label className="field">
                    <span>新密码</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="至少 6 位"
                        autoComplete="new-password"
                    />
                </label>
                <label className="field">
                    <span>确认新密码</span>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入新密码"
                        autoComplete="new-password"
                    />
                </label>
                {pwdError && <p className="auth-error">{pwdError}</p>}
                <div className="auth-actions">
                    <button type="submit" className="btn-primary" disabled={changingPwd}>
                        {changingPwd ? "修改中…" : "修改密码"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
