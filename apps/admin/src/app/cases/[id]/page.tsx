'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { STATUS_MESSAGES, type CaseStatus } from '@sanad/shared';
import { api } from '@/lib/api';
import { Shell } from '@/components/Shell';
import { Plate } from '@/components/Plate';
import { StatusBadge } from '@/components/StatusBadge';
import { RoadTimeline } from '@/components/RoadTimeline';

interface CaseDetail {
  id: string;
  status: string;
  type: string;
  description: string | null;
  canMove: boolean;
  isSafeLocation: boolean;
  emergencyFlags: string[];
  pickupAddress: string | null;
  pickupLat: string;
  pickupLng: string;
  createdAt: string;
  vehicle: {
    make: string; model: string; year: number; vin: string | null; color: string | null;
    plateEmirate: string; plateCode: string; plateNumber: string;
  };
  garage: { id: string; name: string; address: string; phone: string } | null;
  recoveryAssignments: {
    status: string;
    driver: { user: { fullName: string; phone: string } };
    recoveryVehicle: { plateNumber: string; truckType: string } | null;
  }[];
  quotations: {
    id: string; version: number; status: string; total: string; currency: string;
    items: {
      id: string; type: string; title: string; quantity: number;
      lineTotal: string; requiresPart: boolean;
      approval: { decision: string } | null;
    }[];
  }[];
  payments: { id: string; kind: string; status: string; total: string; currency: string; createdAt: string }[];
  statusHistory: {
    toStatus: string; actorRole: string | null; isSystem: boolean; isOverride: boolean;
    notes: string | null; createdAt: string;
  }[];
  media: { id: string; kind: string; createdAt: string }[];
}

interface GarageRow { id: string; name: string; emirate: string; verification: string }

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [garages, setGarages] = useState<GarageRow[]>([]);
  const [garageId, setGarageId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([
        api<CaseDetail>(`/admin/cases/${id}`),
        api<GarageRow[]>('/admin/garages?verification=APPROVED'),
      ]);
      setData(c);
      setGarages(g);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assignGarage() {
    try {
      await api(`/admin/cases/${id}/assign-garage`, {
        method: 'POST',
        body: JSON.stringify({ garageId }),
      });
      setGarageId('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!data) {
    return (
      <Shell>
        {error ? <p className="error-text">{error}</p> : <p className="muted">Loading…</p>}
      </Shell>
    );
  }

  const v = data.vehicle;
  const quote = data.quotations[0];

  return (
    <Shell>
      <div className="pagehead">
        <div>
          <Link href="/cases" className="muted" style={{ fontSize: 12 }}>← Live cases</Link>
          <h1 style={{ marginTop: 6 }}>
            {v.make} {v.model} <span className="muted">{v.year}</span>
          </h1>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Plate emirate={v.plateEmirate} code={v.plateCode} number={v.plateNumber} />
            <span className="mono muted">case {data.id}</span>
          </div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {error && <p className="error-text">{error}</p>}

      {data.emergencyFlags.length > 0 && (
        <div className="panel" style={{ borderColor: 'var(--red)', marginBottom: 16 }}>
          <strong style={{ color: 'var(--red)' }}>Emergency flags: </strong>
          {data.emergencyFlags.join(', ')} — customer was shown the 999/997/998 notice.
        </div>
      )}

      <div className="grid2">
        <section className="panel">
          <h2>Journey</h2>
          <RoadTimeline
            stops={data.statusHistory.map((h) => ({
              message:
                STATUS_MESSAGES[h.toStatus as CaseStatus]?.en ?? h.toStatus.replaceAll('_', ' '),
              at: h.createdAt,
              actorRole: h.actorRole,
              isSystem: h.isSystem,
              isOverride: h.isOverride,
              notes: h.notes,
            }))}
          />
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel">
            <h2>Request</h2>
            <dl className="kv">
              <dt>Reported</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd>
              <dt>Problem</dt><dd>{data.description ?? <span className="muted">—</span>}</dd>
              <dt>Can move</dt><dd>{data.canMove ? 'Yes' : 'No'}</dd>
              <dt>Safe location</dt><dd>{data.isSafeLocation ? 'Yes' : <strong style={{ color: 'var(--red)' }}>No</strong>}</dd>
              <dt>Pickup</dt>
              <dd>
                {data.pickupAddress ?? <span className="mono">{data.pickupLat}, {data.pickupLng}</span>}
              </dd>
              <dt>VIN</dt><dd className="mono">{v.vin ?? '—'}</dd>
              <dt>Evidence</dt><dd>{data.media.length} file(s)</dd>
            </dl>
          </section>

          <section className="panel">
            <h2>Recovery</h2>
            {data.recoveryAssignments.length > 0 ? (
              <dl className="kv">
                <dt>Driver</dt><dd>{data.recoveryAssignments[0].driver.user.fullName}</dd>
                <dt>Phone</dt><dd className="mono">{data.recoveryAssignments[0].driver.user.phone}</dd>
                <dt>Truck</dt>
                <dd>
                  {data.recoveryAssignments[0].recoveryVehicle
                    ? `${data.recoveryAssignments[0].recoveryVehicle.truckType} · ${data.recoveryAssignments[0].recoveryVehicle.plateNumber}`
                    : '—'}
                </dd>
                <dt>Job status</dt><dd>{data.recoveryAssignments[0].status}</dd>
              </dl>
            ) : (
              <p className="muted">No driver assigned yet — dispatch from the live board.</p>
            )}
          </section>

          <section className="panel">
            <h2>Garage</h2>
            {data.garage ? (
              <dl className="kv">
                <dt>Name</dt><dd>{data.garage.name}</dd>
                <dt>Address</dt><dd>{data.garage.address}</dd>
                <dt>Phone</dt><dd className="mono">{data.garage.phone}</dd>
              </dl>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={garageId} onChange={(e) => setGarageId(e.target.value)}>
                  <option value="">Choose approved garage…</option>
                  {garages.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} · {g.emirate}</option>
                  ))}
                </select>
                <button className="btn btn--sm" disabled={!garageId} onClick={assignGarage}>
                  Assign
                </button>
              </div>
            )}
          </section>

          {quote && (
            <section className="panel">
              <h2>Quotation v{quote.version} · {quote.status.replaceAll('_', ' ')}</h2>
              <table className="dt">
                <thead>
                  <tr><th>Item</th><th>Qty</th><th>Total</th><th>Customer</th></tr>
                </thead>
                <tbody>
                  {quote.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.title}{i.requiresPart ? ' ⚙' : ''}</td>
                      <td className="mono">{i.quantity}</td>
                      <td className="mono">{i.lineTotal} {quote.currency}</td>
                      <td>
                        {i.approval ? (
                          <span className={`vtag vtag--${i.approval.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED'}`}>
                            {i.approval.decision}
                          </span>
                        ) : (
                          <span className="muted">pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ textAlign: 'right', marginBottom: 0 }} className="mono">
                Total <strong>{quote.total} {quote.currency}</strong>
              </p>
            </section>
          )}

          {data.payments.length > 0 && (
            <section className="panel">
              <h2>Payments</h2>
              <table className="dt">
                <thead><tr><th>Kind</th><th>Status</th><th>Total</th><th>When</th></tr></thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.kind}</td>
                      <td>
                        <span className={`vtag vtag--${p.status === 'CAPTURED' ? 'APPROVED' : p.status === 'FAILED' ? 'REJECTED' : 'PENDING'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="mono">{p.total} {p.currency}</td>
                      <td className="muted">{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
}
