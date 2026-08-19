import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 构建/启动时扫描 public/avatar 目录，生成 index.json 清单，
// 供管理后台头像选择下拉框使用（新增头像无需改代码）
function avatarManifest() {
    return {
        name: "avatar-manifest",
        buildStart() {
            const dir = resolve(__dirname, "public/avatar");
            const files = readdirSync(dir)
                .filter((f) => /\.(webp|png|jpe?g|gif)$/i.test(f))
                .sort((a, b) => a.localeCompare(b, "zh", { numeric: true }))
                .map((f) => `avatar/${f}`);
            writeFileSync(resolve(dir, "index.json"), JSON.stringify(files));
        },
    };
}

// 仅生产构建时向 index.html 注入 CSP meta（dev 不注入，避免影响 HMR）
function securityCsp() {
    const csp = [
        "default-src 'self'",
        "script-src 'self' https://js.hcaptcha.com https://hcaptcha.com https://*.hcaptcha.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https: http:",
        "connect-src 'self' https://xpjkecdxtfytgfpixtau.supabase.co https://hcaptcha.com https://*.hcaptcha.com https://api.hcaptcha.com",
        "frame-src https://hcaptcha.com https://*.hcaptcha.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self' https://hcaptcha.com",
        "object-src 'none'",
    ].join("; ");
    return {
        name: "security-csp",
        transformIndexHtml(html) {
            return html.replace(
                '<meta charset="UTF-8">',
                `<meta charset="UTF-8">\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
            );
        },
    };
}

export default defineConfig(({ command }) => {
    const plugins = [react(), avatarManifest()];
    if (command === "build") plugins.push(securityCsp());
    return {
        plugins,
        build: {
            outDir: "dist",
            chunkSizeWarningLimit: 600,
        },
    };
});
