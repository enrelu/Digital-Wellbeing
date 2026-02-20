import { useUsageData } from '../hooks/useUsageData';
import { getCategoryForDomain, CATEGORY_COLORS } from '../categories';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function Popup() {
    const { data, loading } = useUsageData();

    const todayObj = new Date();
    const year = todayObj.getFullYear();
    const month = String(todayObj.getMonth() + 1).padStart(2, '0');
    const day = String(todayObj.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`;

    const todayData = data.find(d => d.date === todayDateString);

    let totalSeconds = 0;
    const categoryTotals: Record<string, number> = {
        'Work': 0,
        'Leisure': 0,
        'Social': 0,
        'Learning': 0,
        'Other': 0
    };

    if (todayData) {
        todayData.stats.forEach(stat => {
            totalSeconds += stat.timeSpent;
            const cat = getCategoryForDomain(stat.domain);
            categoryTotals[cat] += stat.timeSpent;
        });
    }

    const chartData = Object.entries(categoryTotals)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return (
        <div className="w-[350px] min-h-[400px] p-6 bg-zinc-900 text-slate-100 flex flex-col font-sans">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-6">
                Digital Wellbeing
            </h1>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
            ) : (
                <>
                    <div className="text-center mb-6">
                        <p className="text-sm text-zinc-400 uppercase tracking-widest font-semibold">Today</p>
                        <div className="text-4xl font-light mt-1 flex justify-center items-baseline gap-1">
                            {hours > 0 && <span>{hours}<span className="text-lg text-zinc-500 font-normal">h</span></span>}
                            {(minutes > 0 || hours > 0) && <span>{minutes}<span className="text-lg text-zinc-500 font-normal">m</span></span>}
                            {(hours === 0 && minutes === 0) && <span>{seconds}<span className="text-lg text-zinc-500 font-normal">s</span></span>}
                        </div>
                    </div>

                    <div className="h-40 w-full mb-6">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Other']} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                                No data for today yet.
                            </div>
                        )}
                    </div>

                    <div className="mt-auto">
                        <button
                            onClick={() => {
                                chrome.tabs.create({ url: chrome.runtime.getURL('index.html#/dashboard') });
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Open my Dashboard
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
