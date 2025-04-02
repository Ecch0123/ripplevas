const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "jericho.sosas23@gmail.com",
        pass: "gows xkiz zxwl owf" // Use the App Password
    }
});

async function sendEmail(signerName, signerEmail, websiteLink) {
    if (!signerEmail) throw new Error("Email is required");

    const mailOptions = {
        from: "jericho.sosas23@gmail.com",
        to: signerEmail,
        subject: "Signature Request",
        text: `Hello ${signerName},\n\nPlease review and sign the document at the following link:\n${websiteLink}\n\nThank you!`
    };

    return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
