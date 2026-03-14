import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import './App.css';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [qrData, setQrData] = useState('');
  const [countdown, setCountdown] = useState(5);
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  const login = async (national_id, password) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setLoggedIn(true);
      loadUser();
    } else {
      alert('Invalid credentials');
    }
  };

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/generate-token`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.uid) {
      const userRes = await fetch(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      setUser({ ...userData, qrData: data });
      generateQR(data);
      setCountdown(5);
    }
  };

  const generateQR = async (data) => {
    const qrString = JSON.stringify(data);
    const qrUrl = await QRCode.toDataURL(qrString);
    setQrData(qrUrl);
  };

  useEffect(() => {
    if (loggedIn) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            loadUser();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="login">
        <h1>NagarikID</h1>
        <input id="national_id" placeholder="National ID" />
        <input id="password" type="password" placeholder="Password" />
        <button onClick={() => login(document.getElementById('national_id').value, document.getElementById('password').value)}>Login</button>
      </div>
    );
  }

  return (
    <div className="id-card">
      <img src={user.photo_url || 'https://via.placeholder.com/100'} alt="Photo" />
      <h2>{user.name}</h2>
      <p>National ID: {user.national_id}</p>
      <p>DOB: {user.dob}</p>
      <img src={qrData} alt="QR Code" />
      <p>QR refresh in: {countdown} seconds</p>
    </div>
  );
}

export default App;