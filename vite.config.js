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

export default defineConfig({
    plugins: [react(), avatarManifest()],
    build: {
        outDir: "dist",
        chunkSizeWarningLimit: 600,
    },
});
