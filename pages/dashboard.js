import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const MessageList = dynamic(() => import('../components/MessageList'), { ssr: false });

export default function Dashboard() {
  const [vault, setVault] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('vault');
    if (saved) {
      const v = JSON.parse(saved);
      setVault(v);
      setAdminToken(v.adminToken);
      fetchMessages(v, v.adminToken);
    }
  }, []);

  async function createVault() {
    if (!usernameInput || usernameInput.trim() === '') return alert('enter username');
    const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: usernameInput }) });
    if (!res.ok) return alert('Failed to create vault');
    const json = await res.json();
    setVault(json);
    setAdminToken(json.adminToken);
    localStorage.setItem('vault', JSON.stringify(json));
    setUsernameInput('');
    fetchMessages(json, json.adminToken);
  }

  async function fetchMessages(v = vault, token = adminToken) {
    if (!v || !token) return;
    setLoading(true);
    const res = await fetch(`/api/messages?userLink=${encodeURIComponent(v.userLink)}&adminToken=${encodeURIComponent(token)}`);
    if (!res.ok) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const list = await res.json();
    setMessages(list);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!vault) return;
    const ok = confirm('Delete this message?');
    if (!ok) return;
    const res = await fetch(`/api/messages/${encodeURIComponent(id)}?adminToken=${encodeURIComponent(adminToken)}`, { method: 'DELETE' });
    if (res.ok) fetchMessages();
    else alert('Failed to delete');
  }

  function copyLink() {
    if (vault) {
      navigator.clipboard.writeText(vault.userLink);
      alert('Link copied to clipboard');
    }
  }

  function clearLocal() {
    localStorage.removeItem('vault');
    setVault(null);
    setMessages([]);
    setAdminToken(null);
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🎤 VoiceVault — Dashboard</div>
        <div className="subtitle">Manage your Vault, view messages, and share</div>
      </div>

      {!vault ? (
        <div className="glass">
          <h3>Create your Vault</h3>
          <div className="row" style={{marginTop:8}}>
            <input className="input" placeholder="username (display only)" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} />
            <button className="btn btn-primary" onClick={createVault}>Create Vault</button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>Vault: <span className="small">{vault.userLink}</span></div>
              <div className="small">Owner token stored locally for management</div>
            </div>
            <div style={{textAlign:'right'}}>
              <button className="btn btn-ghost" onClick={copyLink}>Copy Link</button>
              <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(vault.adminToken); alert('Admin token copied (keep private)'); }}>Copy Admin Token</button>
              <button className="btn btn-ghost" onClick={clearLocal}>Clear Local</button>
              <button className="btn btn-primary" onClick={() => fetchMessages()}>Refresh</button>
            </div>
          </div>

          <div className="glass">
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <span className="stat">Messages: {messages.length}</span>
              </div>
              <div className="small">Vault created: {new Date(vault.createdAt).toLocaleString()}</div>
            </div>

            <div style={{marginTop:12}}>
              {loading ? <div className="small">Loading messages…</div> : <MessageList messages={messages} onDelete={handleDelete} adminToken={adminToken} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
