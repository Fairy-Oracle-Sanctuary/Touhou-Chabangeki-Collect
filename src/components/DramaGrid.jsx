import { Icon, LazyImage, StatusBadge } from "./ui.jsx";
import { getDramaStatus, getTranslators } from "../utils.js";

function DramaCard({ drama, stats, isFavorite, onToggleFavorite, onOpenDetail, onToggleFilter, layout }) {
    const status = getDramaStatus(drama);
    const translators = getTranslators(drama);
    const hasTranslatedLink = drama.isTranslated && drama.translatedUrl && !drama.isDomestic;
    const isList = layout === "list";

    return (
        <article
            className={`drama-card ${isList ? "drama-card-list" : ""}`}
            onClick={() => onOpenDetail(drama)}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onOpenDetail(drama)}
        >
            <div className="card-thumb">
                <LazyImage src={drama.thumbnail} alt={drama.title} fallbackTitle={drama.title} />
                <div className="card-status">
                    <StatusBadge status={status} />
                </div>
                {stats && (
                    <div className="card-stats">
                        <span title="点赞数"><Icon name="thumbsUp" size={11} />{stats.likes}</span>
                        <span title="收藏数"><Icon name="heart" size={11} />{stats.favorites}</span>
                    </div>
                )}
            </div>
            <div className="card-body">
                <h3 className="card-title" title={drama.title}>{drama.title}</h3>
                <div className="card-meta">
                    <button
                        className="meta-link"
                        onClick={(e) => { e.stopPropagation(); onToggleFilter("artist", drama.author); }}
                    >
                        {drama.author}
                    </button>
                    <span>·</span>
                    <span>{drama.dateAdded}</span>
                    {translators.length > 0 && (
                        <>
                            <span>·</span>
                            <span className="meta-translators" title={translators.join("、")}>{translators.join("、")}</span>
                        </>
                    )}
                </div>
                {drama.description && <p className="card-desc">{drama.description}</p>}
                <div className="card-tags">
                    {drama.tags.slice(0, 3).map((tag) => (
                        <button key={tag} className="tag-pill" onClick={(e) => { e.stopPropagation(); onToggleFilter("tag", tag); }}>
                            #{tag}
                        </button>
                    ))}
                    {drama.tags.length > 3 && <span className="tag-more">+{drama.tags.length - 3}</span>}
                </div>
                <div className="card-actions">
                    <button
                        className={`pill-btn ${isFavorite ? "pill-btn-fav" : ""}`}
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(drama.id); }}
                        title={isFavorite ? "取消收藏" : "添加收藏"}
                    >
                        <Icon name="heart" size={14} filled={isFavorite} />
                        {isFavorite ? "已收藏" : "收藏"}
                    </button>
                    {hasTranslatedLink && (
                        <a className="pill-btn pill-btn-primary" href={drama.translatedUrl} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}>
                            观看汉化
                        </a>
                    )}
                    <a className={`pill-btn pill-btn-ghost ${hasTranslatedLink ? "" : "grow"}`} href={drama.originalUrl}
                        target="_blank" rel="noopener noreferrer" title="查看原版"
                        onClick={(e) => e.stopPropagation()}>
                        {!hasTranslatedLink && "查看原版"}
                        <Icon name="external" size={14} />
                    </a>
                </div>
            </div>
        </article>
    );
}

export default function DramaGrid({ dramas, layout, isFavorite, onToggleFavorite, onOpenDetail, onToggleFilter, dramaStats, noResultsTitle, noResultsText }) {
    if (dramas.length === 0) {
        return (
            <div className="no-results">
                <Icon name="search" size={36} />
                <h3>{noResultsTitle}</h3>
                <p>{noResultsText}</p>
            </div>
        );
    }
    return (
        <div className={layout === "list" ? "drama-grid drama-grid-list" : "drama-grid"}>
            {dramas.map((drama, index) => (
                <DramaCard
                    key={drama.id}
                    drama={drama}
                    stats={dramaStats?.[drama.id]}
                    layout={layout}
                    isFavorite={isFavorite(drama.id)}
                    onToggleFavorite={onToggleFavorite}
                    onOpenDetail={onOpenDetail}
                    onToggleFilter={onToggleFilter}
                />
            ))}
        </div>
    );
}
