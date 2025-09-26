const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Validation rules
const contactValidation = [
  body('user-name').notEmpty().withMessage('Name is required'),
  body('email-address').isEmail().withMessage('Valid email is required'),
  body('message').notEmpty().withMessage('Message is required')
];

// Configure nodemailer transporter (using Gmail as example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'connectcleanair@gmail.com',
    pass: process.env.EMAIL_PASS || 'dvsf owio sepm ntym'
  }
});

// POST route for contact form
router.post('/contact', contactValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      'user-name': userName,
      'email-address': emailAddress,
      'company-name': companyName,
      city,
      country,
      products,
      message
    } = req.body;

    // Format products list
    let productsList = 'None selected';
    if (products) {
      productsList = Array.isArray(products) ? products.join(', ') : products;
    }

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'connectcleanair@gmail.com',
      subject: `New Contact Form Submission from ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f4f4f4; padding: 20px; text-align: center; }
                .content { background: white; padding: 20px; }
                .field { margin-bottom: 15px; }
                .field-label { font-weight: bold; color: #555; }
                .field-value { color: #333; }
                .products-list { background: #f9f9f9; padding: 15px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Contact Form Submission</h1>
                    <p>You have received a new message from your website contact form</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="field-label">Name:</div>
                        <div class="field-value">${userName}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Email:</div>
                        <div class="field-value">${emailAddress}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Company Name:</div>
                        <div class="field-value">${companyName || 'Not provided'}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">City:</div>
                        <div class="field-value">${city || 'Not provided'}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Country:</div>
                        <div class="field-value">${country || 'Not provided'}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Products of Interest:</div>
                        <div class="field-value products-list">${productsList}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Message:</div>
                        <div class="field-value" style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px;">${message}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Submission Date:</div>
                        <div class="field-value">${new Date().toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Send confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: emailAddress,
      subject: 'Thank you for contacting Connect Clean Air',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f4f4f4; padding: 20px; text-align: center; }
                .content { background: white; padding: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Contacting Us</h1>
                </div>
                <div class="content">
                    <p>Dear ${userName},</p>
                    <p>Thank you for reaching out to Connect Clean Air. We have received your message and will get back to you within 24-48 hours.</p>
                    <p><strong>Here's a summary of your inquiry:</strong></p>
                    <p>Products of Interest: ${productsList}</p>
                    <p>Message: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</p>
                    <br>
                    <p>Best regards,<br>Connect Clean Air Team</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(userMailOptions);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// Optional: GET route to verify email service is working
router.get('/contact/status', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ 
      success: true, 
      message: 'Email service is configured correctly' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Email service configuration error' 
    });
  }
});

module.exports = router;