import { useState, useMemo } from 'react';
import { useUsageData } from '../hooks/useUsageData';
import { getCategoryForDomain, CATEGORY_COLORS } from '../categories';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Activity, Clock, Chrome, Calendar, Zap, Smartphone } from 'lucide-react';
import { ActivityCalendar } from '../components/ActivityCalendar';
import { useCategories } from '../hooks/useCategories';

type TimeRange = 'today' | '7d' | '30d';

function getTodayString() {
    const todayObj = new Date();
    const year = todayObj.getFullYear();
    const month = String(todayObj.getMonth() + 1).padStart(2, '0');
    const day = String(todayObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function Dashboard() {
    const { data, loading } = useUsageData();
    const { customCategories, loadingCategories, setCategory } = useCategories();
    const [timeRange, setTimeRange] = useState<TimeRange>('today');

    const filteredData = useMemo(() => {
        if (!data.length) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = getTodayString();

        return data.filter(dayObj => {
            if (timeRange === 'today') return dayObj.date === todayStr;

            const dayParts = dayObj.date.split('-');
            const dayDate = new Date(parseInt(dayParts[0]), parseInt(dayParts[1]) - 1, parseInt(dayParts[2]));
            const diffTime = today.getTime() - dayDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (timeRange === '7d') return diffDays <= 7;
            if (timeRange === '30d') return diffDays <= 30;
            return true;
        });
    }, [data, timeRange]);

    const { categoryTotals, domainTotals, domainVisits, totalSeconds, sessionsTotal, hourlyTotals } = useMemo(() => {
        let total = 0;
        let sessions = 0;
        const cTotals: Record<string, number> = { 'Work': 0, 'Leisure': 0, 'Social': 0, 'Learning': 0, 'Other': 0 };
        const dTotals: Record<string, number> = {};
        const dVisits: Record<string, number> = {};
        const hTotals: Record<number, number> = {};

        filteredData.forEach(day => {
            sessions += day.sessions || 0;
            if (day.hourly) {
                for (const [hourStr, tSpent] of Object.entries(day.hourly)) {
                    const hour = parseInt(hourStr);
                    hTotals[hour] = (hTotals[hour] || 0) + (tSpent as number);
                }
            }
            day.stats.forEach(stat => {
                total += stat.timeSpent;
                const cat = getCategoryForDomain(stat.domain, customCategories);
                cTotals[cat] = (cTotals[cat] || 0) + stat.timeSpent;
                dTotals[stat.domain] = (dTotals[stat.domain] || 0) + stat.timeSpent;
                dVisits[stat.domain] = (dVisits[stat.domain] || 0) + (stat.visits || 0);
            });
        });

        return { categoryTotals: cTotals, domainTotals: dTotals, domainVisits: dVisits, totalSeconds: total, sessionsTotal: sessions, hourlyTotals: hTotals };
    }, [filteredData, customCategories]);

    const pieData = Object.entries(categoryTotals)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const barData = Object.entries(domainTotals)
        .map(([domain, timeSpent]) => ({ domain, timeSpent, visits: domainVisits[domain] || 0, category: getCategoryForDomain(domain, customCategories) }))
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .slice(0, 10); // Top 10

    const topVisits = Object.entries(domainVisits)
        .map(([domain, visits]) => ({ domain, visits, category: getCategoryForDomain(domain, customCategories), avgTime: domainTotals[domain] / visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 7); // Top 7 zapping

    const heatmapData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        activeTime: hourlyTotals[i] || 0
    }));

    if (loading || loadingCategories) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121212] text-slate-100 p-8 font-sans w-full">
            <div className="max-w-7xl mx-auto w-full">
                <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icon128.png"
                            alt="Digital Wellbeing Logo"
                            className="w-14 h-14 rounded-2xl shadow-lg shadow-emerald-500/20"
                        />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Digital Wellbeing</h1>
                            <p className="text-zinc-400">Take control of your online time</p>
                        </div>
                    </div>

                    <div className="flex bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700/50 backdrop-blur-sm">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: '7d', label: 'Last 7 days' },
                            { id: '30d', label: 'Last 30 days' }
                        ].map((range) => (
                            <button
                                key={range.id}
                                onClick={() => setTimeRange(range.id as TimeRange)}
                                className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 ${timeRange === range.id
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                                    }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </header>

                {totalSeconds === 0 ? (
                    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                        <Calendar className="w-16 h-16 text-zinc-600 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No data available</h2>
                        <p className="text-zinc-400">Browse some web pages to start collecting stats for this period.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                            <div className="flex flex-col gap-6">
                                {/* Summary Card 1 */}
                                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden flex-1">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                                        <Clock className="w-5 h-5" />
                                        <span className="font-medium">Total Time</span>
                                    </div>
                                    <div className="text-4xl font-light mb-1">
                                        {formatTime(totalSeconds)}
                                    </div>
                                    <p className="text-sm text-zinc-500">across {barData.length} different websites</p>
                                </div>
                                {/* Summary Card 2: Sessions */}
                                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden flex-1">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                                        <Smartphone className="w-5 h-5" />
                                        <span className="font-medium">Sessions</span>
                                    </div>
                                    <div className="text-4xl font-light mb-1">
                                        {sessionsTotal} <span className="text-lg text-zinc-500 font-normal">times</span>
                                    </div>
                                    <p className="text-sm text-zinc-500">browser unlocks</p>
                                </div>
                            </div>

                            {/* Pie Chart Card */}
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 lg:col-span-3 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-full md:w-1/2 h-48">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any) => formatTime(value)}
                                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#f8fafc' }}
                                                itemStyle={{ color: '#e2e8f0' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full md:w-1/2 flex flex-col gap-3">
                                    {[...pieData].sort((a, b) => b.value - a.value).map((entry) => (
                                        <div key={entry.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[entry.name] }}></div>
                                                <span className="font-medium">{entry.name}</span>
                                            </div>
                                            <span className="text-zinc-400">{formatTime(entry.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Bar Chart */}
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                    <Chrome className="w-5 h-5 text-zinc-400" />
                                    Most Visited Sites
                                </h3>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="domain"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                                width={100}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#27272a' }}
                                                formatter={(value: any) => formatTime(value)}
                                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            />
                                            <Bar dataKey="timeSpent" radius={[0, 4, 4, 0]} barSize={20}>
                                                {barData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other']} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 overflow-hidden flex flex-col">
                                <h3 className="text-lg font-semibold mb-6">Detailed Breakdown</h3>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {barData.map((site, index) => (
                                        <div key={site.domain} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-zinc-800/50">
                                            <div className="flex items-center gap-3 truncate">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                    {index + 1}
                                                </div>
                                                <div className="truncate">
                                                    <p className="font-medium truncate" title={site.domain}>{site.domain}</p>
                                                    <p className="text-xs flex items-center gap-1.5 mt-0.5">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[site.category] || CATEGORY_COLORS['Otros'] }}></span>
                                                        <select
                                                            value={site.category}
                                                            onChange={(e) => setCategory(site.domain, e.target.value)}
                                                            className="bg-transparent border-none text-zinc-400 text-xs focus:ring-0 cursor-pointer p-0 m-0 outline-none hover:text-white transition-colors"
                                                            title={`Change category for ${site.domain}`}
                                                        >
                                                            {Object.keys(CATEGORY_COLORS).map(cat => (
                                                                <option key={cat} value={cat} className="bg-zinc-800 text-slate-200">
                                                                    {cat}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right whitespace-nowrap pl-4 flex flex-col items-end">
                                                <span className="font-medium">{formatTime(site.timeSpent)}</span>
                                                <span className="text-xs text-zinc-500">{site.visits} visits</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Zapping List */}
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 overflow-hidden flex flex-col">
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    Distraction Spikes
                                </h3>
                                <p className="text-sm text-zinc-400 mb-6 font-medium">Sites you check compulsively (zapping).</p>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {topVisits.map((site) => (
                                        <div key={`zapping-${site.domain}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                                            <div className="truncate flex-1">
                                                <p className="font-medium truncate text-sm" title={site.domain}>{site.domain}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-zinc-300 font-semibold">{site.visits} opens</span>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md ml-2 whitespace-nowrap">
                                                ~{Math.round(site.avgTime)}s / visita
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Heatmap Chart */}
                        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mt-6">
                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-400" />
                                Activity by Hour
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <AreaChart data={heatmapData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <XAxis dataKey="hour" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip
                                            formatter={(value: any) => [formatTime(value), 'Tiempo Activo']}
                                            labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                        />
                                        <defs>
                                            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="activeTime" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Activity History (Github) */}
                        <ActivityCalendar data={data} customCategories={customCategories} />
                    </>
                )}
            </div>
        </div>
    );
}
