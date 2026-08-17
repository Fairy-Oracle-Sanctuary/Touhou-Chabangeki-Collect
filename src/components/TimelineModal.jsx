import { useMemo, useState } from "react";
import { Modal, LazyImage } from "./ui.jsx";
import { getDramaStatus, groupByPeriod } from "../utils.js";

export default function TimelineModal({ dramas, onClose, onOpenDetail }) {
    const grouped = useMemo(() => groupByPeriod(dramas), [dramas]);
    const periods = Object.keys(grouped);

    const years = useMemo(() => {
        const set = new Set(dramas.map((d) => new Date(d.dateAdded).getFullYear()));
        return [...set].sort((a, b) => b - a);
    }, [dramas]);

    const [year, setYear] = useState("");
    const [month, setMonth] = useState("");

    const months = useMemo(() => {
        if (!year) return [];
        const set = new Set(
            dramas.filter((d) => new Date(d.dateAdded).getFullYear() === Number(year))
                .map((d) => String(new Date(d.dateAdded).getMonth() + 1).padStart(2, "0"))
        );
        return [...set].sort();
    }, [dramas, year]);

    const jump = () => {
        if (!year) return;
        const target = month ? `period-${year}年${month}月` : `period-${year}年`;
        const el = document.getElementById(target);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <Modal title="作品发布时间轴" icon="clock" onClose={onClose} wide>
            <div className="timeline-jump">
                <select value={year} onChange={(e) => { setYear(e.target.value); setMonth(""); }}>
                    <option value="">选择年份</option>
                    {years.map((y) => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={!year}>
                    <option value="">选择月份</option>
                    {months.map((m) => <option key={m} value={m}>{Number(m)}月</option>)}
                </select>
                <button className="btn-primary" onClick={jump} disabled={!year}>跳转</button>
            </div>
            <div className="timeline">
                {periods.map((period) => (
                    <div key={period} className="timeline-group">
                        <div className="timeline-rail" />
                        <div className="timeline-dot">{grouped[period].length}</div>
                        <div className="timeline-content">
                            <h3 id={`period-${period}`}>{period}</h3>
                            <div className="timeline-items">
                                {grouped[period].map((drama) => (
                                    <button key={drama.id} className="timeline-item" onClick={() => { onClose(); onOpenDetail(drama); }}>
                                        <LazyImage src={drama.thumbnail} alt={drama.title} fallbackTitle={drama.title} className="timeline-thumb" />
                                        <div>
                                            <span className="timeline-title">{drama.title}</span>
                                            <span className="timeline-meta">{drama.author} · {getDramaStatus(drama).text}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
