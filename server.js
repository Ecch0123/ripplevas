const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const upload = multer({ dest: 'uploads/' });

app.get('/upload', (req, res) => {
    const file = req.query.file;
    if (!file) {
        return res.status(400).send("Missing file parameter");
    }

    const filePath = path.join(__dirname, 'uploads', file);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
    }

    // Serve an HTML page where users can edit the PDF
    res.send(
        // You can add HTML content here for the editing interface
    );
});

app.post('/send-email', upload.single('file'), async (req, res) => {
    const { signerName, signerEmail } = req.body;
    const uploadedFile = req.file;

    // Validate input
    if (!signerName || !signerEmail) {
        return res.status(400).json({ message: "Both name and email are required" });
    }

    console.log(`📧 Sending email to: ${signerEmail}`);

    const fileUrl = `http://192.168.254.120:3001/upload?file=${encodeURIComponent(uploadedFile.filename)}`;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'jericho.sosas23@gmail.com', // Keep your email here for now
            pass: 'zgqk scvi otjw jpet' // Keep your password here for now
        }
    });

    const mailOptions = {
        from: 'jericho.sosas23@gmail.com',
        to: signerEmail,
        subject: 'Sign Document Request',
        html: `<div style="font-family: Arial, sans-serif; text-align: center;" border="2px solid #ccc" cellpadding="10" cellspacing="0">
        <h2>Ripple VAs</h2>
        <p><strong>Ripple VAs</strong> sent you <strong>TESTING</strong> to review and sign.</p>
        <a href="${fileUrl}" 
           style="display: inline-block; padding: 10px 20px; font-size: 16px; 
                  background-color: #007bff; color: white; text-decoration: none; 
                  border-radius: 5px;">
           View Document
        </a>
        <p>Hi ${signerName}</p>
        <p>Please see the attached document.</p>
   </div>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${signerEmail}`);
        res.json({ message: "Email sent successfully", response: info.response });
    } catch (error) {
        console.error("❌ Email Error:", error);
        return res.status(500).json({ error: "Failed to send email", details: error.message });
    }
});

// Removed Modification History API
// app.get('/modifications', (req, res) => { ... });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://192.168.254.120:${PORT}`);
});
