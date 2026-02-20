import { useState, useMemo } from 'react';
import type { DayUsage } from '../hooks/useUsageData';
import { getCategoryForDomain, CATEGORY_COLORS } from '../categories';
import { Calendar as CalendarIcon } from 'lucide-react';

interface ActivityCalendarProps {
    data: DayUsage[];
    customCategories?: Record<string, string>;
}

function hexToRgba(hex: string, alpha: number) {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
        return hex;
    }
}

function formatTime(seconds: number) {
    if (seconds === 0) return '0s';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function getAlphaForTime(seconds: number) {
    if (seconds === 0) return 0;
    if (seconds < 3600) return 0.35; // < 1h
    if (seconds < 10800) return 0.55; // 1h - 3h
    if (seconds < 21600) return 0.8; // 3h - 6h
    return 1; // > 6h
}

export function ActivityCalendar({ data, customCategories }: ActivityCalendarProps) {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; subtext: string; color: string } | null>(null);

    const WEEKS_TO_SHOW = 26; // Approx 6 months

    const heatmapBoxes = useMemo(() => {
        const today = new Date();
        const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const totalDays = (WEEKS_TO_SHOW - 1) * 7 + (currentDate.getDay() + 1);

        const daysArray = [];
        for (let i = totalDays - 1; i >= 0; i--) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - i);
            daysArray.push(d);
        }

        const dataMap = new Map<string, DayUsage>();
        data.forEach(d => dataMap.set(d.date, d));

        return daysArray.map(dateObj => {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const dayData = dataMap.get(dateStr);

            let totalTime = 0;
            let maxTime = 0;
            let dominantCategory = 'Other';

            if (dayData && dayData.stats) {
                const catTimes: Record<string, number> = {};
                dayData.stats.forEach(stat => {
                    totalTime += stat.timeSpent;
                    const cat = getCategoryForDomain(stat.domain, customCategories);
                    catTimes[cat] = (catTimes[cat] || 0) + stat.timeSpent;
                });

                for (const [cat, time] of Object.entries(catTimes)) {
                    if (time > maxTime) {
                        maxTime = time;
                        dominantCategory = cat;
                    }
                }
            }

            return {
                dateStr,
                dateObj,
                totalTime,
                dominantCategory
            };
        });
    }, [data, customCategories]);

    const monthLabels = useMemo(() => {
        const labels: { label: string; colIndex: number }[] = [];
        const numCols = Math.ceil(heatmapBoxes.length / 7);

        for (let c = 0; c < numCols; c++) {
            const colDays = heatmapBoxes.slice(c * 7, (c + 1) * 7);
            const firstDayOfMonth = colDays.find(d => d.dateObj.getDate() === 1);

            if (c === 0) {
                let nextMonthCol = -1;
                for (let j = 1; j < numCols; j++) {
                    if (heatmapBoxes.slice(j * 7, (j + 1) * 7).some(d => d.dateObj.getDate() === 1)) {
                        nextMonthCol = j;
                        break;
                    }
                }

                if (nextMonthCol === -1 || nextMonthCol >= 3) {
                    labels.push({
                        label: colDays[0].dateObj.toLocaleDateString('en-US', { month: 'short' }),
                        colIndex: c
                    });
                }
            } else if (firstDayOfMonth) {
                const lastCol = labels.length > 0 ? labels[labels.length - 1].colIndex : -3;
                if (c - lastCol >= 2) {
                    labels.push({
                        label: firstDayOfMonth.dateObj.toLocaleDateString('en-US', { month: 'short' }),
                        colIndex: c
                    });
                }
            }
        }
        return labels;
    }, [heatmapBoxes]);

    return (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mt-6 relative overflow-visible">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 relative z-10">
                <CalendarIcon className="w-5 h-5 text-purple-400" />
                Contribution History (Last 6 months)
            </h3>

            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar relative">
                {/* Y-Axis Labels */}
                <div className="flex flex-col gap-1.5 pt-6 text-xs text-zinc-500 font-medium justify-between h-[116px] mt-5">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                </div>

                {/* Grid */}
                <div className="flex-1">
                    {/* Month labels */}
                    <div className="relative text-xs text-zinc-500 font-medium mb-1 h-4">
                        {monthLabels.map((m, idx) => (
                            <span
                                key={idx}
                                className="absolute"
                                style={{ left: `${m.colIndex * 20}px` }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    {/* Heatmap Grid */}
                    <div
                        className="grid gap-1.5"
                        style={{
                            gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
                            gridAutoFlow: 'column',
                            height: '116px' // 7 * 12px + 6 * 6px approx
                        }}
                    >
                        {heatmapBoxes.map((box) => {
                            const alpha = getAlphaForTime(box.totalTime);
                            const hexColor = CATEGORY_COLORS[box.dominantCategory] || CATEGORY_COLORS['Other'];
                            const bgColor = box.totalTime > 0 ? hexToRgba(hexColor, alpha) : '#27272a'; // zinc-800
                            const outlineColor = box.totalTime > 0 ? hexToRgba(hexColor, Math.max(0.4, alpha)) : 'transparent';

                            return (
                                <div
                                    key={box.dateStr}
                                    className="w-3.5 h-3.5 rounded-sm cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-[#18181b] transition-all duration-200"
                                    style={{
                                        backgroundColor: bgColor,
                                        border: box.totalTime > 0 ? `1px solid ${outlineColor}` : '1px solid #3f3f46' // zinc-700
                                    }}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltip({
                                            x: rect.x + rect.width / 2,
                                            y: rect.y - 8,
                                            text: box.dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
                                            subtext: box.totalTime > 0 ? `${formatTime(box.totalTime)} (${box.dominantCategory})` : 'No logged data',
                                            color: box.totalTime > 0 ? hexColor : '#a1a1aa'
                                        });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Custom Tooltip using React Portal or absolute positioning.
                Since Dashboard is full width and might scroll, absolute to fixed window viewport is trickier,
                but we'll use fixed positioning for simplicity relative to the screen. 
            */}
            {tooltip && (
                <div
                    className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    <div className="bg-[#18181b] border border-[#27272a] shadow-xl rounded-lg px-3 py-2 text-sm text-center min-w-[140px]">
                        <p className="text-zinc-300 font-medium mb-0.5 capitalize">{tooltip.text}</p>
                        <p className="font-semibold" style={{ color: tooltip.color }}>
                            {tooltip.subtext}
                        </p>
                    </div>
                    {/* Arrow */}
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#27272a]"></div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-zinc-400">
                <span>Less activity</span>
                <div className="flex gap-1.5 ml-1 mr-1">
                    <div className="w-3 h-3 rounded-sm bg-zinc-800 border border-zinc-700"></div>
                    <div className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/40"></div>
                    <div className="w-3 h-3 rounded-sm bg-blue-500/55 border border-blue-500/60"></div>
                    <div className="w-3 h-3 rounded-sm bg-blue-500/80 border border-blue-500/90"></div>
                    <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-500"></div>
                </div>
                <span>More activity</span>
            </div>
        </div>
    );
}
