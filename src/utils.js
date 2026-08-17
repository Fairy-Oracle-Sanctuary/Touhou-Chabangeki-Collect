// 状态徽章：国产 / 已汉化 / 未汉化
export function getDramaStatus(drama) {
    if (drama.isDomestic) return { text: "国产", kind: "domestic" };
    if (drama.isTranslated) return { text: "已汉化", kind: "translated" };
    return { text: "未汉化", kind: "untranslated" };
}

// 多译者拆分（兼容 , 、 & 和 分隔符）
export function getTranslators(drama) {
    if (!drama.translator) return [];
    return drama.translator.split(/[,、&和]\s*/).filter((t) => t.trim());
}

// 搜索语法解析：tag="x" artist="x" translator="x" + 模糊词
export function parseSearchInput(input) {
    const tags = [];
    const artists = [];
    const translators = [];
    let fuzzyTerm = input;

    const extract = (type, sink) => {
        const re = new RegExp(`${type}="([^"]+)"`, "gi");
        let m;
        while ((m = re.exec(input)) !== null) sink.push(m[1].toLowerCase());
        fuzzyTerm = fuzzyTerm.replace(re, "");
    };
    extract("tag", tags);
    extract("artist", artists);
    extract("translator", translators);

    return { tags, artists, translators, fuzzyTerm: fuzzyTerm.replace(/\s+/g, " ").trim().toLowerCase() };
}

// 统计：标签/作者/译者计数及 top 标签
export function getStats(dramas) {
    const tagCounts = {};
    const authorCounts = {};
    const translatorCounts = {};
    const authorTags = {};
    const translatorTags = {};

    dramas.forEach((drama) => {
        drama.tags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
        authorCounts[drama.author] = (authorCounts[drama.author] || 0) + 1;
        (authorTags[drama.author] ||= {});
        drama.tags.forEach((tag) => {
            authorTags[drama.author][tag] = (authorTags[drama.author][tag] || 0) + 1;
        });
        getTranslators(drama).forEach((translator) => {
            translatorCounts[translator] = (translatorCounts[translator] || 0) + 1;
            (translatorTags[translator] ||= {});
            drama.tags.forEach((tag) => {
                translatorTags[translator][tag] = (translatorTags[translator][tag] || 0) + 1;
            });
        });
    });

    const toSorted = (counts, tagsMap) =>
        Object.entries(counts)
            .map(([name, count]) => ({
                name,
                count,
                topTags: Object.entries(tagsMap[name] || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([tag]) => tag),
            }))
            .sort((a, b) => b.count - a.count);

    return {
        sortedTags: Object.entries(tagCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        sortedAuthors: toSorted(authorCounts, authorTags),
        sortedTranslators: toSorted(translatorCounts, translatorTags),
    };
}

// 月度发布数据
export function getMonthlyData(dramas, showAll = false) {
    const monthlyCount = {};
    dramas.forEach((drama) => {
        const d = new Date(drama.dateAdded);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyCount[key] = (monthlyCount[key] || 0) + 1;
    });
    const sortedMonths = Object.keys(monthlyCount).sort();
    const displayMonths = showAll ? sortedMonths : sortedMonths.slice(-6);
    return {
        labels: displayMonths,
        data: displayMonths.map((m) => monthlyCount[m] || 0),
        allLabels: sortedMonths,
        allData: sortedMonths.map((m) => monthlyCount[m] || 0),
    };
}

// 相关作品推荐：同作者+10 / 同译者+8 / 同标签×2 / 同汉化状态+1
export function getRelatedWorks(dramas, currentDrama, limit = 6) {
    const scores = new Map();
    const currentTranslators = getTranslators(currentDrama);

    dramas.forEach((drama) => {
        if (drama.id === currentDrama.id) return;
        let score = 0;
        if (drama.author === currentDrama.author) score += 10;
        if (drama.translator && currentDrama.translator) {
            if (getTranslators(drama).some((t) => currentTranslators.includes(t))) score += 8;
        }
        score += drama.tags.filter((tag) => currentDrama.tags.includes(tag)).length * 2;
        if (drama.isTranslated === currentDrama.isTranslated) score += 1;
        if (score > 0) scores.set(drama, score);
    });

    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([drama]) => drama);
}

// 图片加载失败时生成 SVG 占位图
export function makeFallbackImage(title) {
    const text = title.length > 20 ? title.substring(0, 20) + "..." : title;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'><rect width='400' height='225' fill='#d4d4d8'/><text x='50%' y='50%' font-family='system-ui,sans-serif' font-size='16' font-weight='500' fill='#71717a' text-anchor='middle' dominant-baseline='middle'>${encodeURIComponent(text)}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

// 时间线分组：按 年年-月月
export function groupByPeriod(dramas) {
    const grouped = {};
    [...dramas]
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .forEach((drama) => {
            const d = new Date(drama.dateAdded);
            const key = `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月`;
            (grouped[key] ||= []).push(drama);
        });
    return grouped;
}
