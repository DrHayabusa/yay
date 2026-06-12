'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setTokens } from '@/lib/api';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+971');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
      setStage('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      setTokens(res.accessToken, res.refreshToken);
      router.push('/cases');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <section className="gate__brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={36} />
          <div className="wordmark">
            SANAD
            <small>operations · عمليات</small>
          </div>
        </div>
        <p className="gate__tag">
          Every breakdown, recovery, diagnosis and repair —{' '}
          <em>tracked to the fil, audited to the minute.</em>
        </p>
        <div className="hazard" style={{ width: 120 }} />
      </section>

      <section className="gate__form">
        <form
          className="gate__card"
          onSubmit={(e) => {
            e.preventDefault();
            void (stage === 'phone' ? requestCode() : verify());
          }}
        >
          <h1 style={{ marginBottom: 4 }}>Sign in</h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
            Operations access only. All actions are audit-logged.
          </p>

          <label className="field" htmlFor="phone">Phone number</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+9715XXXXXXXX"
            disabled={stage === 'code'}
            autoComplete="tel"
          />

          {stage === 'code' && (
            <div style={{ marginTop: 14 }}>
              <label className="field" htmlFor="code">One-time code</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="······"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                className="mono"
                style={{ letterSpacing: '0.5em', fontSize: 18, textAlign: 'center' }}
              />
            </div>
          )}

          <button className="btn" disabled={busy} style={{ width: '100%', marginTop: 20 }}>
            {stage === 'phone' ? 'Send code' : 'Enter console'}
          </button>

          {error && <p className="error-text">{error}</p>}
          <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
            Dev environment: the code is printed in the API console.
          </p>
        </form>
      </section>
    </div>
  );
}
