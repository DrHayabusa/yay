'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shell } from '@/components/Shell';

type EntityKind = 'provider' | 'garage' | 'supplier';

interface Row {
  id: string;
  name: string;
  phone: string;
  tradeLicenceNo: string;
  verification: string;
  createdAt: string;
  extra?: string;
}

const TABS: { kind: EntityKind; label: string }[] = [
  { kind: 'provider', label: 'Recovery providers' },
  { kind: 'garage', label: 'Garages' },
  { kind: 'supplier', label: 'Suppliers' },
];

export default function VerificationPage() {
  const [kind, setKind] = useState<EntityKind>('provider');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      if (kind === 'provider') {
        const data = await api<any[]>('/admin/providers');
        setRows(
          data.map((p) => ({
            id: p.id, name: p.companyName, phone: p.phone,
            tradeLicenceNo: p.tradeLicenceNo, verification: p.verification,
            createdAt: p.createdAt,
            extra: `${p._count.drivers} driver(s) · ${p._count.recoveryVehicles} truck(s)`,
          })),
        );
      } else if (kind === 'garage') {
        const data = await api<any[]>('/admin/garages');
        setRows(
          data.map((g) => ({
            id: g.id, name: g.name, phone: g.phone, tradeLicenceNo: g.tradeLicenceNo,
            verification: g.verification, createdAt: g.createdAt, extra: g.emirate,
          })),
        );
      } else {
        const data = await api<any[]>('/admin/suppliers');
        setRows(
          data.map((s) => ({
            id: s.id, name: s.name, phone: s.phone, tradeLicenceNo: s.tradeLicenceNo,
            verification: s.verification, createdAt: s.createdAt, extra: s.emirate,
          })),
        );
      }
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    try {
      await api(`/admin/${kind}/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Shell>
      <div className="pagehead">
        <h1>Verification</h1>
        <span className="muted">Trade licence + identity checks are manual in the MVP — curated supply only.</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.kind}
            className={`btn btn--sm ${kind === t.kind ? '' : 'btn--ghost'}`}
            onClick={() => setKind(t.kind)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="panel" style={{ padding: 0 }}>
        <table className="dt">
          <thead>
            <tr>
              <th>Name</th><th>Trade licence</th><th>Phone</th><th>Details</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td className="mono">{r.tradeLicenceNo}</td>
                <td className="mono">{r.phone}</td>
                <td className="muted">{r.extra}</td>
                <td><span className={`vtag vtag--${r.verification}`}>{r.verification.replaceAll('_', ' ')}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {r.verification !== 'APPROVED' && (
                    <button className="btn btn--sm" onClick={() => setStatus(r.id, 'APPROVED')}>Approve</button>
                  )}
                  {r.verification === 'PENDING' && (
                    <button className="btn btn--danger btn--sm" onClick={() => setStatus(r.id, 'REJECTED')}>Reject</button>
                  )}
                  {r.verification === 'APPROVED' && (
                    <button className="btn btn--danger btn--sm" onClick={() => setStatus(r.id, 'SUSPENDED')}>Suspend</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted">Nothing here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
