import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [name, setName] = useState('');
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then(setUsers);
  }, []);

  const handleCreateUser = async () => {
    if (!name) return alert('Enter a name');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const user = await res.json();
    router.push(`/dashboard?userId=${user.id}`);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎙️ VoiceVault</h1>
      <p>Anonymous voice notes made simple & private.</p>

      <input
        type="text"
        placeholder="Enter your nickname"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
      />
      <button onClick={handleCreateUser} style={styles.button}>
        Continue
      </button>

      <h2 style={{ marginTop: '2rem' }}>Recent Users</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name} (joined {new Date(u.createdAt).toLocaleString()})</li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: '2rem', textAlign: 'center' },
  title: { fontSize: '2.5rem', marginBottom: '1rem' },
  input: { padding: '0.5rem', marginRight: '1rem', width: '70%' },
  button: { padding: '0.5rem 1rem', background: 'black', color: 'white', border: 'none' }
};
