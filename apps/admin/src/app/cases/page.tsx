'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, isLoggedIn } from '@/lib/api';

interface CaseRow {
  id: string;
  status: string;
  createdAt: string;
  vehicle: { make: string; model: string; year: number; plateEmirate: string; plateNumber: string };
  garage: { id: string; name: string } | null;
  recoveryAssignments: { driver: { user: { fullName: string; phone: string } } }[];
}

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [driverId, setDriverId] = useState('');
  const [garageId, setGarageId] = useState('');

  const load = useCallback(async () => {
    try {
      setCases(await api<CaseRow[]>('/admin/cases'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/');
      return;
    }
    void load();
    const t = setInterval(load, 10_000); // simple polling; WS board lands in M7
    return () => clearInterval(t);
  }, [load, router]);

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

  async function assignGarage(caseId: string) {
    try {
      await api(`/admin/cases/${caseId}/assign-garage`, {
        method: 'POST',
        body: JSON.stringify({ garageId }),
      });
      setGarageId('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main>
      <h1>Live cases</h1>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Driver</th>
              <th>Garage</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td className="muted">{c.id.slice(-8)}</td>
                <td>
                  {c.vehicle.make} {c.vehicle.model} {c.vehicle.year}
                  <span className="muted"> · {c.vehicle.plateEmirate} {c.vehicle.plateNumber}</span>
                </td>
                <td>
                  <span className="status">{c.status.replaceAll('_', ' ')}</span>
                </td>
                <td>{c.recoveryAssignments[0]?.driver.user.fullName ?? '—'}</td>
                <td>{c.garage?.name ?? '—'}</td>
                <td className="muted">{new Date(c.createdAt).toLocaleString()}</td>
                <td>
                  {c.status === 'AWAITING_RECOVERY_ASSIGNMENT' &&
                    (assigning === c.id ? (
                      <span className="row">
                        <input
                          placeholder="driverId"
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          style={{ width: 180 }}
                        />
                        <button onClick={() => assignRecovery(c.id)}>Assign</button>
                        <button className="secondary" onClick={() => setAssigning(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setAssigning(c.id)}>Assign driver</button>
                    ))}
                  {!c.garage && c.status !== 'AWAITING_RECOVERY_ASSIGNMENT' && (
                    <span className="row">
                      <input
                        placeholder="garageId"
                        value={garageId}
                        onChange={(e) => setGarageId(e.target.value)}
                        style={{ width: 180 }}
                      />
                      <button onClick={() => assignGarage(c.id)}>Set garage</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No active cases.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
