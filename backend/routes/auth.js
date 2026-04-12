const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getDb } = require('../lib/mongo');

// Use env variables for JWT and SMTP defaults
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

async function sendOtpEmail(email, otp) {
  // If SMTP is provided, actually send the email
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or use host/port for generic SMTP
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
    // Fallback for development if no SMTP is provided
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

    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ email });

    // If user exists and has a password
    if (user && user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Passwords match, bypass OTP
      const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, email: user.email, requireOtp: false });
    }

    // User does not exist or doesn't have a password (first-time login or legacy user)
    const pendingPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    // Upsert user with OTP and pendingPassword
    await users.updateOne(
      { email },
      { $set: { otp, expiresAt, pendingPassword, modifiedAt: new Date() } },
      { upsert: true }
    );

    // Send email (or log to terminal)
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

    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    if (new Date() > user.expiresAt) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    // Move pendingPassword to actual password, and clear OTP
    const updateDocs = { $unset: { otp: '', expiresAt: '', pendingPassword: '' } };
    if (user.pendingPassword) {
      updateDocs.$set = { password: user.pendingPassword };
    }

    await users.updateOne({ email }, updateDocs);

    // Sign JWT
    const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, email: user.email });
  } catch (err) {
    console.error('[Auth Route Error]', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

module.exports = router;
