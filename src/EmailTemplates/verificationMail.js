const sendVerificationEmail = (recipientName, otpCode, currentYear) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Account</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f6f8; padding: 40px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
              <!-- Header Banner -->
              <tr>
                <td style="background-color: #0056b3; padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Hospital Administration Portal</h1>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 40px 50px; text-align: left;">
                  <p style="font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 20px 0;">Dear ${recipientName},</p>
                  <p style="font-size: 15px; line-height: 24px; color: #555555; margin: 0 0 30px 0;">A new staff account registration has been initiated for you on our platform. To complete your login setup, please verify your email address using the secure passcode provided below.</p>
                  
                  <!-- OTP Code Box -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                      <td align="center" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otpCode}</span>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 14px; line-height: 20px; color: #dc2626; margin: 0 0 30px 0; font-weight: 500;">Please note: This security code is confidential and will expire in exactly <strong>30 minutes</strong>.</p>
                  <p style="font-size: 14px; line-height: 22px; color: #64748b; margin: 0;">If you did not request this code, please ignore this email or reach out to your IT security administrator immediately.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="font-size: 12px; color: #94a3b8; margin: 0 0 5px 0;">&copy; ${currentYear} PresencePro. All rights reserved.</p>
                  <p style="font-size: 12px; color: #94a3b8; margin: 0 0 10px 0;">This is an automated system notification. Please do not reply directly to this email.</p>
                  <p style="font-size: 13px; font-weight: 600; color: #475569; margin: 0;">Powered by CtrlCreateLabs</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = { sendVerificationEmail };
