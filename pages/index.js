import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const VoiceRecorder = dynamic(() => import('../components/VoiceRecorder'), { ssr: false });

export default function Home() {
  const [recipientLink, setRecipientLink] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [status, setStatus] = useState('');

  async function findRecipient() {
    if (!recipientLink) return alert('Enter recipient link');
    setStatus('Looking up recipient...');
    const res = await fetch(`/api/users?link=${encodeURIComponent(recipientLink)}`);
    if (!res.ok) {
      setStatus('Recipient not found');
      setRecipient(null);
      return;
    }
    const u = await res.json();
    setRecipient(u);
    setStatus('');
  }

  async function sendHandler(base64) {
    if (!recipient) return alert('No recipient selected');
    setStatus('Sending message...');
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userLink: recipient.userLink, audioBase64: base64 })
    });
    if (!res.ok) {
      setStatus('Failed to send');
      alert('Failed to send message');
      return;
    }
    setStatus('Message sent! 🎉');
    setRecipient(null);
    setRecipientLink('');
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🎤 VoiceVault</div>
        <div className="subtitle">Send anonymous voice notes — quick & private</div>
      </div>

      <div className="glass">
        <h2>Send Anonymous Voice Note</h2>
        <div className="row" style={{marginTop:8}}>
          <input className="input" placeholder="recipient link (e.g. anonymous-abc123)" value={recipientLink} onChange={(e)=>setRecipientLink(e.target.value)} />
          <button className="btn btn-primary" onClick={findRecipient}>Find</button>
        </div>

        {recipient && (
          <div style={{marginTop:12}}>
            <div className="small">Sending to <strong>@{recipient.username}</strong></div>
            <VoiceRecorder recipientLink={recipient.userLink} onSent={sendHandler} />
          </div>
        )}

        <div style={{marginTop:12}} className="small center">{status}</div>
      </div>

      <div className="glass center">
        <div className="small">Have a Vault? <a style={{color:'var(--accent1)'}} href="/dashboard">Open Dashboard</a></div>
      </div>
    </div>
  );
}
