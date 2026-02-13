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
        ttk.Button(btn_bar, text="管理作者链接", command=self.manage_author_links).pack(
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
        ttk.Button(
            btn_bar, text="清除所有缩略图", command=self.clear_all_thumbnails
        ).pack(side=tk.LEFT, padx=2)
        ttk.Button(
            btn_bar, text="生成缩略图URL", command=self.generate_thumbnail_urls
        ).pack(side=tk.LEFT, padx=2)
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

        # 处理多译者
        translators_set = set()
        for i in self.data:
            if i.get("translator"):
                # 支持多种分隔符：, 、、&和
                drama_translators = re.split(r"[,、&和]\s*", i["translator"])
                for translator in drama_translators:
                    translator = translator.strip()
                    if translator:
                        translators_set.add(translator)

        translators = sorted(list(translators_set))
        tags = set()
        for i in self.data:
            tags.update(i.get("tags", []))

        # 按首字母拼音排序
        def get_pinyin_first_char(text):
            # 简单的中文首字母提取实现
            if not text:
                return "Z"

            first_char = text[0]

            # 如果是英文字母，直接返回大写
            if first_char.isalpha() and ord(first_char) < 128:
                return first_char.upper()

            # 简单的中文到拼音首字母映射（常见字）
            pinyin_map = {
                "啊": "A",
                "爱": "A",
                "安": "A",
                "按": "A",
                "八": "B",
                "白": "B",
                "百": "B",
                "博": "B",
                "不": "B",
                "才": "C",
                "彩": "C",
                "草": "C",
                "常": "C",
                "成": "C",
                "出": "C",
                "大": "D",
                "的": "D",
                "地": "D",
                "第": "D",
                "东": "D",
                "都": "D",
                "而": "E",
                "二": "E",
                "发": "F",
                "法": "F",
                "反": "F",
                "风": "F",
                "芙": "F",
                "个": "G",
                "给": "G",
                "古": "G",
                "关": "G",
                "光": "G",
                "广": "G",
                "还": "H",
                "海": "H",
                "和": "H",
                "黑": "H",
                "红": "H",
                "后": "H",
                "魂": "H",
                "机": "J",
                "基": "J",
                "极": "J",
                "记": "J",
                "家": "J",
                "见": "J",
                "江": "J",
                "今": "J",
                "经": "J",
                "就": "J",
                "可": "K",
                "看": "K",
                "空": "K",
                "来": "L",
                "蓝": "L",
                "老": "L",
                "雷": "L",
                "冷": "L",
                "里": "L",
                "恋": "L",
                "灵": "L",
                "六": "L",
                "龙": "L",
                "露": "L",
                "妈": "M",
                "魔": "M",
                "美": "M",
                "梦": "M",
                "迷": "M",
                "命": "M",
                "那": "N",
                "南": "N",
                "能": "N",
                "你": "N",
                "年": "N",
                "鸟": "N",
                "派": "P",
                "判": "P",
                "七": "Q",
                "奇": "Q",
                "琪": "Q",
                "起": "Q",
                "千": "Q",
                "前": "Q",
                "枪": "Q",
                "青": "Q",
                "秋": "Q",
                "去": "Q",
                "让": "R",
                "人": "R",
                "日": "R",
                "如": "R",
                "三": "S",
                "色": "S",
                "杀": "S",
                "山": "S",
                "上": "S",
                "神": "S",
                "圣": "S",
                "十": "S",
                "时": "S",
                "水": "S",
                "说": "S",
                "她": "T",
                "他": "T",
                "天": "T",
                "通": "T",
                "同": "T",
                "外": "W",
                "完": "W",
                "王": "W",
                "为": "W",
                "文": "W",
                "我": "W",
                "无": "W",
                "五": "W",
                "西": "X",
                "希": "X",
                "下": "X",
                "仙": "X",
                "小": "X",
                "新": "X",
                "星": "X",
                "行": "X",
                "一": "Y",
                "医": "Y",
                "永": "Y",
                "有": "Y",
                "右": "Y",
                "与": "Y",
                "宇": "Y",
                "雨": "Y",
                "玉": "Y",
                "月": "Y",
                "在": "Z",
                "早": "Z",
                "怎": "Z",
                "阵": "Z",
                "正": "Z",
                "之": "Z",
                "知": "Z",
                "直": "Z",
                "中": "Z",
                "重": "Z",
                "主": "Z",
                "住": "Z",
                "转": "Z",
                "装": "Z",
                "追": "Z",
                "紫": "Z",
                "自": "Z",
            }

            # 尝试从映射表中获取
            if first_char in pinyin_map:
                return pinyin_map[first_char]

            # 如果不在映射表中，尝试使用pinyin库
            try:
                import pinyin

                return pinyin.get_pinyin(first_char)[0].upper()
            except:
                # 最后的备选方案：使用Unicode编码范围粗略判断
                if "\u4e00" <= first_char <= "\u9fff":  # 中文字符范围
                    return "Z"  # 未知的汉字放在最后
                return first_char.upper()

        return {
            "authors": authors,
            "translators": translators,
            "tags": sorted(list(tags), key=get_pinyin_first_char),
        }

    def get_status_text(self, item):
        if item.get("isDomestic", False):
            return "国产"
        elif item.get("isTranslated", False):
            return "已汉化"
        else:
            return "未汉化"

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
                    self.get_status_text(item),
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
            # 先读取现有的data.js文件，保留authorLinks部分
            author_links_content = ""
            existing_links = {}
            try:
                with open("data.js", "r", encoding="utf-8") as f:
                    existing_content = f.read()
                    # 查找authorLinks部分
                    match = re.search(
                        r"const authorLinks = ({.*?});", existing_content, re.DOTALL
                    )
                    if match:
                        links_str = match.group(1)
                        print(f"原始authorLinks字符串: {repr(links_str[:200])}")

                        # 最简单的方法：按行处理
                        lines = links_str.split("\n")
                        existing_links = {}

                        for line in lines:
                            line = line.strip()
                            # 跳过空行和注释行
                            if (
                                not line
                                or line.startswith("//")
                                or not line.startswith('"')
                            ):
                                continue

                            # 处理键值对
                            if ":" in line and line.endswith(","):
                                line = line.rstrip(",")  # 移除末尾逗号

                            if ":" in line:
                                try:
                                    # 直接用JSON解析这一行
                                    line_json = "{" + line + "}"
                                    parsed = json.loads(line_json)
                                    for key, value in parsed.items():
                                        existing_links[key] = value
                                except:
                                    # 手动解析
                                    parts = line.split(":", 1)
                                    if len(parts) == 2:
                                        key = parts[0].strip().strip('"')
                                        value = parts[1].strip().strip('"')
                                        if key:
                                            existing_links[key] = value

                        print(f"解析authorLinks成功，共有 {len(existing_links)} 个链接")
                        author_links_content = f"const authorLinks = {match.group(1)};"
            except Exception as e:
                print(f"读取现有authorLinks时出错: {e}")

            # 自动检测新的作者和译者
            detected_authors = set()
            detected_translators = set()

            for item in self.data:
                if item.get("author"):
                    detected_authors.add(item["author"])
                if item.get("translator"):
                    # 处理多译者：使用正则表达式分割
                    drama_translators = re.split(r"[,、&和]\s*", item["translator"])
                    for translator in drama_translators:
                        translator = translator.strip()
                        if translator:
                            detected_translators.add(translator)

            # 更新authorLinks，添加新检测到的作者/译者
            updated_links = existing_links.copy()
            new_authors = 0
            new_translators = 0

            for author in detected_authors:
                if author not in updated_links:
                    updated_links[author] = ""  # 空字符串表示需要手动添加链接
                    new_authors += 1
                    print(f"检测到新作者: {author}")

            for translator in detected_translators:
                # 过滤掉包含分隔符的条目（这些是多译者组合）
                if (
                    not re.search(r"[,、&和]", translator)
                    and translator not in updated_links
                ):
                    updated_links[translator] = ""  # 空字符串表示需要手动添加链接
                    new_translators += 1
                    print(f"检测到新译者: {translator}")

            # 生成新的authorLinks内容
            if updated_links:
                author_links_content = (
                    "const authorLinks = "
                    + json.dumps(updated_links, ensure_ascii=False, indent=4)
                    + ";"
                )

            # 生成dramas数组内容
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
        isDomestic: {str(item.get("isDomestic", False)).lower()},
        originalUrl: {json.dumps(item["originalUrl"], ensure_ascii=False)},
        translatedUrl: {json.dumps(item["translatedUrl"], ensure_ascii=False)},
        description: {json.dumps(item["description"], ensure_ascii=False)},
        thumbnail: {json.dumps(item["thumbnail"], ensure_ascii=False)},
        dateAdded: {json.dumps(item["dateAdded"], ensure_ascii=False)}
    }}{"," if i < len(self.data) - 1 else ""}"""
            content += "\n];\n\n"

            # 添加authorLinks部分
            if author_links_content:
                content += author_links_content + "\n"

            # 写入文件
            with open("data.js", "w", encoding="utf-8") as f:
                f.write(content)

            # 显示保存结果
            if not silent:
                message = "数据已成功同步到 data.js"
                if new_authors > 0 or new_translators > 0:
                    message += f"\n\n自动检测到:\n- {new_authors} 个新作者\n- {new_translators} 个新译者\n\n已添加到authorLinks中，链接为空，请手动补充"
                messagebox.showinfo("成功", message)
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

    def manage_author_links(self):
        """管理作者和译者链接"""
        dialog = AuthorLinksDialog(self.root, self.data)
        self.root.wait_window(dialog)
        if dialog.result:
            self.save_data_gui()

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

    def clear_all_thumbnails(self):
        """一键清除所有条目的thumbnail值"""
        if not self.data:
            messagebox.showinfo("提示", "当前没有数据条目")
            return

        # 统计有多少条目有缩略图
        items_with_thumbnails = sum(1 for item in self.data if item.get("thumbnail"))

        if items_with_thumbnails == 0:
            messagebox.showinfo("提示", "所有条目都没有缩略图")
            return

        # 确认对话框
        confirm_msg = f"确定要清除所有 {items_with_thumbnails} 个条目的缩略图吗？\n\n此操作不可撤销！"
        if messagebox.askyesno("确认清除", confirm_msg, icon="warning"):
            # 清除所有thumbnail值
            cleared_count = 0
            for item in self.data:
                if item.get("thumbnail"):
                    item["thumbnail"] = ""
                    cleared_count += 1

            # 刷新显示并保存
            self.fill_treeview()
            self.save_data_gui(silent=True)

            # 显示成功消息
            messagebox.showinfo(
                "成功",
                f"已成功清除 {cleared_count} 个条目的缩略图\n\n数据已自动保存到 data.js",
            )

    def generate_thumbnail_urls(self):
        """根据ID自动生成缩略图URL"""
        if not self.data:
            messagebox.showinfo("提示", "当前没有数据条目")
            return

        # 创建生成URL对话框
        dialog = ThumbnailUrlDialog(self.root)
        self.root.wait_window(dialog)

        if dialog.result:
            url_template, start_id, end_id, update_empty_only = dialog.result

            # 统计将要更新的条目
            items_to_update = []
            for item in self.data:
                if start_id <= item["id"] <= end_id:
                    if update_empty_only:
                        if not item.get("thumbnail"):
                            items_to_update.append(item)
                    else:
                        items_to_update.append(item)

            if not items_to_update:
                messagebox.showinfo("提示", "没有找到需要更新的条目")
                return

            # 确认对话框
            confirm_msg = f"确定要更新 {len(items_to_update)} 个条目的缩略图URL吗？\n\n"
            confirm_msg += f"URL格式: {url_template.replace('{id}', 'ID')}\n"
            confirm_msg += f"ID范围: {start_id}-{end_id}"

            if messagebox.askyesno("确认更新", confirm_msg):
                # 执行更新
                updated_count = 0
                for item in items_to_update:
                    new_url = url_template.format(id=item["id"])
                    if item.get("thumbnail") != new_url:
                        item["thumbnail"] = new_url
                        updated_count += 1

                # 刷新显示并保存
                self.fill_treeview()
                self.save_data_gui(silent=True)

                messagebox.showinfo(
                    "成功",
                    f"已成功更新 {updated_count} 个条目的缩略图URL\n\n数据已自动保存到 data.js",
                )


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
        example_json = """{
  "id": 1,
  "title": "作品标题",
  "author": "作者",
  "translator": "汉化者",
  "tags": ["标签1", "标签2"],
  "isTranslated": true,
  "isDomestic": false,
  "originalUrl": "原版链接",
  "translatedUrl": "汉化链接",
  "description": "简介",
  "thumbnail": "封面图链接",
  "dateAdded": "2024-01-01"
}"""
        example_text.insert(tk.END, example_json)
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
        self.item = item
        self.suggestions = suggestions
        self.result = None
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

    def _create_tooltip(self, widget, text):
        """为控件创建工具提示"""

        def on_enter(event):
            tooltip = tk.Toplevel()
            tooltip.wm_overrideredirect(True)
            tooltip.wm_geometry(f"+{event.x_root + 10}+{event.y_root + 10}")
            label = tk.Label(
                tooltip,
                text=text,
                background="lightyellow",
                relief=tk.SOLID,
                borderwidth=1,
                font=("Microsoft YaHei", 9),
            )
            label.pack()
            widget.tooltip = tooltip

        def on_leave(event):
            if hasattr(widget, "tooltip"):
                widget.tooltip.destroy()
                del widget.tooltip

        widget.bind("<Enter>", on_enter)
        widget.bind("<Leave>", on_leave)

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
                # 为译者字段添加提示
                if key == "translator":
                    cb.insert(0, "")  # 确保是空的
                    # 添加工具提示
                    self._create_tooltip(cb, "多个译者请用逗号、顿号、&或和分隔")
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
        tag_entry = ttk.Entry(f, textvariable=self.vars["tags"])
        tag_entry.grid(row=5, column=1, sticky=tk.EW, pady=5)

        # 为tag输入框绑定自动补全
        self._setup_tag_autocomplete(tag_entry)

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

        # 状态选择
        status_frame = ttk.Frame(f)
        status_frame.grid(row=13, column=0, columnspan=2, sticky=tk.W, pady=5)

        self.status_var = tk.StringVar()

        # 获取当前状态
        current_status = "未汉化"
        if self.item.get("isDomestic", False):
            current_status = "国产"
        elif self.item.get("isTranslated", False):
            current_status = "已汉化"

        self.status_var.set(current_status)

        # 创建单选按钮
        statuses = ["未汉化", "已汉化", "国产"]
        for i, status in enumerate(statuses):
            ttk.Radiobutton(
                status_frame, text=status, variable=self.status_var, value=status
            ).pack(side=tk.LEFT, padx=10)

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

    def _setup_tag_autocomplete(self, entry_widget):
        """为tag输入框设置自动补全功能"""
        self.autocomplete_listbox = None
        self._arrow_key_pressed = False  # 添加标志

        def on_key_press(event):
            # 如果是箭头键，设置标志并返回
            if event.keysym in ["Up", "Down"]:
                self._arrow_key_pressed = True
                return

            # 获取当前输入的最后一个词
            current_text = entry_widget.get()
            cursor_pos = entry_widget.index(tk.INSERT)

            # 找到当前光标所在位置的词
            text_before_cursor = current_text[:cursor_pos]
            words = text_before_cursor.split(",")
            current_word = words[-1].strip() if words else ""

            if len(current_word) < 1:
                self._hide_autocomplete()
                return

            # 查找匹配的标签
            all_tags = self.suggestions.get("tags", [])
            matches = [
                tag for tag in all_tags if tag.lower().startswith(current_word.lower())
            ]

            if matches:
                self._show_autocomplete(entry_widget, matches, current_word)
            else:
                self._hide_autocomplete()

        def on_key_release(event):
            # 如果是箭头键，清除标志并返回
            if event.keysym in ["Up", "Down"]:
                self._arrow_key_pressed = False
                return "break"  # 阻止进一步处理

            # 如果箭头键刚被按下，不处理自动补全
            if self._arrow_key_pressed:
                return

            # 获取当前输入的最后一个词
            current_text = entry_widget.get()
            cursor_pos = entry_widget.index(tk.INSERT)

            # 找到当前光标所在位置的词
            text_before_cursor = current_text[:cursor_pos]
            words = text_before_cursor.split(",")
            current_word = words[-1].strip() if words else ""

            if len(current_word) < 1:
                self._hide_autocomplete()
                return

            # 查找匹配的标签
            all_tags = self.suggestions.get("tags", [])
            matches = [
                tag for tag in all_tags if tag.lower().startswith(current_word.lower())
            ]

            if matches:
                self._show_autocomplete(entry_widget, matches, current_word)
            else:
                self._hide_autocomplete()

        def on_tab_press(event):
            if not self.autocomplete_listbox:
                return

            # 检查是否有选择项，如果没有则选择第一项
            selection = self.autocomplete_listbox.curselection()
            if not selection:
                self.autocomplete_listbox.selection_set(0)
                selection = (0,)

            if selection:
                selected_tag = self.autocomplete_listbox.get(selection[0])
                current_text = entry_widget.get()
                cursor_pos = entry_widget.index(tk.INSERT)

                # 找到当前光标所在位置的词
                text_before_cursor = current_text[:cursor_pos]
                words = text_before_cursor.split(",")

                # 替换最后一个词并添加逗号
                if len(words) > 1:
                    words[-1] = selected_tag + ", "
                    new_text = ",".join(words)
                else:
                    new_text = selected_tag + ", "

                entry_widget.delete(0, tk.END)
                entry_widget.insert(0, new_text)
                entry_widget.icursor(len(new_text))

                self._hide_autocomplete()
                return "break"  # 阻止默认Tab行为

        def on_escape_press(event):
            self._hide_autocomplete()
            return "break"

        def on_focus_out(event):
            # 延迟隐藏，以便点击列表项
            self.after(100, self._hide_autocomplete)

        def on_arrow_key_press(event):
            if not self.autocomplete_listbox:
                return

            # 只处理上下箭头键
            if event.keysym not in ["Up", "Down"]:
                return

            current_selection = self.autocomplete_listbox.curselection()
            current_index = current_selection[0] if current_selection else 0

            if event.keysym == "Up":
                # 向上选择
                if current_index > 0:
                    self.autocomplete_listbox.selection_clear(0, tk.END)
                    self.autocomplete_listbox.selection_set(current_index - 1)
                    self.autocomplete_listbox.see(current_index - 1)
            elif event.keysym == "Down":
                # 向下选择
                if current_index < self.autocomplete_listbox.size() - 1:
                    self.autocomplete_listbox.selection_clear(0, tk.END)
                    self.autocomplete_listbox.selection_set(current_index + 1)
                    self.autocomplete_listbox.see(current_index + 1)

            # 阻止事件传播到KeyRelease
            return "break"

        entry_widget.bind("<KeyPress>", on_arrow_key_press)  # 先绑定箭头键
        entry_widget.bind("<KeyRelease>", on_key_release)  # 使用新的KeyRelease处理
        entry_widget.bind("<Tab>", on_tab_press)
        entry_widget.bind("<Escape>", on_escape_press)
        entry_widget.bind("<FocusOut>", on_focus_out)

    def _show_autocomplete(self, entry_widget, matches, current_word):
        """显示自动补全列表"""
        if self.autocomplete_listbox:
            self.autocomplete_listbox.destroy()

        # 创建列表框 - 使用self作为父窗口
        self.autocomplete_listbox = tk.Listbox(
            self,
            height=min(6, len(matches)),
            bg="white",
            fg="black",
            selectbackground="#0078d4",
            selectforeground="white",
            font=("Segoe UI", 9),
            relief="solid",
            borderwidth=1,
        )

        # 填充匹配项
        for match in matches[:6]:  # 最多显示6个
            self.autocomplete_listbox.insert(tk.END, match)

        # 默认选中第一项
        if matches:
            self.autocomplete_listbox.selection_set(0)

        # 计算位置 - 使用entry_widget的坐标
        entry_widget.update_idletasks()  # 确保窗口已更新
        entry_x = entry_widget.winfo_rootx()
        entry_y = entry_widget.winfo_rooty()
        entry_height = entry_widget.winfo_height()
        entry_width = entry_widget.winfo_width()

        # 将列表框定位到输入框下方
        self.autocomplete_listbox.place(
            x=entry_x - self.winfo_rootx(),
            y=entry_y - self.winfo_rooty() + entry_height,
            width=entry_width,
        )

        # 绑定点击事件
        def on_listbox_click(event):
            selection = self.autocomplete_listbox.curselection()
            if selection:
                selected_tag = self.autocomplete_listbox.get(selection[0])
                current_text = entry_widget.get()
                cursor_pos = entry_widget.index(tk.INSERT)

                # 找到当前光标所在位置的词
                text_before_cursor = current_text[:cursor_pos]
                words = text_before_cursor.split(",")

                # 替换最后一个词并添加逗号
                if len(words) > 1:
                    words[-1] = selected_tag + ", "
                    new_text = ",".join(words)
                else:
                    new_text = selected_tag + ", "

                entry_widget.delete(0, tk.END)
                entry_widget.insert(0, new_text)
                entry_widget.icursor(len(new_text))

                self._hide_autocomplete()

        self.autocomplete_listbox.bind("<ButtonRelease-1>", on_listbox_click)

    def _hide_autocomplete(self):
        """隐藏自动补全列表"""
        if self.autocomplete_listbox:
            self.autocomplete_listbox.destroy()
            self.autocomplete_listbox = None

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
            "isTranslated": self.status_var.get() == "已汉化",
            "isDomestic": self.status_var.get() == "国产",
            "originalUrl": self.vars["originalUrl"].get().strip(),
            "translatedUrl": self.vars["translatedUrl"].get().strip(),
            "description": self.vars["description"].get().strip(),
            "thumbnail": self.vars["thumbnail"].get().strip(),
            "dateAdded": self.vars["dateAdded"].get().strip(),
        }
        self.destroy()


class AuthorLinksDialog(tk.Toplevel):
    def __init__(self, parent, data):
        super().__init__(parent)
        self.title("管理作者/译者链接")
        self.data = data
        self.result = None
        self.geometry("600x500")

        # 主框架
        main_frame = ttk.Frame(self, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 说明
        ttk.Label(
            main_frame,
            text="配置作者和译者的主页链接，支持YouTube和B站",
            font=("Microsoft YaHei", 10),
        ).pack(pady=(0, 10))

        # 创建表格框架
        table_frame = ttk.Frame(main_frame)
        table_frame.pack(fill=tk.BOTH, expand=True)

        # 滚动条
        scrollbar = ttk.Scrollbar(table_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # 树形视图
        self.tree = ttk.Treeview(
            table_frame,
            columns=("name", "link"),
            show="headings",
            yscrollcommand=scrollbar.set,
        )
        self.tree.heading("name", text="作者/译者")
        self.tree.heading("link", text="主页链接")
        self.tree.column("name", width=200)
        self.tree.column("link", width=350)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.tree.yview)

        # 加载现有链接
        self.load_existing_links()

        # 按钮区
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=(10, 0))

        ttk.Button(btn_frame, text="添加/修改", command=self.add_edit_link).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(btn_frame, text="删除", command=self.delete_link).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(btn_frame, text="保存", command=self.save_links).pack(
            side=tk.RIGHT, padx=2
        )
        ttk.Button(btn_frame, text="取消", command=self.destroy).pack(
            side=tk.RIGHT, padx=2
        )

        # 双击编辑
        self.tree.bind("<Double-1>", lambda e: self.add_edit_link())

    def load_existing_links(self):
        """加载现有的作者链接"""
        # 从data.js中提取authorLinks
        try:
            with open("data.js", "r", encoding="utf-8") as f:
                content = f.read()

            # 查找authorLinks对象
            match = re.search(r"const authorLinks = ({.*?});", content, re.DOTALL)
            if match:
                links_str = match.group(1)
                print(f"原始字符串: {repr(links_str[:200])}")

                # 移除JavaScript注释，使其成为有效的JSON
                # 移除单行注释 //（但不包括URL中的//）
                links_str = re.sub(r"^\s*//.*$", "", links_str, flags=re.MULTILINE)
                # 移除多行注释 /* */
                links_str = re.sub(r"/\*.*?\*/", "", links_str, flags=re.DOTALL)
                # 移除多余的逗号和空白
                links_str = re.sub(r",\s*}", "}", links_str)
                links_str = re.sub(r",\s*]", "]", links_str)
                links_str = links_str.strip()

                print(f"清理后字符串: {repr(links_str[:200])}")

                # 尝试解析JSON，如果失败则尝试修复常见问题
                try:
                    self.author_links = json.loads(links_str)
                except json.JSONDecodeError as e:
                    print(f"JSON解析错误详情: {e}")
                    # 尝试修复常见的JSON问题
                    # 移除控制字符但保留必要的换行符
                    links_str = re.sub(
                        r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]", "", links_str
                    )
                    # 确保字符串使用双引号
                    links_str = re.sub(r"'([^']*)'", r'"\1"', links_str)
                    print(f"修复后字符串: {repr(links_str[:200])}")
                    self.author_links = json.loads(links_str)

                print(f"解析成功，共有 {len(self.author_links)} 个链接")
            else:
                print("未找到authorLinks对象")
                self.author_links = {}
        except Exception as e:
            print(f"加载作者链接时出错: {e}")
            import traceback

            traceback.print_exc()
            self.author_links = {}

        # 显示到表格
        print(f"准备显示到表格，链接数量: {len(self.author_links)}")
        for name, link in self.author_links.items():
            print(f"添加: {name} -> {link}")
            self.tree.insert("", tk.END, values=(name, link))

    def add_edit_link(self):
        """添加或修改链接"""
        selection = self.tree.selection()
        if selection:
            item = self.tree.item(selection[0])
            name, link = item["values"]
        else:
            name = ""
            link = ""

        dialog = LinkEditDialog(self, name, link)
        self.wait_window(dialog)

        if dialog.result:
            new_name, new_link = dialog.result
            # 更新或添加
            if selection:
                self.tree.item(selection[0], values=(new_name, new_link))
            else:
                self.tree.insert("", tk.END, values=(new_name, new_link))

    def delete_link(self):
        """删除链接"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("提示", "请先选择要删除的项目")
            return

        if messagebox.askyesno("确认", "确定要删除这个链接吗？"):
            self.tree.delete(selection[0])

    def save_links(self):
        """保存链接到data.js"""
        # 收集所有链接
        links = {}
        for child in self.tree.get_children():
            name, link = self.tree.item(child)["values"]
            if name and link:
                links[name] = link

        # 读取data.js文件
        try:
            with open("data.js", "r", encoding="utf-8") as f:
                content = f.read()
        except:
            messagebox.showerror("错误", "无法读取data.js文件")
            return

        # 替换authorLinks部分
        new_links_str = (
            "const authorLinks = "
            + json.dumps(links, ensure_ascii=False, indent=4)
            + ";"
        )

        # 查找并替换
        pattern = r"const authorLinks = {.*?};"
        if re.search(pattern, content, re.DOTALL):
            new_content = re.sub(pattern, new_links_str, content, flags=re.DOTALL)
        else:
            # 如果没有找到，在文件开头添加
            new_content = new_links_str + "\n\n" + content

        # 保存文件
        try:
            with open("data.js", "w", encoding="utf-8") as f:
                f.write(new_content)
            self.result = True
            messagebox.showinfo("成功", "作者链接已保存")
            self.destroy()
        except Exception as e:
            messagebox.showerror("错误", f"保存失败: {str(e)}")


