import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

const COLORS = [
    "#22c55e",
    "#06b6d4",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#f97316",
    "#38bdf8",
];

function ExpensePieChart({ transactions }) {
    const expenseData = transactions
        .filter((transaction) =>
            String(transaction.type).toLowerCase() === "expense"
        )
        .reduce((categories, transaction) => {
            const amount = Number(transaction.amount);

            if (!transaction.category || Number.isNaN(amount)) {
                return categories;
            }

            const existingCategory = categories.find(
                (category) => category.name === transaction.category
            );

            if (existingCategory) {
                existingCategory.value += amount;
            } else {
                categories.push({
                    name: transaction.category,
                    value: amount,
                });
            }

            return categories;
        }, []);

    return (
        <div className="chart-card">

            <div className="chart-card-header">
                <h2>Expense Breakdown</h2>
                <p>By category from recent dashboard transactions</p>
            </div>

            {
                expenseData.length === 0 ? (
                    <div className="chart-empty">
                        No expense category data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={290}>
                        <PieChart>
                            <Pie
                                data={expenseData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={62}
                                outerRadius={105}
                                paddingAngle={4}
                            >
                                {
                                    expenseData.map((entry, index) => (
                                        <Cell
                                            key={entry.name}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))
                                }
                            </Pie>

                            <Tooltip
                                formatter={(value) => [`Rs. ${value}`, "Amount"]}
                            />

                            <Legend
                                iconType="circle"
                                wrapperStyle={{
                                    color: "#cbd5e1",
                                    fontSize: "13px",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )
            }

        </div>
    );
}

export default ExpensePieChart;
