const nodemailer = require('nodemailer');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp) => {
    // If email credentials are not set, log OTP to console (dev mode)
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com') {
        console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"MOI VIBARAM" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'MOI VIBARAM - Password Reset OTP',
        html: `
      <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#6c63ff;">MOI VIBARAM</h2>
        <p>Your OTP for password reset is:</p>
        <h1 style="color:#6c63ff;letter-spacing:8px;">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p style="color:#999;font-size:12px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
    });
};

module.exports = { generateOTP, sendOTPEmail };
