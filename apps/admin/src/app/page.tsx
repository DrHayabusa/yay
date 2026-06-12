'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setTokens } from '@/lib/api';

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
    <main style={{ maxWidth: 420, marginTop: 80 }}>
      <h1>Sanad Operations</h1>
      <div className="panel">
        {stage === 'phone' ? (
          <div className="row">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+9715XXXXXXXX"
              aria-label="Phone number"
            />
            <button onClick={requestCode} disabled={busy}>
              Send code
            </button>
          </div>
        ) : (
          <div className="row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              aria-label="One-time code"
            />
            <button onClick={verify} disabled={busy}>
              Sign in
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <p className="muted">In development the code is printed in the API console.</p>
      </div>
    </main>
  );
}
