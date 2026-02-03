#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
东方 Project 茶番剧收藏数据管理脚本 (GUI 完整修复版)
修复说明：
1. 修复添加/修改功能失效的 Bug（添加了 wait_window 等待对话框返回）。
2. 优化 save_data_gui 逻辑，确保所有字符串字段安全转义。
3. 改进 AddEditDialog 布局，修复标题与分隔符重叠问题。
4. 增强 load_data 兼容性，处理 JS 文件中的逗号和格式问题。
"""

import json
import os
import re
import tkinter as tk
from datetime import datetime
from tkinter import messagebox, ttk


class DataManagerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("东方 Project 茶番剧管理系统")
        self.root.geometry("1000x700")

        self.data = self.load_data()
        self._drag_data = {"item": None, "index": None}

        # 主框架
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        # 顶部标题
        header = ttk.Frame(self.main_frame)
        header.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(
            header,
            text="东方 Project 茶番剧管理系统",
            font=("Microsoft YaHei", 16, "bold"),
        ).pack(side=tk.LEFT)
        ttk.Label(header, text=" [ 拖拽行排序 | ID 自动同步 ]", foreground="#666").pack(
            side=tk.LEFT, padx=15, pady=5
        )

        # 按钮区
        btn_bar = ttk.Frame(self.main_frame)
        btn_bar.pack(fill=tk.X, pady=5)
        ttk.Button(btn_bar, text="添加新条目", command=self.add_item).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(btn_bar, text="从 JSON 添加", command=self.add_from_json).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(btn_bar, text="修改选中项", command=self.edit_item).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(btn_bar, text="删除选中项", command=self.delete_item).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(btn_bar, text="强制保存", command=self.save_data_gui).pack(
            side=tk.RIGHT, padx=2
        )

        # 表格区
        self.list_frame = ttk.Frame(self.main_frame)
        self.list_frame.pack(fill=tk.BOTH, expand=True)

        self.tree = ttk.Treeview(
            self.list_frame,
            columns=("id", "title", "author", "translator", "status", "date"),
            show="headings",
            selectmode="browse",
        )

        cols = {
            "id": ("ID", 50),
            "title": ("标题", 300),
            "author": ("作者", 120),
            "translator": ("翻译者", 120),
            "status": ("状态", 85),
            "date": ("添加日期", 110),
        }
        for col_id, (name, width) in cols.items():
            self.tree.heading(col_id, text=name)
            self.tree.column(
                col_id,
                width=width,
                anchor=tk.CENTER if col_id in ["id", "status", "date"] else tk.W,
            )

        vsb = ttk.Scrollbar(self.list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # 拖拽绑定
        self.tree.bind("<ButtonPress-1>", self.on_drag_start)
        self.tree.bind("<B1-Motion>", self.on_drag_motion)
        self.tree.bind("<ButtonRelease-1>", self.on_drag_drop)
        self.tree.tag_configure("dragging", background="#e8f0fe")

        self.fill_treeview()

    # --- 核心逻辑 ---

    def _update_ids_and_refresh(self, silent=True):
        """统一处理：重新编号、刷新视图、保存文件"""
        for i, item in enumerate(self.data):
            item["id"] = i + 1
        self.fill_treeview()
        self.save_data_gui(silent=silent)

    def get_suggestions(self):
        authors = sorted(list(set(i["author"] for i in self.data if i.get("author"))))
        translators = sorted(
            list(set(i["translator"] for i in self.data if i.get("translator")))
        )
        tags = set()
        for i in self.data:
            tags.update(i.get("tags", []))
        return {
            "authors": authors,
            "translators": translators,
            "tags": sorted(list(tags)),
        }

    def fill_treeview(self):
        self.tree.delete(*self.tree.get_children())
        for item in self.data:
            self.tree.insert(
                "",
                tk.END,
                values=(
                    item["id"],
                    item["title"],
                    item["author"],
                    item["translator"],
                    "已汉化" if item["isTranslated"] else "未汉化",
                    item["dateAdded"],
                ),
            )

    # --- 拖拽逻辑 ---
    def on_drag_start(self, event):
        item = self.tree.identify_row(event.y)
        if item:
            self._drag_data = {"item": item, "index": self.tree.index(item)}
            self.tree.selection_set(item)

    def on_drag_motion(self, event):
        target = self.tree.identify_row(event.y)
        for row in self.tree.get_children():
            self.tree.item(row, tags=())
        if target and target != self._drag_data["item"]:
            self.tree.item(target, tags=("dragging",))

    def on_drag_drop(self, event):
        target = self.tree.identify_row(event.y)
        if target and target != self._drag_data["item"]:
            new_idx = self.tree.index(target)
            old_idx = self._drag_data["index"]
            self.data.insert(new_idx, self.data.pop(old_idx))
            self._update_ids_and_refresh(silent=True)
        for row in self.tree.get_children():
            self.tree.item(row, tags=())

    # --- 数据读写 ---
    def load_data(self):
        if not os.path.exists("data.js"):
            return []
        try:
            with open("data.js", "r", encoding="utf-8") as f:
                content = f.read()
            match = re.search(r"const\s+dramas\s*=\s*\[(.*?)\];", content, re.DOTALL)
            if not match:
                return []
            js_str = "[" + match.group(1).strip() + "]"
            # 简单处理 JS 对象的 trailing comma
            js_str = re.sub(r",\s*\]", "]", js_str)
            js_str = re.sub(r",\s*\}", "}", js_str)
            # 补齐引号使之符合 JSON 格式
            json_str = re.sub(r"(^|\s+)(\w+):", r'\1"\2":', js_str, flags=re.MULTILINE)
            return json.loads(json_str)
        except Exception as e:
            print(f"数据加载提示: {e}")
            return []

    def save_data_gui(self, silent=False):
        try:
            content = "const dramas = ["
            for i, item in enumerate(self.data):
                # 使用 json.dumps 确保所有字段中的特殊字符（引号、换行）被正确转义
                content += f"""
    {{
        id: {item["id"]},
        title: {json.dumps(item["title"], ensure_ascii=False)},
        author: {json.dumps(item["author"], ensure_ascii=False)},
        translator: {json.dumps(item["translator"], ensure_ascii=False)},
        tags: {json.dumps(item["tags"], ensure_ascii=False)},
        isTranslated: {str(item["isTranslated"]).lower()},
        originalUrl: {json.dumps(item["originalUrl"], ensure_ascii=False)},
        translatedUrl: {json.dumps(item["translatedUrl"], ensure_ascii=False)},
        description: {json.dumps(item["description"], ensure_ascii=False)},
        thumbnail: {json.dumps(item["thumbnail"], ensure_ascii=False)},
        dateAdded: {json.dumps(item["dateAdded"], ensure_ascii=False)}
    }}{"," if i < len(self.data) - 1 else ""}"""
            content += "\n];"
            with open("data.js", "w", encoding="utf-8") as f:
                f.write(content)
            if not silent:
                messagebox.showinfo("成功", "数据已成功同步到 data.js")
        except Exception as e:
            messagebox.showerror("错误", f"保存失败: {e}")

    # --- 弹窗触发 ---
    def add_item(self):
        d = AddEditDialog(self.root, "新增条目", {}, self.get_suggestions())
        if d.result:
            self.data.append(d.result)
            self._update_ids_and_refresh(silent=True)

    def edit_item(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("提示", "请先选择一个条目")
            return
        idx = self.tree.index(sel[0])
        d = AddEditDialog(self.root, "修改条目", self.data[idx], self.get_suggestions())
        if d.result:
            d.result["id"] = self.data[idx]["id"]  # 保持原 ID 不变
            self.data[idx] = d.result
            self.fill_treeview()
            self.save_data_gui(silent=True)

    def delete_item(self):
        sel = self.tree.selection()
        if not sel:
            return
        if messagebox.askyesno("确认", "确定要永久删除此条目吗？"):
            self.data.pop(self.tree.index(sel[0]))
            self._update_ids_and_refresh(silent=True)

    def add_from_json(self):
        d = JsonImportDialog(self.root)
        if d.result:
            # 清理JSON数据，去除首尾空白和可能的反引号
            import json

            try:
                # 去除首尾空白
                json_str = d.result.strip()
                # 去除URL中的反引号
                json_str = json_str.replace("`https://", "https://").replace("`", "")
                # 解析JSON
                item = json.loads(json_str)
                # 处理标签格式
                if item.get("tags"):
                    # 如果标签是单个字符串，按逗号分割
                    if (
                        isinstance(item["tags"], list)
                        and len(item["tags"]) > 0
                        and isinstance(item["tags"][0], str)
                    ):
                        # 处理每个标签字符串，按逗号分割
                        all_tags = []
                        for tag_str in item["tags"]:
                            all_tags.extend(
                                [t.strip() for t in tag_str.split("，") if t.strip()]
                            )
                        item["tags"] = all_tags
                    elif isinstance(item["tags"], str):
                        item["tags"] = [
                            t.strip() for t in item["tags"].split("，") if t.strip()
                        ]
                # 添加到数据中
                self.data.append(item)
                self._update_ids_and_refresh(silent=True)
                messagebox.showinfo("成功", "从JSON导入条目成功")
            except Exception as e:
                messagebox.showerror("错误", f"JSON解析失败: {e}")


class JsonImportDialog(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("从 JSON 导入条目")
        self.geometry("600x450")
        self.result = None

        # 整体布局
        main_frame = ttk.Frame(self, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # JSON输入区域
        ttk.Label(
            main_frame, text="请粘贴JSON代码:", font=("Microsoft YaHei", 10, "bold")
        ).pack(anchor=tk.W, pady=(0, 10))

        text_frame = ttk.Frame(main_frame)
        text_frame.pack(fill=tk.BOTH, expand=True)

        self.json_text = tk.Text(text_frame, height=12, wrap=tk.WORD, bg="#f8f9fa")
        self.json_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(
            text_frame, orient=tk.VERTICAL, command=self.json_text.yview
        )
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.json_text.configure(yscrollcommand=scrollbar.set)

        # 示例提示
        example_frame = ttk.Frame(main_frame, padding=10, relief=tk.GROOVE)
        example_frame.pack(fill=tk.X, pady=(10, 0))
        ttk.Label(
            example_frame,
            text="示例JSON格式:",
            font=("Microsoft YaHei", 9, "bold"),
            foreground="#666",
        ).pack(anchor=tk.W, pady=(0, 5))
        example_text = tk.Text(
            example_frame, height=3, wrap=tk.WORD, bg="#f8f9fa", state=tk.DISABLED
        )
        example_text.pack(fill=tk.BOTH, expand=True)
        example_text.configure(state=tk.NORMAL)
        example_text.insert(
            tk.END,
            """{
  "title": "作品标题",
  "author": "作者",
  "translator": "汉化者",
  "tags": ["标签1", "标签2"],
  "isTranslated": true,
  "originalUrl": "原版链接",
  "translatedUrl": "汉化链接",
  "description": "简介",
  "thumbnail": "封面图链接",
  "dateAdded": "2026-02-03"
}""",
        )
        example_text.configure(state=tk.DISABLED)

        # 底部按钮
        bottom_bar = ttk.Frame(self, padding=10)
        bottom_bar.pack(fill=tk.X, side=tk.BOTTOM)
        # 添加一个占位框架，确保按钮靠右显示
        spacer = ttk.Frame(bottom_bar)
        spacer.pack(side=tk.LEFT, expand=True)
        # 按钮
        ttk.Button(bottom_bar, text="导入", command=self.on_import, width=10).pack(
            side=tk.RIGHT, padx=5
        )
        ttk.Button(bottom_bar, text="取消", command=self.destroy, width=10).pack(
            side=tk.RIGHT
        )

        # 等待窗口关闭
        self.wait_window()

    def on_import(self):
        json_str = self.json_text.get(1.0, tk.END)
        if not json_str.strip():
            messagebox.showwarning("提示", "请粘贴JSON代码")
            return
        self.result = json_str
        self.destroy()


class AddEditDialog(tk.Toplevel):
    def __init__(self, parent, title, item, suggestions):
        super().__init__(parent)
        self.title(title)
        self.item, self.suggestions, self.result = item, suggestions, None
        self.geometry("650x700")
        # self.grab_set()  # 模态锁定

        # 整体布局
        self.main_container = ttk.Frame(self)
        self.main_container.pack(fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(self.main_container, highlightthickness=0)
        self.scrollbar = ttk.Scrollbar(
            self.main_container, orient="vertical", command=self.canvas.yview
        )
        self.scrollable_frame = ttk.Frame(self.canvas)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")),
        )
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")

        # 底部按钮
        bottom_bar = ttk.Frame(self, padding=10)
        bottom_bar.pack(fill=tk.X)
        ttk.Button(bottom_bar, text="保存记录", command=self.on_save).pack(
            side=tk.RIGHT, padx=5
        )
        ttk.Button(bottom_bar, text="取消", command=self.destroy).pack(side=tk.RIGHT)

        self.init_form()

        # 【关键修复】等待窗口关闭后再返回 add_item 函数
        self.wait_window()

    def _section_title(self, parent, text, row_idx):
        """改进的标题布局：标题与分割线不再重叠"""
        frame = ttk.Frame(parent)
        frame.grid(row=row_idx, column=0, columnspan=2, sticky=tk.EW, pady=(15, 5))
        lbl = ttk.Label(
            frame, text=text, font=("Microsoft YaHei", 10, "bold"), foreground="#2980b9"
        )
        lbl.pack(side=tk.LEFT)
        ttk.Separator(frame, orient="horizontal").pack(
            side=tk.LEFT, fill=tk.X, expand=True, padx=(10, 0)
        )

    def init_form(self):
        f = ttk.Frame(self.scrollable_frame, padding=20)
        f.pack(fill=tk.BOTH, expand=True)
        f.columnconfigure(1, weight=1)

        self.vars = {}

        # 1. 核心信息
        self._section_title(f, "核心作品信息", 0)
        core_fields = [
            ("title", "作品标题:"),
            ("author", "原作者:"),
            ("translator", "翻译/汉化:"),
        ]
        for i, (key, label) in enumerate(core_fields, 1):
            ttk.Label(f, text=label).grid(
                row=i, column=0, sticky=tk.W, pady=5, padx=(0, 10)
            )
            val = self.item.get(key, "")
            self.vars[key] = tk.StringVar(value=val)
            if key in ["author", "translator"]:
                cb = ttk.Combobox(
                    f,
                    textvariable=self.vars[key],
                    values=self.suggestions.get(f"{key}s", []),
                )
                cb.grid(row=i, column=1, sticky=tk.EW, pady=5)
            else:
                ttk.Entry(f, textvariable=self.vars[key]).grid(
                    row=i, column=1, sticky=tk.EW, pady=5
                )

        # 2. 标签
        self._section_title(f, "分类标签", 4)
        ttk.Label(f, text="已选标签:").grid(row=5, column=0, sticky=tk.NW, pady=5)
        tag_val = (
            ", ".join(self.item.get("tags", []))
            if isinstance(self.item.get("tags"), list)
            else ""
        )
        self.vars["tags"] = tk.StringVar(value=tag_val)
        ttk.Entry(f, textvariable=self.vars["tags"]).grid(
            row=5, column=1, sticky=tk.EW, pady=5
        )

        ttk.Label(f, text="快捷添加:", foreground="#777").grid(
            row=6, column=0, sticky=tk.NW, pady=5
        )
        self.tag_pool = tk.Text(
            f,
            height=4,
            bg="#f8f9fa",
            relief="flat",
            padx=8,
            pady=8,
            font=("Segoe UI", 9),
        )
        self.tag_pool.grid(row=6, column=1, sticky=tk.EW, pady=5)
        self._fill_tag_pool()

        # 3. 资源链接
        self._section_title(f, "链接与描述", 7)
        res_fields = [
            ("originalUrl", "原版地址:"),
            ("translatedUrl", "汉化地址:"),
            ("thumbnail", "封面图URL:"),
            ("description", "作品简述:"),
        ]
        for i, (key, label) in enumerate(res_fields, 8):
            ttk.Label(f, text=label).grid(
                row=i, column=0, sticky=tk.W, pady=5, padx=(0, 10)
            )
            self.vars[key] = tk.StringVar(value=self.item.get(key, ""))
            ttk.Entry(f, textvariable=self.vars[key]).grid(
                row=i, column=1, sticky=tk.EW, pady=5
            )

        # 4. 状态
        self._section_title(f, "发布状态", 12)
        self.is_translated_var = tk.BooleanVar(
            value=self.item.get("isTranslated", False)
        )
        ttk.Checkbutton(
            f, text="标记为已汉化完成", variable=self.is_translated_var
        ).grid(row=13, column=1, sticky=tk.W, pady=5)

        ttk.Label(f, text="添加日期:").grid(row=14, column=0, sticky=tk.W, pady=5)
        cur_date = self.item.get("dateAdded", datetime.now().strftime("%Y-%m-%d"))
        self.vars["dateAdded"] = tk.StringVar(value=cur_date)
        ttk.Entry(f, textvariable=self.vars["dateAdded"]).grid(
            row=14, column=1, sticky=tk.W, pady=5
        )

    def _fill_tag_pool(self):
        self.tag_pool.configure(state="normal")
        for tag in self.suggestions.get("tags", []):
            btn = tk.Button(
                self.tag_pool,
                text=tag,
                font=("Segoe UI", 8),
                bg="#e9ecef",
                relief="flat",
                command=lambda t=tag: self._add_tag(t),
            )
            self.tag_pool.window_create(tk.END, window=btn)
            self.tag_pool.insert(tk.END, "  ")
        self.tag_pool.configure(state="disabled")

    def _add_tag(self, tag):
        current = [t.strip() for t in self.vars["tags"].get().split(",") if t.strip()]
        if tag not in current:
            current.append(tag)
            self.vars["tags"].set(", ".join(current))

    def on_save(self):
        if not self.vars["title"].get().strip():
            return messagebox.showwarning("校验失败", "标题是必填项")

        self.result = {
            "title": self.vars["title"].get().strip(),
            "author": self.vars["author"].get().strip(),
            "translator": self.vars["translator"].get().strip(),
            "tags": [
                t.strip() for t in self.vars["tags"].get().split(",") if t.strip()
            ],
            "isTranslated": self.is_translated_var.get(),
            "originalUrl": self.vars["originalUrl"].get().strip(),
            "translatedUrl": self.vars["translatedUrl"].get().strip(),
            "description": self.vars["description"].get().strip(),
            "thumbnail": self.vars["thumbnail"].get().strip(),
            "dateAdded": self.vars["dateAdded"].get().strip(),
        }
        self.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    try:
        ttk.Style().theme_use("clam")
    except Exception:
        pass
    app = DataManagerGUI(root)
    root.mainloop()
