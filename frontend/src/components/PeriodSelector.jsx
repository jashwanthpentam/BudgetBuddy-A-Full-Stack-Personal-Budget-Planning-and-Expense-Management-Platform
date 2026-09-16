import { useState } from "react";
import "./PeriodSelector.css";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function PeriodSelector({
    month,
    year,
    setMonth,
    setYear,
    periodType,
    setPeriodType,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    label = "Viewing",
}) {
    const [draftYear, setDraftYear] = useState(String(year));

    const commitYear = () => {
        const value = Number(draftYear);

        if (Number.isInteger(value) && value >= 2000 && value <= 2100) {
            setYear(value);
            setDraftYear(String(value));
        } else {
            setDraftYear(String(year));
        }
    };

    const handlePeriodChange = (event) => {
        setPeriodType(event.target.value);
    };

    return (
        <div className="period-selector">
            <span className="period-selector-label">{label}</span>

            <div className="period-selector-controls">
                <label>
                    <span>Period</span>
                    <select
                        aria-label="Select period type"
                        value={periodType}
                        onChange={handlePeriodChange}
                    >
                        <option value="month">Month &amp; Year</option>
                        <option value="custom">Custom Period</option>
                        <option value="lifetime">Lifetime</option>
                    </select>
                </label>

                {periodType === "month" && (
                    <>
                        <label>
                            <span>Month</span>
                            <select
                                aria-label="Select month"
                                value={month}
                                onChange={(event) =>
                                    setMonth(Number(event.target.value))
                                }
                            >
                                {MONTHS.map((name, index) => (
                                    <option key={name} value={index + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Year</span>
                            <input
                                aria-label="Select year"
                                type="number"
                                min="2000"
                                max="2100"
                                value={draftYear}
                                onChange={(event) =>
                                    setDraftYear(event.target.value)
                                }
                                onBlur={commitYear}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.currentTarget.blur();
                                    }
                                }}
                            />
                        </label>
                    </>
                )}

                {periodType === "custom" && (
                    <>
                        <label>
                            <span>Start Date</span>
                            <input
                                aria-label="Custom start date"
                                type="date"
                                value={customStart}
                                onChange={(event) =>
                                    setCustomStart(event.target.value)
                                }
                            />
                        </label>

                        <label>
                            <span>End Date</span>
                            <input
                                aria-label="Custom end date"
                                type="date"
                                min={customStart || undefined}
                                value={customEnd}
                                onChange={(event) =>
                                    setCustomEnd(event.target.value)
                                }
                            />
                        </label>
                    </>
                )}
            </div>
        </div>
    );
}