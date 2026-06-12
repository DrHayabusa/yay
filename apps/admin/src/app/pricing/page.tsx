'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shell } from '@/components/Shell';

interface PricingRow {
  id: string;
  emirate: string;
  baseRecoveryFee: string;
  perKmFee: string;
  diagnosticFee: string;
  platformFeeRate: string;
  vatRate: string;
  updatedAt: string;
}

const EMPTY = { emirate: 'Dubai', baseRecoveryFee: '200.00', perKmFee: '5.00', diagnosticFee: '100.00' };

export default function PricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await api<PricingRow[]>('/admin/pricing'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaved(false);
    try {
      await api('/admin/pricing', { method: 'POST', body: JSON.stringify(form) });
      setSaved(true);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function field(key: keyof typeof EMPTY, label: string, hint?: string) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label className="field" htmlFor={key}>{label}</label>
        <input
          id={key}
          className="mono"
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
        {hint && <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>{hint}</p>}
      </div>
    );
  }

  return (
    <Shell>
      <div className="pagehead">
        <h1>Recovery pricing</h1>
        <span className="muted">Estimates shown to customers before dispatch. VAT 5% applied on top.</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="grid2">
        <section className="panel">
          <h2>Active configuration</h2>
          <table className="dt">
            <thead>
              <tr><th>Emirate</th><th>Base</th><th>Per km</th><th>Diagnostic</th><th>Platform fee</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.emirate}</td>
                  <td className="mono">{r.baseRecoveryFee}</td>
                  <td className="mono">{r.perKmFee}</td>
                  <td className="mono">{r.diagnosticFee}</td>
                  <td className="mono">{(Number(r.platformFeeRate) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="muted">No pricing configured — defaults apply.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Update an emirate</h2>
          <div style={{ marginBottom: 14 }}>
            <label className="field" htmlFor="emirate">Emirate</label>
            <select
              id="emirate"
              value={form.emirate}
              onChange={(e) => setForm({ ...form, emirate: e.target.value })}
            >
              {['Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>
          {field('baseRecoveryFee', 'Base recovery fee (AED)')}
          {field('perKmFee', 'Per-kilometre fee (AED)', 'Distance from pickup to assigned garage.')}
          {field('diagnosticFee', 'Diagnostic fee (AED)', 'Charged with the recovery payment; covers garage inspection.')}
          <button className="btn" onClick={save}>Publish new pricing</button>
          {saved && <p style={{ color: 'var(--green)', fontSize: 13 }}>Published — previous config archived, change audit-logged.</p>}
        </section>
      </div>
    </Shell>
  );
}
