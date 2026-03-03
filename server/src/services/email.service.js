import nodemailer from 'nodemailer';

// Mock transporter for development/fallback if SMTP is not provided
const createTransporter = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback: Just log to console if no email credentials
    return {
        sendMail: async (mailOptions) => {
            console.log('\n=========================================');
            console.log('📧 MOCK EMAIL SENT (No SMTP Credentials)');
            console.log(`To: ${mailOptions.to}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log(`Body:\n${mailOptions.text || mailOptions.html.replace(/<[^>]*>?/gm, '')}`);
            console.log('=========================================\n');
            return true;
        }
    };
};

const transporter = createTransporter();

export const sendWelcomeEmail = async (user, role) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"UrbanSlot Team" <noreply@urbanslot.com>',
            to: user.email,
            subject: 'Welcome to UrbanSlot! 🚗',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563EB;">Welcome aboard, ${user.name}!</h2>
                    <p>We are thrilled to have you join UrbanSlot as a ${role === 'host' ? 'Parking Host' : 'Driver'}.</p>
                    
                    ${role === 'host'
                    ? `<p>You can now start listing your empty parking spaces to earn money. Head over to your Host Dashboard to add your first spot!</p>`
                    : `<p>You can now search and book premium parking spaces instantly without the hassle. Happy parking!</p>`
                }

                    <p>If you have any questions, feel free to reply to this email.</p>
                    <br/>
                    <p>Cheers,<br/>The UrbanSlot Team</p>
                </div>
            `,
            text: `Welcome aboard, ${user.name}! We are thrilled to have you join UrbanSlot as a ${role}.`
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending failed:', error.message);
    }
};
