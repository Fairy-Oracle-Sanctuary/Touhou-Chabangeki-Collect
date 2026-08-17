import { Modal, StatusBadge } from "./ui.jsx";
import { getStats, getTranslators } from "../utils.js";
import { authorLinks } from "../data.js";

const TYPE_NAME = { artist: "作者", translator: "译者" };

// mode: "detail" 查看单人作品列表 | "browse" 浏览全部
export default function PersonModal({ mode, type, name, dramas, onClose, onOpenDetail, onToggleFilter }) {
    const { sortedAuthors, sortedTranslators } = getStats(dramas);

    if (mode === "browse") {
        const items = type === "artist" ? sortedAuthors : sortedTranslators;
        return (
            <Modal title={`${TYPE_NAME[type]}浏览`} icon="menu" onClose={onClose} wide>
                <div className="person-grid">
                    {items.map((item) => (
                        <div key={item.name} className="person-card">
                            <div className="person-head">
                                <div>
                                    {authorLinks[item.name] ? (
                                        <a className="person-name" href={authorLinks[item.name]} target="_blank" rel="noopener noreferrer">{item.name}</a>
                                    ) : (
                                        <span className="person-name">{item.name}</span>
                                    )}
                                    <p className="person-count">共 {item.count} 个作品</p>
                                </div>
                            </div>
                            <div className="person-tags">
                                {item.topTags.length > 0
                                    ? item.topTags.map((tag) => <span key={tag} className="tag-pill">#{tag}</span>)
                                    : <span className="side-empty">暂无标签</span>}
                            </div>
                            <button className="btn-primary person-filter" onClick={() => { onToggleFilter(type, item.name); onClose(); }}>
                                筛选此{TYPE_NAME[type]}的作品
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>
        );
    }

    // detail 模式
    const works = dramas.filter((d) =>
        type === "artist" ? d.author === name : getTranslators(d).includes(name)
    );
    const link = authorLinks[name];
    return (
        <Modal
            title={link ? "" : name}
            icon="info"
            onClose={onClose}
            footer={
                <>
                    <button className="btn-primary" onClick={() => { onToggleFilter(type, name); onClose(); }}>
                        筛选此{TYPE_NAME[type]}的作品
                    </button>
                    <button className="btn-ghost" onClick={onClose}>关闭</button>
                </>
            }
        >
            <div className="person-detail-head">
                <h3>{link ? <a href={link} target="_blank" rel="noopener noreferrer">{name}</a> : name}</h3>
                <p>{TYPE_NAME[type]} · 共 {works.length} 个作品</p>
            </div>
            <div className="works-list">
                {works.map((d) => (
                    <button key={d.id} className="work-row" onClick={() => { onClose(); onOpenDetail(d); }}>
                        <div className="work-row-top">
                            <span className="work-title">{d.title}</span>
                            <StatusBadge status={d.isDomestic ? { text: "国产", kind: "domestic" } : d.isTranslated ? { text: "已汉化", kind: "translated" } : { text: "未汉化", kind: "untranslated" }} />
                        </div>
                        <div className="work-row-meta">
                            <span>{type === "artist" ? `译者: ${getTranslators(d).join("、") || "无"}` : `作者: ${d.author}`}</span>
                            <span>·</span>
                            <span>{d.dateAdded}</span>
                        </div>
                        <div className="work-row-tags">
                            {d.tags.slice(0, 5).map((tag) => <span key={tag} className="tag-pill">#{tag}</span>)}
                            {d.tags.length > 5 && <span className="tag-more">+{d.tags.length - 5}</span>}
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
}
