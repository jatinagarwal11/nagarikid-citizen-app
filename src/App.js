import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import './App.css';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [qrData, setQrData] = useState('');
  const [countdown, setCountdown] = useState(5);
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  const login = async (national_id, password) => {
    try {
      console.log('Attempting login to:', API_BASE);
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ national_id, password })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Login response:', data);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setLoggedIn(true);
        loadUser();
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + error.message + '. Check console for details.');
    }
  };

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading user data...');
      const res = await fetch(`${API_BASE}/generate-token`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Token generation failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Token data:', data);
      
      if (data.uid) {
        const userRes = await fetch(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!userRes.ok) {
          throw new Error(`User data fetch failed: ${userRes.status}`);
        }
        
        const userData = await userRes.json();
        console.log('User data:', userData);
        
        setUser({ ...userData, qrData: data });
        generateQR(data);
        setCountdown(5);
      }
    } catch (error) {
      console.error('Load user error:', error);
      alert('Failed to load user data: ' + error.message);
    }
  }, [API_BASE]);

  const generateQR = async (data) => {
    const qrString = JSON.stringify(data);
    const qrUrl = await QRCode.toDataURL(qrString);
    setQrData(qrUrl);
  };

  useEffect(() => {
    if (loggedIn) {
      loadUser(); // Load user data immediately when logged in
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
  }, [loggedIn, loadUser]);

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

  // Show loading while user data is being fetched
  if (!user) {
    return (
      <div className="loading">
        <h1>NagarikID</h1>
        <p>Loading your digital identity...</p>
      </div>
    );
  }

  return (
    <div className="id-card">
      <img src={user.photo_url || 'https://via.placeholder.com/100'} alt="Portrait of verified person" />
      <h2>{user.name}</h2>
      <p>National ID: {user.national_id}</p>
      <p>DOB: {user.dob}</p>
      <img src={qrData} alt="QR Code" />
      <p>QR refresh in: {countdown} seconds</p>
    </div>
  );
}

export default App;