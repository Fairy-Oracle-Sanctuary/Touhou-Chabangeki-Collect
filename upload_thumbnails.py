#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cloudinary批量上传脚本
支持选择数字范围内的图片上传到Cloudinary
"""

import os
import sys
import tkinter as tk
from tkinter import messagebox, ttk

import cloudinary
import cloudinary.uploader

# Cloudinary配置 - 请替换为你的配置
CLOUD_NAME = "do6rggmy6"  # 你的云名称
API_KEY = "856945291622537"  # 你的API密钥
API_SECRET = "ig9RsKB8RZkhLynpXx5G9W8depA"  # 你的API密钥

# 图片文件夹路径
COVER_FOLDER = "cover"


class CloudinaryUploader:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Cloudinary缩略图批量上传")
        self.root.geometry("550x600")  # 增加高度以适应滚动条
        self.root.minsize(500, 500)  # 设置最小窗口大小

        # 配置Cloudinary
        try:
            cloudinary.config(
                cloud_name=CLOUD_NAME, api_key=API_KEY, api_secret=API_SECRET
            )
            print("Cloudinary配置成功")
        except Exception as e:
            messagebox.showerror("配置错误", f"Cloudinary配置失败: {e}")
            return

        self.setup_ui()

    def setup_ui(self):
        """设置界面"""
        # 主框架 - 使用Canvas和滚动条
        canvas = tk.Canvas(self.root)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)
        main_frame = ttk.Frame(canvas)

        # 配置滚动条
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)
        canvas.create_window((0, 0), window=main_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # 更新滚动区域
        def configure_scroll_region(event=None):
            canvas.configure(scrollregion=canvas.bbox("all"))

        main_frame.bind("<Configure>", configure_scroll_region)

        # 绑定鼠标滚轮事件到整个窗口
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        # 绑定到canvas和main_frame，确保整个页面都能滚动
        canvas.bind("<MouseWheel>", on_mousewheel)
        main_frame.bind("<MouseWheel>", on_mousewheel)
        self.root.bind("<MouseWheel>", on_mousewheel)

        # 标题
        title_label = ttk.Label(
            main_frame, text="缩略图批量上传工具", font=("Microsoft YaHei", 14, "bold")
        )
        title_label.pack(pady=(0, 20))

        # 范围选择框架
        range_frame = ttk.LabelFrame(main_frame, text="选择上传范围", padding="10")
        range_frame.pack(fill=tk.X, pady=(0, 20))

        # 起始数字
        start_frame = ttk.Frame(range_frame)
        start_frame.pack(fill=tk.X, pady=5)
        ttk.Label(start_frame, text="起始数字:").pack(side=tk.LEFT)
        self.start_var = tk.StringVar(value="1")
        ttk.Entry(start_frame, textvariable=self.start_var, width=10).pack(
            side=tk.LEFT, padx=(10, 0)
        )

        # 结束数字
        end_frame = ttk.Frame(range_frame)
        end_frame.pack(fill=tk.X, pady=5)
        ttk.Label(end_frame, text="结束数字:").pack(side=tk.LEFT)
        self.end_var = tk.StringVar(value="70")
        ttk.Entry(end_frame, textvariable=self.end_var, width=10).pack(
            side=tk.LEFT, padx=(10, 0)
        )

        # 文件夹信息
        folder_frame = ttk.LabelFrame(main_frame, text="文件夹信息", padding="10")
        folder_frame.pack(fill=tk.X, pady=(0, 20))

        self.folder_label = ttk.Label(folder_frame, text=f"图片文件夹: {COVER_FOLDER}")
        self.folder_label.pack(anchor=tk.W)

        # 检查文件夹按钮
        ttk.Button(folder_frame, text="检查文件夹", command=self.check_folder).pack(
            anchor=tk.W, pady=(5, 0)
        )

        # Cloudinary设置
        cloud_frame = ttk.LabelFrame(main_frame, text="Cloudinary设置", padding="10")
        cloud_frame.pack(fill=tk.X, pady=(0, 20))

        self.cloud_label = ttk.Label(cloud_frame, text=f"云名称: {CLOUD_NAME}")
        self.cloud_label.pack(anchor=tk.W)

        # 上传选项
        options_frame = ttk.LabelFrame(main_frame, text="上传选项", padding="10")
        options_frame.pack(fill=tk.X, pady=(0, 20))

        self.use_filename_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            options_frame, text="保持原文件名", variable=self.use_filename_var
        ).pack(anchor=tk.W)

        self.unique_filename_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            options_frame, text="不添加随机后缀", variable=self.unique_filename_var
        ).pack(anchor=tk.W)

        self.folder_var = tk.StringVar(value="touhou/thumbnails")
        folder_entry_frame = ttk.Frame(options_frame)
        folder_entry_frame.pack(fill=tk.X, pady=(10, 0))
        ttk.Label(folder_entry_frame, text="文件夹:").pack(side=tk.LEFT)
        ttk.Entry(folder_entry_frame, textvariable=self.folder_var).pack(
            side=tk.LEFT, fill=tk.X, expand=True, padx=(10, 0)
        )

        # 按钮框架
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=(0, 10))

        # 左侧按钮组
        left_btn_frame = ttk.Frame(btn_frame)
        left_btn_frame.pack(side=tk.LEFT)

        ttk.Button(left_btn_frame, text="开始上传", command=self.start_upload).pack(
            side=tk.LEFT, padx=(0, 5)
        )
        ttk.Button(left_btn_frame, text="生成URL", command=self.generate_urls).pack(
            side=tk.LEFT, padx=(0, 5)
        )

        # 右侧按钮
        ttk.Button(btn_frame, text="退出", command=self.root.quit).pack(side=tk.RIGHT)

        # 进度条
        self.progress = ttk.Progressbar(main_frame, mode="determinate")
        self.progress.pack(fill=tk.X, pady=(10, 0))

        # 状态标签
        self.status_label = ttk.Label(
            main_frame, text="准备就绪", font=("Microsoft YaHei", 9)
        )
        self.status_label.pack(pady=(5, 0))

        # 结果文本框
        result_frame = ttk.LabelFrame(main_frame, text="上传结果", padding="10")
        result_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        self.result_text = tk.Text(result_frame, height=8, wrap=tk.WORD)
        scrollbar = ttk.Scrollbar(
            result_frame, orient=tk.VERTICAL, command=self.result_text.yview
        )
        self.result_text.configure(yscrollcommand=scrollbar.set)

        self.result_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def check_folder(self):
        """检查文件夹是否存在"""
        if os.path.exists(COVER_FOLDER):
            files = [
                f
                for f in os.listdir(COVER_FOLDER)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp"))
            ]
            self.status_label.config(text=f"找到 {len(files)} 个图片文件")
            self.result_text.delete(1.0, tk.END)
            self.result_text.insert(tk.END, f"文件夹: {COVER_FOLDER}\n")
            self.result_text.insert(tk.END, f"图片文件数量: {len(files)}\n\n")
            self.result_text.insert(tk.END, "文件列表:\n")
            for file in sorted(files)[:20]:  # 只显示前20个
                self.result_text.insert(tk.END, f"  {file}\n")
            if len(files) > 20:
                self.result_text.insert(
                    tk.END, f"  ... 还有 {len(files) - 20} 个文件\n"
                )
        else:
            messagebox.showerror("错误", f"文件夹 '{COVER_FOLDER}' 不存在")
            self.status_label.config(text="文件夹不存在")

    def start_upload(self):
        """开始上传"""
        try:
            start_num = int(self.start_var.get())
            end_num = int(self.end_var.get())

            if start_num < 1 or end_num < start_num:
                messagebox.showerror("错误", "请输入有效的数字范围")
                return

        except ValueError:
            messagebox.showerror("错误", "请输入有效的数字")
            return

        # 确认对话框
        confirm_msg = f"确定要上传 {start_num} 到 {end_num} 的图片吗？"
        if not messagebox.askyesno("确认上传", confirm_msg):
            return

        # 清空结果框
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(tk.END, "开始上传...\n\n")

        # 设置进度条
        total_files = end_num - start_num + 1
        self.progress.config(maximum=total_files)
        self.progress["value"] = 0

        success_count = 0
        failed_count = 0

        # 开始上传
        for i in range(start_num, end_num + 1):
            filename = f"{i}.jpg"
            filepath = os.path.join(COVER_FOLDER, filename)

            if not os.path.exists(filepath):
                self.result_text.insert(tk.END, f"❌ {filename}: 文件不存在\n")
                failed_count += 1
                continue

            try:
                # 上传到Cloudinary
                result = cloudinary.uploader.upload(
                    filepath,
                    public_id=str(i),
                    use_filename=self.use_filename_var.get(),
                    unique_filename=self.unique_filename_var.get(),
                    folder=self.folder_var.get(),
                )

                url = result["secure_url"]
                self.result_text.insert(tk.END, f"✅ {filename}: {url}\n")
                success_count += 1

            except Exception as e:
                self.result_text.insert(tk.END, f"❌ {filename}: 上传失败 - {str(e)}\n")
                failed_count += 1

            # 更新进度条
            self.progress["value"] = i - start_num + 1
            self.root.update()

        # 显示总结
        self.result_text.insert(tk.END, "\n上传完成!\n")
        self.result_text.insert(tk.END, f"成功: {success_count} 个\n")
        self.result_text.insert(tk.END, f"失败: {failed_count} 个\n")

        self.status_label.config(
            text=f"上传完成 - 成功: {success_count}, 失败: {failed_count}"
        )

        # 询问是否生成URL
        if success_count > 0:
            if messagebox.askyesno("生成URL", "是否生成所有图片的URL列表？"):
                self.generate_urls()

    def generate_urls(self):
        """生成URL列表"""
        try:
            start_num = int(self.start_var.get())
            end_num = int(self.end_var.get())
        except ValueError:
            messagebox.showerror("错误", "请输入有效的数字范围")
            return

        base_url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{self.folder_var.get()}/"

        # 清空结果框
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(tk.END, "URL列表:\n\n")

        urls = []
        for i in range(start_num, end_num + 1):
            url = f"{base_url}{i}.jpg"
            urls.append(url)
            self.result_text.insert(tk.END, f"{i}: {url}\n")

        # 保存到文件
        try:
            with open("thumbnail_urls.txt", "w", encoding="utf-8") as f:
                f.write("Cloudinary缩略图URL列表\n")
                f.write(f"范围: {start_num}-{end_num}\n")
                f.write(
                    f"生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                )
                for i, url in enumerate(urls, start_num):
                    f.write(f"{i}: {url}\n")

            self.result_text.insert(tk.END, "\n✅ URL列表已保存到 thumbnail_urls.txt\n")
            self.status_label.config(text=f"已生成 {len(urls)} 个URL")

        except Exception as e:
            self.result_text.insert(tk.END, f"\n❌ 保存文件失败: {str(e)}\n")

    def run(self):
        """运行应用"""
        self.root.mainloop()


if __name__ == "__main__":
    # 检查Cloudinary配置
    if API_KEY == "your_api_key" or API_SECRET == "your_api_secret":
        print("⚠️  请先配置Cloudinary的API密钥!")
        print("修改以下变量:")
        print("  API_KEY = '你的API密钥'")
        print("  API_SECRET = '你的API密钥'")
        print("  CLOUD_NAME = '你的云名称'")
        sys.exit(1)

    app = CloudinaryUploader()
    app.run()
