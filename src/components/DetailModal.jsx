import { Modal, Icon, LazyImage, StatusBadge } from "./ui.jsx";
import { getDramaStatus, getTranslators, getRelatedWorks } from "../utils.js";
import { dramas as allDramas, authorLinks } from "../data.js";

function MetaLink({ name, type, onToggleFilter }) {
    const link = authorLinks[name];
    if (link) {
        return (
            <a className="meta-link" href={link} target="_blank" rel="noopener noreferrer">{name}</a>
        );
    }
    return (
        <button className="meta-link" onClick={() => onToggleFilter(type, name)}>{name}</button>
    );
}

export default function DetailModal({ drama, isFavorite, onToggleFavorite, onClose, onOpenDetail, onToggleFilter }) {
    if (!drama) return null;
    const status = getDramaStatus(drama);
    const translators = getTranslators(drama);
    const related = getRelatedWorks(allDramas, drama);
    const hasTranslatedLink = drama.isTranslated && drama.translatedUrl && !drama.isDomestic;

    return (
        <Modal title="作品详情" icon="play" onClose={onClose} wide>
            <div className="detail">
                <div className="detail-main">
                    <LazyImage src={drama.thumbnail} alt={drama.title} fallbackTitle={drama.title} className="detail-thumb" />
                    <div className="detail-info">
                        <div className="detail-title-row">
                            <h3>{drama.title}</h3>
                            <StatusBadge status={status} size="lg" />
                        </div>
                        <dl className="detail-meta">
                            <div className="meta-row">
                                <dt>作者</dt>
                                <dd><MetaLink name={drama.author} type="artist" onToggleFilter={onToggleFilter} /></dd>
                            </div>
                            <div className="meta-row">
                                <dt>译者</dt>
                                <dd>
                                    {translators.length > 0
                                        ? translators.map((t, i) => (
                                            <span key={t}>
                                                {i > 0 && "、"}
                                                <MetaLink name={t} type="translator" onToggleFilter={onToggleFilter} />
                                            </span>
                                        ))
                                        : "无"}
                                </dd>
                            </div>
                            <div className="meta-row">
                                <dt>收录日期</dt>
                                <dd>{drama.dateAdded}</dd>
                            </div>
                            <div className="meta-row">
                                <dt>编号</dt>
                                <dd>#{drama.id}</dd>
                            </div>
                        </dl>
                        {drama.description && <p className="detail-desc">{drama.description}</p>}
                        <div className="detail-tags">
                            {drama.tags.map((tag) => (
                                <button key={tag} className="tag-pill" onClick={() => { onToggleFilter("tag", tag); onClose(); }}>
                                    #{tag}
                                </button>
                            ))}
                        </div>
                        <div className="detail-actions">
                            <button className={`pill-btn ${isFavorite(drama.id) ? "pill-btn-fav" : ""}`} onClick={() => onToggleFavorite(drama.id)}>
                                <Icon name="heart" size={15} filled={isFavorite(drama.id)} />
                                {isFavorite(drama.id) ? "取消收藏" : "添加收藏"}
                            </button>
                            {hasTranslatedLink && (
                                <a className="pill-btn pill-btn-primary" href={drama.translatedUrl} target="_blank" rel="noopener noreferrer">
                                    <Icon name="play" size={15} />
                                    观看汉化版
                                </a>
                            )}
                            <a className="pill-btn pill-btn-ghost" href={drama.originalUrl} target="_blank" rel="noopener noreferrer">
                                <Icon name="external" size={15} />
                                查看原版
                            </a>
                        </div>
                    </div>
                </div>

                <div className="detail-related">
                    <h4>相关推荐</h4>
                    {related.length === 0 ? (
                        <p className="side-empty">暂无相关推荐</p>
                    ) : (
                        <div className="related-grid">
                            {related.map((r) => (
                                <button key={r.id} className="related-item" onClick={() => onOpenDetail(r)}>
                                    <LazyImage src={r.thumbnail} alt={r.title} fallbackTitle={r.title} className="related-thumb" />
                                    <div className="related-info">
                                        <span className="related-title">{r.title}</span>
                                        <span className="related-author">{r.author}</span>
                                        <span className="related-bottom">
                                            <StatusBadge status={getDramaStatus(r)} />
                                            {isFavorite(r.id) && <Icon name="heart" size={12} filled className="related-fav" />}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
