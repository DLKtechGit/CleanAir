const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Validation rules
const productCatalogueValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('product').notEmpty().withMessage('Product selection is required')
];

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'connectcleanair@gmail.com',
    pass: process.env.EMAIL_PASS || 'dvsf owio sepm ntym'
  }
});

// POST route for product catalogue request
router.post('/product-catalogue', productCatalogueValidation, async (req, res) => {
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
      name,
      email,
      company,
      city,
      country,
      product
    } = req.body;

    // Email to company
    const companyMailOptions = {
      from: process.env.EMAIL_USER,
      to: 'connectcleanair@gmail.com',
      subject: `New Product Catalogue Request - ${product}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; }
                .content { background: white; padding: 20px; }
                .field { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
                .field-label { font-weight: bold; color: #0061a6; display: block; margin-bottom: 5px; }
                .field-value { color: #333; }
                .product-highlight { background: #e3f2fd; border-left: 4px solid #0061a6; padding: 15px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 New Product Catalogue Request</h1>
                    <p>Someone has requested a product catalogue from your website</p>
                </div>
                <div class="content">
                    <div class="product-highlight">
                        <strong>Requested Product:</strong> ${product}
                    </div>
                    
                    <div class="field">
                        <span class="field-label">👤 Name:</span>
                        <span class="field-value">${name}</span>
                    </div>
                    
                    <div class="field">
                        <span class="field-label">📧 Email:</span>
                        <span class="field-value">${email}</span>
                    </div>
                    
                    <div class="field">
                        <span class="field-label">🏢 Company:</span>
                        <span class="field-value">${company || 'Not provided'}</span>
                    </div>
                    
                    <div class="field">
                        <span class="field-label">🏙️ City:</span>
                        <span class="field-value">${city || 'Not provided'}</span>
                    </div>
                    
                    <div class="field">
                        <span class="field-label">🌍 Country:</span>
                        <span class="field-value">${country || 'Not provided'}</span>
                    </div>
                    
                    <div class="field">
                        <span class="field-label">📅 Request Date:</span>
                        <span class="field-value">${new Date().toLocaleString()}</span>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 5px;">
                        <strong>💡 Next Steps:</strong><br>
                        - Follow up with the prospect within 24 hours<br>
                        - Provide additional technical specifications if needed<br>
                        - Schedule a product demonstration if interested
                    </div>
                </div>
            </div>
        </body>
        </html>
      `
    };

    // Confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Thank you for your interest in ${product} - Connect Clean Air`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #0061a6; color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                .product-info { background: #f0f8ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .contact-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; background: #0061a6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Connect Clean Air</h1>
                    <p>Clean Air Solutions for Critical Environments</p>
                </div>
                <div class="content">
                    <h2>Thank you for your interest, ${name}!</h2>
                    
                    <p>We appreciate your interest in our <strong>${product}</strong>. Our team will contact you shortly to discuss your requirements.</p>
                    
                    <div class="product-info">
                        <h3>📋 What's Next?</h3>
                        <p>Within 24 hours, our technical expert will:</p>
                        <ul>
                            <li>Contact you to understand your specific requirements</li>
                            <li>Provide detailed product specifications</li>
                            <li>Discuss customization options if needed</li>
                            <li>Arrange a site visit or virtual demonstration</li>
                        </ul>
                    </div>
                    
                    <div class="contact-info">
                        <h3>📞 Need Immediate Assistance?</h3>
                        <p>Feel free to contact us directly:</p>
                        <p>📧 Email: connectcleanair@gmail.com<br>
                           📞 Phone: (+91) 98410 74504<br>
                           🏢 Address: No. 4, Senthil Nagar, 100 Feet Road, (Near Arumbakkam Metro) Chennai - 600 106, Tamil Nadu, India</p>
                    </div>
                    
                    <p>Best regards,<br>
                    <strong>Connect Clean Air Team</strong></p>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    // Send both emails
    await transporter.sendMail(companyMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({
      success: true,
      message: 'Thank you! Your request has been submitted. We will contact you shortly.'
    });

  } catch (error) {
    console.error('Error processing product catalogue request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process your request. Please try again later.'
    });
  }
});

// GET route to check product catalogue service status
router.get('/product-catalogue/status', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ 
      success: true, 
      message: 'Product catalogue service is active' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Product catalogue service configuration error' 
    });
  }
});

module.exports = router;