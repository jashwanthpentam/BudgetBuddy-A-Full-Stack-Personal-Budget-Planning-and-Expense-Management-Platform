import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

function IncomeExpenseBarChart({ totalIncome, totalExpense }) {
const chartData = [
        {
            name: "Income",
            amount: Number(totalIncome) || 0,
            fill: "#22c55e",
        },
        {
            name: "Expenses",
            amount: Number(totalExpense) || 0,
            fill: "#ef4444",
        },
    ];

    return (
        <div className="chart-card">

            <div className="chart-card-header">
                <h2>Income vs Expenses</h2>
                <p>Current selected month summary</p>
            </div>

            <ResponsiveContainer width="100%" height={290}>
                <BarChart data={chartData}>
                    <CartesianGrid
                        stroke="rgba(148,163,184,0.18)"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#cbd5e1", fontSize: 13 }}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />

                    <Tooltip
                        cursor={{ fill: "rgba(148,163,184,0.08)" }}
                        formatter={(value) => [`Rs. ${value}`, "Amount"]}
                    />

                    <Bar
                        dataKey="amount"
                        radius={[12, 12, 4, 4]}
                        barSize={58}
                    >
                        {
                            chartData.map((entry) => (
                                <Cell
                                    key={entry.name}
                                    fill={entry.fill}
                                />
                            ))
                        }
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

        </div>
    );
}

export default IncomeExpenseBarChart;
