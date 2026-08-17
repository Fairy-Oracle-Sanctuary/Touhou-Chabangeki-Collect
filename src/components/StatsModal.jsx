import { useMemo, useState } from "react";
import {
    Chart as ChartJS,
    ArcElement,
    LineElement,
    PointElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import { Modal } from "./ui.jsx";
import { getMonthlyData, getStats } from "../utils.js";

ChartJS.register(ArcElement, LineElement, PointElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

export default function StatsModal({ dramas, theme, onClose }) {
    const [showAllMonths, setShowAllMonths] = useState(false);
    const dark = theme === "dark";
    const textColor = dark ? "#a1a1aa" : "#52525b";
    const gridColor = dark ? "#2a2a33" : "#e4e4e7";
    const baseScales = {
        x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true },
        y: { ticks: { color: textColor }, grid: { display: false } },
    };

    const { translated, untranslated, domestic, percent } = useMemo(() => {
        const t = dramas.filter((d) => d.isTranslated && !d.isDomestic).length;
        const u = dramas.filter((d) => !d.isTranslated && !d.isDomestic).length;
        const dom = dramas.filter((d) => d.isDomestic).length;
        const foreign = t + u;
        return { translated: t, untranslated: u, domestic: dom, percent: foreign ? Math.round((t / foreign) * 100) : 0 };
    }, [dramas]);

    const monthly = useMemo(() => getMonthlyData(dramas, showAllMonths), [dramas, showAllMonths]);
    const { sortedAuthors, sortedTranslators } = useMemo(() => getStats(dramas), [dramas]);
    const authors = { labels: sortedAuthors.slice(0, 8).map((a) => a.name), data: sortedAuthors.slice(0, 8).map((a) => a.count) };
    const translators = { labels: sortedTranslators.slice(0, 8).map((t) => t.name), data: sortedTranslators.slice(0, 8).map((t) => t.count) };

    return (
        <Modal title="统计图表" icon="chart" onClose={onClose} wide>
            <div className="charts">
                <div className="chart-card chart-doughnut">
                    <h3>汉化进度 <span className="chart-percent">{percent}%</span></h3>
                    <div className="chart-canvas">
                        <Doughnut
                            data={{
                                labels: ["已汉化", "未汉化", "国产"],
                                datasets: [{
                                    data: [translated, untranslated, domestic],
                                    backgroundColor: ["#16a34a", "#d97706", "#2563eb"],
                                    borderColor: dark ? "#1b1b22" : "#ffffff",
                                    borderWidth: 2,
                                }],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: "bottom", labels: { color: textColor } } },
                            }}
                        />
                    </div>
                </div>

                <div className="chart-card">
                    <h3>
                        月度发布趋势
                        <button className="side-expand" onClick={() => setShowAllMonths((v) => !v)}>
                            {showAllMonths ? "近 6 个月" : "完整趋势"}
                        </button>
                    </h3>
                    <div className="chart-canvas">
                        <Line
                            data={{
                                labels: monthly.labels,
                                datasets: [{
                                    label: "发布作品",
                                    data: monthly.data,
                                    borderColor: "#e60012",
                                    backgroundColor: "rgba(230,0,18,0.08)",
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: "#e60012",
                                }],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { ticks: { color: textColor }, grid: { color: gridColor } },
                                    y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true },
                                },
                            }}
                        />
                    </div>
                </div>

                <div className="chart-card">
                    <h3>高产作者 Top 8</h3>
                    <div className="chart-canvas">
                        <Bar
                            data={{
                                labels: authors.labels,
                                datasets: [{ label: "作品数量", data: authors.data, backgroundColor: "#2563eb", borderRadius: 4 }],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: "y",
                                plugins: { legend: { display: false } },
                                scales: baseScales,
                            }}
                        />
                    </div>
                </div>

                <div className="chart-card">
                    <h3>汉化组 Top 8</h3>
                    <div className="chart-canvas">
                        <Bar
                            data={{
                                labels: translators.labels,
                                datasets: [{ label: "汉化作品数量", data: translators.data, backgroundColor: "#8b5cf6", borderRadius: 4 }],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: "y",
                                plugins: { legend: { display: false } },
                                scales: baseScales,
                            }}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
