const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/upload', (req, res) => {
    const file = req.query.file;
    if (!file) {
        return res.status(400).send("Missing file parameter");
    }

    const filePath = path.join(__dirname, 'uploads', file); // This won't be used now

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
    }

    // Serve an HTML page where users can edit the PDF
    res.send(
    );
});


app.post('/send-email', upload.single('file'), async (req, res) => {
    const { signerName, signerEmail } = req.body;
    const uploadedFile = req.file;

    if (!signerName || !signerEmail || !uploadedFile) {
        return res.status(400).json({ message: "Both name, email, and file are required" });
    }

    console.log(`📧 Sending email to: ${signerEmail}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'jericho.sosas23@gmail.com', // Your email
            pass: 'zgqk scvi otjw jpet' // Your app password
        }
    });

    const fileUrl = "https://ripplevas.onrender.com/";




    const mailOptions = {
        from: 'jericho.sosas23@gmail.com',
        to: signerEmail,
        subject: 'Sign Document Request',
        html: `
    <div style="font-family: Arial, sans-serif; text-align: center; border: 2px solid #ccc; padding: 10px;">
        <h2>Ripple VAs</h2>
        <p><strong>Ripple VAs</strong> sent you <strong>TESTING</strong> to review and sign.</p>
        <a href="${fileUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            View Document
        </a>
        <p>Hi ${signerName},</p>
        <p>Please see the attached document.</p>
    </div>
`

    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${signerEmail}`);
        res.json({ message: "Email sent successfully", response: info.response });
    } catch (error) {
        console.error("❌ Email Error:", error);
        res.status(500).json({ error: "Failed to send email", details: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
