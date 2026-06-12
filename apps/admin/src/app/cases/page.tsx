'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Shell } from '@/components/Shell';
import { Plate } from '@/components/Plate';
import { StatusBadge } from '@/components/StatusBadge';

interface CaseRow {
  id: string;
  status: string;
  createdAt: string;
  vehicle: { make: string; model: string; year: number; plateEmirate: string; plateCode: string; plateNumber: string };
  garage: { id: string; name: string } | null;
  recoveryAssignments: { driver: { user: { fullName: string; phone: string } } }[];
}

interface DriverRow {
  id: string;
  isAvailable: boolean;
  user: { fullName: string; phone: string };
  provider: { companyName: string; verification: string };
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [driverId, setDriverId] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([
        api<CaseRow[]>('/admin/cases'),
        api<DriverRow[]>('/admin/drivers'),
      ]);
      setCases(c);
      setDrivers(d.filter((x) => x.provider.verification === 'APPROVED'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 10_000); // polling board; WS push lands in M7
    return () => clearInterval(t);
  }, [load]);

  const stats = useMemo(() => {
    const by = (pred: (s: string) => boolean) => cases.filter((c) => pred(c.status)).length;
    return {
      awaiting: by((s) => s === 'AWAITING_RECOVERY_ASSIGNMENT'),
      onRoad: by((s) => s.startsWith('RECOVERY') || s.startsWith('VEHICLE_I')),
      inGarage: by((s) =>
        ['VEHICLE_AT_GARAGE', 'INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED', 'REPAIR_IN_PROGRESS', 'QUALITY_CHECK_IN_PROGRESS'].includes(s),
      ),
      needCustomer: by((s) => ['AWAITING_CUSTOMER_APPROVAL', 'PARTS_SELECTION_REQUIRED'].includes(s)),
    };
  }, [cases]);

  async function assignRecovery(caseId: string) {
    try {
      await api(`/admin/cases/${caseId}/assign-recovery`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });
      setAssigning(null);
      setDriverId('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Shell>
      <div className="pagehead">
        <h1>Live cases</h1>
        <span className="muted mono">{cases.length} open · refreshes every 10s</span>
      </div>

      <div className="statgrid">
        <div className="stat"><b style={{ color: 'var(--amber)' }}>{stats.awaiting}</b><span>awaiting dispatch</span></div>
        <div className="stat"><b>{stats.onRoad}</b><span>on the road</span></div>
        <div className="stat"><b style={{ color: 'var(--blue)' }}>{stats.inGarage}</b><span>in garage</span></div>
        <div className="stat"><b style={{ color: 'var(--bone)' }}>{stats.needCustomer}</b><span>waiting on customer</span></div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="ticket">
        {cases.map((c) => (
          <div className="ticketrow" key={c.id}>
            <span className="ticketrow__stub mono">{c.id.slice(-6).toUpperCase()}</span>
            <div>
              <div style={{ fontWeight: 600 }}>
                {c.vehicle.make} {c.vehicle.model} <span className="muted">{c.vehicle.year}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <Plate emirate={c.vehicle.plateEmirate} code={c.vehicle.plateCode} number={c.vehicle.plateNumber} />
              </div>
            </div>
            <StatusBadge status={c.status} />
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>driver</div>
              {c.recoveryAssignments[0]?.driver.user.fullName ?? <span className="muted">—</span>}
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>garage</div>
              {c.garage?.name ?? <span className="muted">—</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {c.status === 'AWAITING_RECOVERY_ASSIGNMENT' &&
                (assigning === c.id ? (
                  <>
                    <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={{ width: 190 }}>
                      <option value="">Choose driver…</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.fullName} · {d.provider.companyName}{d.isAvailable ? '' : ' (offline)'}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn--sm" disabled={!driverId} onClick={() => assignRecovery(c.id)}>
                      Dispatch
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setAssigning(null)}>×</button>
                  </>
                ) : (
                  <button className="btn btn--sm" onClick={() => setAssigning(c.id)}>Dispatch</button>
                ))}
              <Link href={`/cases/${c.id}`} className="btn btn--ghost btn--sm">Open</Link>
            </div>
          </div>
        ))}
        {cases.length === 0 && (
          <div className="ticketrow" style={{ gridTemplateColumns: '52px 1fr' }}>
            <span className="ticketrow__stub mono">EMPTY</span>
            <span className="muted">No active cases. New requests appear here the moment they are created.</span>
          </div>
        )}
      </div>
    </Shell>
  );
}
