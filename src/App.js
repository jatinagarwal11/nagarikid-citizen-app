import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import FaceVerificationPage from './FaceVerificationPage';
import './App.css';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [qrData, setQrData] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [showRegister, setShowRegister] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('scan'); // scan, verify, face_id_verify, form
  const [scannedData, setScannedData] = useState(null);
  const [faceIdVerified, setFaceIdVerified] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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

  // Registration functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Camera access denied. Please allow camera access to scan your ID.');
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Fake OCR - in real implementation, this would call an OCR service
      const fakeOCRData = {
        national_id: '123456789', // This would be extracted from OCR
        name: 'John Doe', // This would be extracted from OCR
        dob: '1990-01-01' // This would be extracted from OCR
      };
      
      setScannedData(fakeOCRData);
      setRegistrationStep('verify');
      
      // Stop camera
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const startFaceIdVerification = () => {
    setRegistrationStep('face_id_verify');
  };

  const handleFaceVerificationSuccess = () => {
    setFaceIdVerified(true);
    setRegistrationStep('form');
  };

  const registerUser = async (password) => {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_id: scannedData.national_id,
          name: scannedData.name,
          dob: scannedData.dob,
          photo_url: 'https://via.placeholder.com/100', // In real app, this would be from the ID card
          password
        })
      });
      
      if (!res.ok) {
        throw new Error(`Registration failed: ${res.status}`);
      }
      
      await res.json(); // Parse response but don't store since we don't use it
      alert('Registration successful! You can now login.');
      setShowRegister(false);
      setRegistrationStep('scan');
      setScannedData(null);
      setFaceIdVerified(false);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + error.message);
    }
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

  useEffect(() => {
    if (showRegister && registrationStep === 'scan') {
      startCamera();
    }
  }, [showRegister, registrationStep]);

  if (!loggedIn) {
    if (showRegister) {
      // Registration flow
      return (
        <div className="register">
          <h1>NagarikID Registration</h1>
          
          {registrationStep === 'scan' && (
            <div className="scan-step">
              <h2>Step 1: Scan Your National ID Card</h2>
              <p>Position your National ID card in front of the camera.</p>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '400px' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <br />
              <button onClick={captureImage}>Capture ID Card</button>
              <br />
              <button onClick={() => setShowRegister(false)}>Back to Login</button>
            </div>
          )}
          
          {registrationStep === 'verify' && scannedData && (
            <div className="verify-step">
              <h2>Step 2: Verify Identity</h2>
              <p>Extracted Information:</p>
              <div className="extracted-data">
                <p><strong>National ID:</strong> {scannedData.national_id}</p>
                <p><strong>Name:</strong> {scannedData.name}</p>
                <p><strong>Date of Birth:</strong> {scannedData.dob}</p>
              </div>
              <p>Now we need to verify that your face matches your registered identity.</p>
              <button onClick={startFaceIdVerification}>Start Face ID Verification</button>
              <br />
              <button onClick={() => setRegistrationStep('scan')}>Rescan ID</button>
            </div>
          )}

          {registrationStep === 'face_id_verify' && (
            <div className="liveness-step">
              <FaceVerificationPage
                onBack={() => setRegistrationStep('verify')}
                onSuccess={handleFaceVerificationSuccess}
              />
            </div>
          )}
          
          {registrationStep === 'form' && scannedData && faceIdVerified && (
            <div className="form-step">
              <h2>Step 3: Create Account</h2>
              <p>Face ID verification successful. Create your password.</p>
              <input id="reg-password" type="password" placeholder="Create Password" />
              <br />
              <button onClick={() => registerUser(document.getElementById('reg-password').value)}>Complete Registration</button>
              <br />
              <button onClick={() => setRegistrationStep('verify')}>Back</button>
            </div>
          )}
        </div>
      );
    } else {
      // Login form
      return (
        <div className="login">
          <h1>NagarikID</h1>
          <input id="national_id" placeholder="National ID" />
          <input id="password" type="password" placeholder="Password" />
          <button onClick={() => login(document.getElementById('national_id').value, document.getElementById('password').value)}>Login</button>
          <br />
          <button onClick={() => setShowRegister(true)}>Register New Account</button>
        </div>
      );
    }
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