#!/usr/bin/env python3
"""
YouTube 封面批量下载脚本
从 i.ytimg.com 直接拉 maxresdefault.jpg（最高画质），保存到 public/cover/{id}.jpg
- 用 yt-dlp 获取 video_id（playlist 取最后一个视频）
- maxresdefault 不存在时自动回退到更低画质
"""

import os
import re
import sys
import argparse
import subprocess
import urllib.request
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YT_DLP = os.path.join(BASE_DIR, "yt-dlp.exe")
COVER_DIR = os.path.join(BASE_DIR, "public", "cover")
DATA_FILE = os.path.join(BASE_DIR, "data.js")

THUMB_QUALITIES = ["maxresdefault", "sddefault", "hqdefault", "mqdefault"]


def parse_data_js(path):
    """从 data.js 提取 (id, originalUrl) 列表"""
    with open(path, encoding="utf-8") as f:
        content = f.read()
    pattern = r'id:\s*(\d+),.*?originalUrl:\s*"([^"]*)"'
    matches = re.findall(pattern, content, re.DOTALL)
    return [(int(m[0]), m[1]) for m in matches]


def is_youtube(url):
    """只处理 YouTube 视频或 playlist 链接，跳过作者频道链接"""
    if "youtu.be/" in url:
        return True
    if "youtube.com/watch" in url:
        return True
    if "youtube.com/playlist" in url:
        return True
    return False


def has_playlist(url):
    parsed = urlparse(url)
    return "list" in parse_qs(parsed.query)


def get_video_id(url):
    """用 yt-dlp 获取视频 ID，playlist 取最后一个视频"""
    cmd = [YT_DLP, "--print", "id", "--no-warnings"]
    if has_playlist(url):
        cmd.extend(["--playlist-items", "-1"])
    cmd.append(url)

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        err = result.stderr.strip() or result.stdout.strip() or "yt-dlp 未知错误"
        raise RuntimeError(err)

    vid = result.stdout.strip().splitlines()
    if not vid or not vid[-1].strip():
        raise RuntimeError("yt-dlp 未返回 video id")
    return vid[-1].strip()


def download_thumbnail(video_id, output_path):
    """直接从 i.ytimg.com 下载封面，maxresdefault 优先"""
    for q in THUMB_QUALITIES:
        img_url = f"https://i.ytimg.com/vi/{video_id}/{q}.jpg"
        try:
            req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status != 200:
                    continue
                data = resp.read()
                # YouTube 对不存在的封面有时返回 120x90 占位图（约 1KB）
                if len(data) < 2000 and q == "maxresdefault":
                    continue
                with open(output_path, "wb") as f:
                    f.write(data)
                return q
        except Exception:
            continue
    raise RuntimeError("所有画质均下载失败")


def main():
    parser = argparse.ArgumentParser(description="YouTube 封面批量下载（最高画质）")
    parser.add_argument("--force", action="store_true", help="覆盖已存在的封面")
    parser.add_argument("--range", dest="id_range", help="指定 ID 范围，如 1-50 或 1,3,5")
    args = parser.parse_args()

    if not os.path.exists(YT_DLP):
        print(f"错误: 找不到 yt-dlp.exe: {YT_DLP}")
        sys.exit(1)

    os.makedirs(COVER_DIR, exist_ok=True)
    items = parse_data_js(DATA_FILE)
    yt_items = [(i, u) for i, u in items if is_youtube(u)]

    if args.id_range:
        ids = parse_id_range(args.id_range)
        yt_items = [(i, u) for i, u in yt_items if i in ids]

    print(f"共 {len(yt_items)} 条 YouTube 链接待处理\n")

    success = 0
    skipped = 0
    failed = 0
    for idx, (item_id, url) in enumerate(yt_items, 1):
        cover_path = os.path.join(COVER_DIR, f"{item_id}.jpg")
        tag = f"[{idx}/{len(yt_items)}] #{item_id}"
        if has_playlist(url):
            tag += " (playlist最后视频)"

        if os.path.exists(cover_path) and not args.force:
            print(f"{tag} 已存在，跳过（--force 覆盖）")
            skipped += 1
            continue

        print(f"{tag}")
        print(f"  URL: {url}")
        try:
            vid = get_video_id(url)
            print(f"  video_id: {vid}")
            quality = download_thumbnail(vid, cover_path)
            size_kb = os.path.getsize(cover_path) // 1024
            print(f"  已保存: {cover_path} ({quality}, {size_kb} KB)")
            success += 1
        except Exception as e:
            err_msg = str(e).splitlines()[-1] if str(e).splitlines() else str(e)
            print(f"  失败: {err_msg}")
            failed += 1

    print(f"\n完成: 成功 {success}, 跳过 {skipped}, 失败 {failed}")


def parse_id_range(s):
    """解析 ID 范围字符串，如 '1-50' 或 '1,3,5'"""
    ids = set()
    for part in s.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            ids.update(range(int(start), int(end) + 1))
        elif part:
            ids.add(int(part))
    return ids


if __name__ == "__main__":
    main()
