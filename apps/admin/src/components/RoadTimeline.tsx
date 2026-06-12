/**
 * Case history drawn as a road: asphalt strip, dashed centerline, a pin per
 * status stop. The newest stop pulses amber — "you are here".
 */
export interface RoadStop {
  message: string;
  at: string;
  actorRole?: string | null;
  isSystem?: boolean;
  isOverride?: boolean;
  notes?: string | null;
}

export function RoadTimeline({ stops }: { stops: RoadStop[] }) {
  if (stops.length === 0) return <p className="muted">No history yet.</p>;
  return (
    <div className="road">
      {stops.map((s, i) => {
        const isNow = i === stops.length - 1;
        return (
          <div className="road__stop" key={i}>
            <span
              className={`road__pin${isNow ? ' road__pin--now' : s.isSystem ? ' road__pin--system' : ''}`}
            />
            <div className="road__msg">
              {s.message}
              {s.isOverride && <span style={{ color: 'var(--red)' }}> · OVERRIDE</span>}
            </div>
            <div className="road__meta">
              {new Date(s.at).toLocaleString()}
              {s.actorRole ? ` · ${s.actorRole.replaceAll('_', ' ').toLowerCase()}` : s.isSystem ? ' · system' : ''}
              {s.notes ? ` — ${s.notes}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
