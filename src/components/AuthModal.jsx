import { useState } from "react";
import { Modal, Icon } from "./ui.jsx";

/**
 * 登录弹窗（Logto 统一登录）：站点不再自带邮箱/密码表单，
 * 点击按钮跳转 sso.sofurry.cloud 托管登录页（支持登录/注册）。
 *
 * props:
 *  - onClose()
 *  - onSignIn()      跳转统一登录页
 *  - onSignUp()      跳转统一登录页（注册模式）
 */
export default function AuthModal({ onClose, onSignIn, onSignUp }) {
    const [busy, setBusy] = useState(false);

    const go = async (fn) => {
        if (busy) return;
        setBusy(true);
        try {
            await fn();
            // 成功后页面会跳转到统一登录，无需关闭
        } catch (e) {
            setBusy(false);
            console.error("[auth] 跳转失败:", e);
        }
    };

    return (
        <Modal title="登录 / 注册" icon={<Icon name="user" />} onClose={onClose}>
            <div className="auth-modal">
                <p className="auth-hint">
                    本站使用统一账号系统（sofurry SSO）登录，
                    登录后自动同步收藏、点赞与评论。
                    天机阁用户可直接使用天机阁通行证登录。
                </p>
                <div className="auth-actions">
                    <button className="btn btn-primary" disabled={busy} onClick={() => go(onSignIn)}>
                        {busy ? "跳转中…" : "去登录"}
                    </button>
                    <button className="btn" disabled={busy} onClick={() => go(onSignUp)}>
                        注册新账号
                    </button>
                    <button className="btn" disabled={busy} onClick={() => go(onSignIn)}>
                        使用天机阁通行证登录
                    </button>
                </div>
            </div>
        </Modal>
    );
}
