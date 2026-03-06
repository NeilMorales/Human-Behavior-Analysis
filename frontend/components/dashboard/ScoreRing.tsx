'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ScoreRingProps {
    score: number;
    level: string;
    color: string;
}

export function ScoreRing({ score, level, color }: ScoreRingProps) {
    const data = [
        { name: 'Score', value: score },
        { name: 'Remaining', value: 100 - score },
    ];

    return (
        <div className="flex flex-col items-center justify-center p-6 relative">
            <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10}
                        >
                            <Cell fill={color} />
                            <Cell fill="#30363D" /> {/* border color in tailwind */}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-white font-[family-name:var(--font-fira-code)]">
                    {score}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color }}>
                    {level}
                </span>
            </div>
        </div>
    );
}
