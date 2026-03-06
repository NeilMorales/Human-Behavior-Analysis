export function ScoreRing({ score }: { score: number }) {
    const radius = 40;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let color = '#FF4444'; // Red < 50
    let label = 'Low Productivity';
    if (score >= 80) {
        color = '#00FF88'; // Green >= 80
        label = 'Highly Productive';
    } else if (score >= 50) {
        color = '#FFB800'; // Amber 50-79
        label = 'Moderate';
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
            <div style={{ position: 'relative', width: radius * 2, height: radius * 2 }}>
                <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        stroke="#333"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke={color}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-out' }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '24px', fontWeight: 'bold'
                }}>
                    {Math.round(score)}
                </div>
            </div>
            <div style={{ color: color, fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>{label}</div>
        </div>
    );
}