class LinkEditDialog(tk.Toplevel):
    def __init__(self, parent, name="", link=""):
        super().__init__(parent)
        self.title("编辑链接")
        self.result = None
        self.geometry("400x200")

        # 主框架
        main_frame = ttk.Frame(self, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 名称输入
        ttk.Label(main_frame, text="作者/译者名称:").pack(anchor=tk.W)
        self.name_var = tk.StringVar(value=name)
        ttk.Entry(main_frame, textvariable=self.name_var, width=50).pack(
            fill=tk.X, pady=(0, 10)
        )

        # 链接输入
        ttk.Label(main_frame, text="主页链接:").pack(anchor=tk.W)
        self.link_var = tk.StringVar(value=link)
        ttk.Entry(main_frame, textvariable=self.link_var, width=50).pack(
            fill=tk.X, pady=(0, 10)
        )

        # 说明
        ttk.Label(
            main_frame,
            text="支持YouTube频道链接或B站空间链接",
            font=("Microsoft YaHei", 9),
            foreground="#666",
        ).pack(pady=(0, 10))

        # 按钮
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X)

        ttk.Button(btn_frame, text="确定", command=self.ok).pack(side=tk.RIGHT, padx=2)
        ttk.Button(btn_frame, text="取消", command=self.destroy).pack(
            side=tk.RIGHT, padx=2
        )

    def ok(self):
        name = self.name_var.get().strip()
        link = self.link_var.get().strip()

        if not name:
            messagebox.showwarning("提示", "请输入作者/译者名称")
            return

        if not link:
            messagebox.showwarning("提示", "请输入主页链接")
            return

        self.result = (name, link)
        self.destroy()


