const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "your-email@gmail.com",  // Replace with your email
        pass: "your-email-password"    // Replace with your email password or App Password
    }
});

app.post("/send-email", async (req, res) => {
    const { signerName, signerEmail, websiteLink } = req.body;

    if (!signerEmail) {
        return res.status(400).json({ error: "Email is required" });
    }

    const mailOptions = {
        from: "your-email@gmail.com",
        to: signerEmail,
        subject: "Signature Request",
        text: `Hello ${signerName},\n\nPlease review and sign the document at the following link:\n${websiteLink}\n\nThank you!`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: "Email sent successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error sending email" });
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
