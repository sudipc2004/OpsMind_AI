const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getTursoClient } = require('../lib/turso');

// Use env variables for JWT and SMTP defaults
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

async function sendOtpEmail(email, otp) {
  const fs = require('fs');
  const path = require('path');
  
  // Save OTP to a file for easy access by the user
  const otpPath = path.join(__dirname, '../LATEST_OTP.txt');
  fs.writeFileSync(otpPath, `User: ${email}\nOTP: ${otp}\nGenerated At: ${new Date().toLocaleString()}`);

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"OpsMind AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your OpsMind AI Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
          <h2 style="color: #8b5cf6;">OpsMind AI</h2>
          <p>Here is your 6-digit login code. It will expire in 10 minutes.</p>
          <h1 style="background: #f4f4f5; padding: 12px; text-align: center; letter-spacing: 5px;">${otp}</h1>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } else {
    console.log('\n========================================');
    console.log(`[DEV MODE] OTP generated for ${email}`);
    console.log(`Code: ${otp}`);
    console.log('========================================\n');
  }
}


// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const turso = getTursoClient();
    const result = await turso.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });
    const user = result.rows[0];

    if (user && user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, email: user.email, requireOtp: false });
    }

    const pendingPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

    if (user) {
      await turso.execute({
        sql: "UPDATE users SET otp = ?, expiresAt = ?, pendingPassword = ?, modifiedAt = ? WHERE email = ?",
        args: [otp, expiresAt, pendingPassword, new Date().toISOString(), email]
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO users (email, otp, expiresAt, pendingPassword, modifiedAt) VALUES (?, ?, ?, ?, ?)",
        args: [email, otp, expiresAt, pendingPassword, new Date().toISOString()]
      });
    }

    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent successfully', requireOtp: true });
  } catch (err) {
    console.error('[Auth Route Error]', err);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const turso = getTursoClient();
    const result = await turso.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });
    const user = result.rows[0];

    if (!user || user.otp !== otp) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    if (new Date() > new Date(user.expiresAt)) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    if (user.pendingPassword) {
      await turso.execute({
        sql: "UPDATE users SET password = ?, otp = NULL, expiresAt = NULL, pendingPassword = NULL WHERE email = ?",
        args: [user.pendingPassword, email]
      });
    } else {
      await turso.execute({
        sql: "UPDATE users SET otp = NULL, expiresAt = NULL WHERE email = ?",
        args: [email]
      });
    }

    const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  } catch (err) {
    console.error('[Auth Route Error]', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

module.exports = router;


module.exports = router;
