import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const VoiceRecorder = dynamic(() => import('../components/VoiceRecorder'), { ssr:false });
const MessageList = dynamic(() => import('../components/MessageList'), { ssr:false });

export default function Home() {
  const [tab, setTab] = useState('send');
  const [recipientLink, setRecipientLink] = useState('');
  const [recipient, setRecipient] = useState(null);

  const [vault, setVault] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('vault');
    if (saved) {
      const v = JSON.parse(saved);
      setVault(v);
      setAdminToken(v.adminToken);
      loadMessages(v, v.adminToken);
    }
  }, []);

  async function createVault() {
    const username = prompt('Choose a username (display only):');
    if (!username) return;
    const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username }) });
    const json = await res.json();
    setVault(json);
    setAdminToken(json.adminToken);
    localStorage.setItem('vault', JSON.stringify(json));
    alert('Vault created! Share this link: ' + json.userLink);
  }

  async function findRecipient() {
    if (!recipientLink) return alert('Enter recipient link');
    const res = await fetch(`/api/users?link=${encodeURIComponent(recipientLink)}`);
    if (!res.ok) return alert('Recipient not found');
    const u = await res.json();
    setRecipient(u);
  }

  async function onSent(base64) {
    if (!recipient) return alert('No recipient selected');
    await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userLink: recipient.userLink, audioBase64: base64 })});
    alert('Message sent!');
    // reset
    setRecipient(null);
    setRecipientLink('');
  }

  async function loadMessages(v = vault, token = adminToken) {
    if (!v || !token) return;
    const res = await fetch(`/api/messages?userLink=${encodeURIComponent(v.userLink)}&adminToken=${encodeURIComponent(token)}`);
    if (!res.ok) {
      console.error(await res.text());
      return;
    }
    const list = await res.json();
    setMessages(list);
  }

  async function deleteMessage(id) {
    if (!vault) return;
    const ok = confirm('Delete this message?');
    if (!ok) return;
    const res = await fetch(`/api/messages/${encodeURIComponent(id)}?adminToken=${encodeURIComponent(adminToken)}`, { method: 'DELETE' });
    if (res.ok) {
      loadMessages();
    } else {
      alert('Failed to delete');
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🎤 VoiceVault</div>
        <div className="subtitle">Anonymous voice messages with share-capable playback</div>
      </div>

      <div className="row" style={{marginBottom:12}}>
        <button className={`btn ${tab==='send'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('send')}>Send</button>
        <button className={`btn ${tab==='vault'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('vault')}>My Vault</button>
      </div>

      {tab === 'send' && (
        <div className="glass">
          {!recipient ? (
            <>
              <h3>Send Anonymous Message</h3>
              <div style={{marginTop:8}} className="row">
                <input className="input" placeholder="recipient link (e.g. anonymous-abc123)" value={recipientLink} onChange={(e)=>setRecipientLink(e.target.value)} />
                <button className="btn btn-primary" onClick={findRecipient}>Find</button>
              </div>
              <div className="small" style={{marginTop:10}}>Enter the recipient's vault link to start recording for them.</div>
            </>
          ) : (
            <>
              <h3>Sending to @{recipient.username}</h3>
              <VoiceRecorder onSent={onSent} apiBase="/api" />
              <div className="small" style={{marginTop:8}}>After recording you'll send an anonymized voice note to <span className="link-box">{recipient.userLink}</span></div>
            </>
          )}
        </div>
      )}

      {tab === 'vault' && (
        <div>
          {!vault ? (
            <div className="glass">
              <h3>Create Your VoiceVault</h3>
              <button className="btn btn-primary" onClick={createVault}>Create Vault</button>
              <div className="small" style={{marginTop:8}}>Vault owners receive an admin token stored locally to manage messages.</div>
            </div>
          ) : (
            <div>
              <div className="glass">
                <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>Your Vault</div>
                    <div className="small">Share this link so others can send you messages:</div>
                    <div className="link-box" style={{marginTop:8}}>{vault.userLink}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <button className="btn btn-ghost" onClick={() => { localStorage.removeItem('vault'); setVault(null); setMessages([]); alert('Vault cleared from this browser'); }}>Clear Vault</button>
                    <button className="btn btn-primary" onClick={() => loadMessages()}>Load Messages</button>
                  </div>
                </div>
              </div>

              <MessageList messages={messages} onDelete={deleteMessage} adminToken={adminToken} apiBase="/api" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
