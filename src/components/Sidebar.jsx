import { useState } from "react";
import { Icon } from "./ui.jsx";
import { getStats } from "../utils.js";

function SectionList({ title, items, expandedCount, type, activeValues, onToggleFilter, onViewPerson, onBrowse, emptyText }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, expandedCount);
    if (items.length === 0) {
        return (
            <section className="side-section">
                <h3>{title}</h3>
                <p className="side-empty">{emptyText}</p>
            </section>
        );
    }
    return (
        <section className="side-section">
            <h3>
                {title}
                <button className="icon-btn side-browse" onClick={onBrowse} title={`浏览全部${title}`} aria-label={`浏览全部${title}`}>
                    <Icon name="menu" size={15} />
                </button>
            </h3>
            <div className={type === "tag" ? "tag-cloud" : "name-list"}>
                {visible.map((item) => {
                    const active = activeValues.includes(item.name.toLowerCase());
                    if (type === "tag") {
                        return (
                            <button
                                key={item.name}
                                className={`tag-pill ${active ? "tag-pill-active" : ""}`}
                                onClick={() => onToggleFilter("tag", item.name)}
                                title={item.name}
                            >
                                #{item.name} <span className="tag-count">{item.count}</span>
                            </button>
                        );
                    }
                    return (
                        <div key={item.name} className="name-row">
                            <button
                                className={`name-btn ${active ? "name-btn-active" : ""}`}
                                onClick={() => onToggleFilter(type, item.name)}
                                title={item.name}
                            >
                                <span className="name-text">{item.name}</span>
                                <span className="name-count">{item.count}</span>
                            </button>
                            <button className="icon-btn name-info" onClick={() => onViewPerson(type, item.name)} title="查看详情">
                                <Icon name="info" size={13} />
                            </button>
                        </div>
                    );
                })}
                {items.length > expandedCount && (
                    <button className="side-expand" onClick={() => setExpanded((v) => !v)}>
                        {expanded ? "收起" : `展开全部 (${items.length - expandedCount}个)`}
                    </button>
                )}
            </div>
        </section>
    );
}

export default function Sidebar({ dramas, favoritesCount, search, onToggleFilter, onViewPerson, onBrowse, onShowFavorites }) {
    const { sortedTags, sortedAuthors, sortedTranslators } = getStats(dramas);
    // 从当前搜索串解析激活项以高亮
    const active = { tags: [], artists: [], translators: [] };
    const re = /(tag|artist|translator)="([^"]+)"/gi;
    let m;
    while ((m = re.exec(search)) !== null) {
        const key = m[1] === "tag" ? "tags" : m[1] === "artist" ? "artists" : "translators";
        active[key].push(m[2].toLowerCase());
    }

    return (
        <aside className="sidebar" id="sidebar">
            <section className="side-section side-overview">
                <h3>概览</h3>
                <button className="fav-entry" onClick={onShowFavorites}>
                    <Icon name="heart" size={16} filled={favoritesCount > 0} />
                    <span>我的收藏</span>
                    <span className="fav-count">{favoritesCount}</span>
                </button>
            </section>
            <SectionList title="标签" type="tag" items={sortedTags} expandedCount={20}
                activeValues={active.tags} onToggleFilter={onToggleFilter} onViewPerson={onViewPerson}
                onBrowse={() => onBrowse("tag")} emptyText="暂无标签" />
            <SectionList title="作者" type="artist" items={sortedAuthors} expandedCount={10}
                activeValues={active.artists} onToggleFilter={onToggleFilter} onViewPerson={onViewPerson}
                onBrowse={() => onBrowse("artist")} emptyText="暂无作者" />
            <SectionList title="译者" type="translator" items={sortedTranslators} expandedCount={10}
                activeValues={active.translators} onToggleFilter={onToggleFilter} onViewPerson={onViewPerson}
                onBrowse={() => onBrowse("translator")} emptyText="暂无译者" />
        </aside>
    );
}