class ThumbnailUrlDialog(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("生成缩略图URL")
        self.geometry("600x500")  # 增加高度以适应滚动条
        self.result = None

        # 主框架 - 使用Canvas和滚动条
        canvas = tk.Canvas(self)
        scrollbar = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        main_frame = ttk.Frame(canvas)

        # 配置滚动条
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)
        canvas.create_window((0, 0), window=main_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # 更新滚动区域
        def configure_scroll_region(event=None):
            canvas.configure(scrollregion=canvas.bbox("all"))

        # 绑定鼠标滚轮事件到整个窗口
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        # 绑定到canvas、main_frame和顶级窗口
        canvas.bind("<MouseWheel>", on_mousewheel)
        main_frame.bind("<MouseWheel>", on_mousewheel)
        self.bind("<MouseWheel>", on_mousewheel)
        main_frame.bind("<Configure>", configure_scroll_region)

        # URL格式选择
        format_frame = ttk.LabelFrame(main_frame, text="URL格式", padding="10")
        format_frame.pack(fill=tk.X, pady=(0, 20))

        self.url_format = tk.StringVar(value="cloudinary")

        ttk.Radiobutton(
            format_frame,
            text="Cloudinary",
            variable=self.url_format,
            value="cloudinary",
            command=self.update_url_preview,
        ).pack(anchor=tk.W)
        ttk.Radiobutton(
            format_frame,
            text="GitHub + jsDelivr",
            variable=self.url_format,
            value="github",
            command=self.update_url_preview,
        ).pack(anchor=tk.W)
        ttk.Radiobutton(
            format_frame,
            text="自定义URL",
            variable=self.url_format,
            value="custom",
            command=self.update_url_preview,
        ).pack(anchor=tk.W)

        # URL配置
        config_frame = ttk.LabelFrame(main_frame, text="URL配置", padding="10")
        config_frame.pack(fill=tk.X, pady=(0, 20))

        # Cloudinary配置
        self.cloud_frame = ttk.Frame(config_frame)
        ttk.Label(self.cloud_frame, text="云名称:").grid(
            row=0, column=0, sticky=tk.W, pady=2
        )
        self.cloud_name = tk.StringVar(value="do6rggmy6")
        ttk.Entry(self.cloud_frame, textvariable=self.cloud_name).grid(
            row=0, column=1, sticky=tk.EW, pady=2
        )

        ttk.Label(self.cloud_frame, text="版本号:").grid(
            row=1, column=0, sticky=tk.W, pady=2
        )
        self.cloud_version = tk.StringVar(value="v1770352189")
        ttk.Entry(self.cloud_frame, textvariable=self.cloud_version).grid(
            row=1, column=1, sticky=tk.EW, pady=2
        )

        ttk.Label(self.cloud_frame, text="文件夹:").grid(
            row=2, column=0, sticky=tk.W, pady=2
        )
        self.cloud_folder = tk.StringVar(value="touhou/thumbnails")
        ttk.Entry(self.cloud_frame, textvariable=self.cloud_folder).grid(
            row=2, column=1, sticky=tk.EW, pady=2
        )

        self.cloud_frame.columnconfigure(1, weight=1)

        # GitHub配置
        self.github_frame = ttk.Frame(config_frame)
        ttk.Label(self.github_frame, text="用户名:").grid(
            row=0, column=0, sticky=tk.W, pady=2
        )
        self.github_user = tk.StringVar(value="Fairy-Oracle-Sanctuary")
        ttk.Entry(self.github_frame, textvariable=self.github_user).grid(
            row=0, column=1, sticky=tk.EW, pady=2
        )

        ttk.Label(self.github_frame, text="仓库名:").grid(
            row=1, column=0, sticky=tk.W, pady=2
        )
        self.github_repo = tk.StringVar(value="Touhou-Chabangeki-Collect")
        ttk.Entry(self.github_frame, textvariable=self.github_repo).grid(
            row=1, column=1, sticky=tk.EW, pady=2
        )

        ttk.Label(self.github_frame, text="文件夹:").grid(
            row=2, column=0, sticky=tk.W, pady=2
        )
        self.github_folder = tk.StringVar(value="images")
        ttk.Entry(self.github_frame, textvariable=self.github_folder).grid(
            row=2, column=1, sticky=tk.EW, pady=2
        )

        self.github_frame.columnconfigure(1, weight=1)

        # 自定义配置
        self.custom_frame = ttk.Frame(config_frame)
        ttk.Label(self.custom_frame, text="基础URL:").grid(
            row=0, column=0, sticky=tk.W, pady=2
        )
        self.custom_base = tk.StringVar(value="https://example.com/images/")
        ttk.Entry(self.custom_frame, textvariable=self.custom_base).grid(
            row=0, column=1, sticky=tk.EW, pady=2
        )

        self.custom_frame.columnconfigure(1, weight=1)

        # 范围选择
        range_frame = ttk.LabelFrame(main_frame, text="ID范围", padding="10")
        range_frame.pack(fill=tk.X, pady=(0, 20))

        range_input_frame = ttk.Frame(range_frame)
        range_input_frame.pack(fill=tk.X)

        ttk.Label(range_input_frame, text="从:").pack(side=tk.LEFT)
        self.start_id = tk.StringVar(value="1")
        ttk.Entry(range_input_frame, textvariable=self.start_id, width=8).pack(
            side=tk.LEFT, padx=(5, 10)
        )

        ttk.Label(range_input_frame, text="到:").pack(side=tk.LEFT)
        self.end_id = tk.StringVar(value="70")
        ttk.Entry(range_input_frame, textvariable=self.end_id, width=8).pack(
            side=tk.LEFT, padx=(5, 10)
        )

        # 选项
        self.update_empty_only = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            range_frame, text="仅更新空的缩略图", variable=self.update_empty_only
        ).pack(anchor=tk.W, pady=(10, 0))

        # URL预览
        preview_frame = ttk.LabelFrame(main_frame, text="URL预览", padding="10")
        preview_frame.pack(fill=tk.X, pady=(0, 20))

        self.preview_label = ttk.Label(
            preview_frame,
            text="请选择URL格式",
            font=("Microsoft YaHei", 9),
            wraplength=550,
        )
        self.preview_label.pack(anchor=tk.W)

        # 按钮
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X)

        ttk.Button(btn_frame, text="确定", command=self.ok).pack(
            side=tk.RIGHT, padx=(5, 0)
        )
        ttk.Button(btn_frame, text="取消", command=self.destroy).pack(side=tk.RIGHT)

        # 初始化显示
        self.update_url_preview()

    def update_url_preview(self):
        """更新URL预览"""
        format_type = self.url_format.get()

        # 隐藏所有配置框架
        self.cloud_frame.pack_forget()
        self.github_frame.pack_forget()
        self.custom_frame.pack_forget()

        if format_type == "cloudinary":
            self.cloud_frame.pack(fill=tk.X, pady=(5, 0))
            url = f"https://res.cloudinary.com/{self.cloud_name.get()}/image/upload/{self.cloud_version.get()}/{self.cloud_folder.get()}/{{id}}.jpg"
        elif format_type == "github":
            self.github_frame.pack(fill=tk.X, pady=(5, 0))
            url = f"https://cdn.jsdelivr.net/gh/{self.github_user.get()}/{self.github_repo.get()}/main/{self.github_folder.get()}/{{id}}.jpg"
        else:  # custom
            self.custom_frame.pack(fill=tk.X, pady=(5, 0))
            base = self.custom_base.get()
            if not base.endswith("/"):
                base += "/"
            url = f"{base}{{id}}.jpg"

        example_url = url.format(id=1)
        self.preview_label.config(text=f"示例URL: {example_url}")

    def get_url_template(self):
        """获取URL模板"""
        format_type = self.url_format.get()

        if format_type == "cloudinary":
            return f"https://res.cloudinary.com/{self.cloud_name.get()}/image/upload/{self.cloud_version.get()}/{self.cloud_folder.get()}/{{id}}.jpg"
        elif format_type == "github":
            return f"https://cdn.jsdelivr.net/gh/{self.github_user.get()}/{self.github_repo.get()}/main/{self.github_folder.get()}/{{id}}.jpg"
        else:  # custom
            base = self.custom_base.get()
            if not base.endswith("/"):
                base += "/"
            return f"{base}{{id}}.jpg"

    def ok(self):
        """确定按钮"""
        try:
            start_id = int(self.start_id.get())
            end_id = int(self.end_id.get())

            if start_id < 1 or end_id < start_id:
                messagebox.showerror("错误", "请输入有效的ID范围")
                return

        except ValueError:
            messagebox.showerror("错误", "请输入有效的数字")
            return

        url_template = self.get_url_template()
        update_empty_only = self.update_empty_only.get()

        self.result = (url_template, start_id, end_id, update_empty_only)
        self.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    try:
        ttk.Style().theme_use("clam")
    except Exception:
        pass
    app = DataManagerGUI(root)
    root.mainloop()
