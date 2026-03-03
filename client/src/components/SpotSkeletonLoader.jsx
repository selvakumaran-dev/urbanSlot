const SpotSkeletonLoader = ({ count = 6 }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {/* Image placeholder */}
                <div className="skeleton" style={{ aspectRatio: '16/9', width: '100%' }} />
                {/* Body */}
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 11, width: '55%', borderRadius: 6 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="skeleton" style={{ height: 11, width: 70, borderRadius: 6 }} />
                        <div className="skeleton" style={{ height: 11, width: 50, borderRadius: 6 }} />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default SpotSkeletonLoader;
