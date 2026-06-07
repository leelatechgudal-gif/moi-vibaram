const https = require('https');
const querystring = require('querystring');
const logger = require('./logger');

/**
 * Sends a transactional OTP SMS to the specified mobile number.
 * Defaults to logging to the console in dev mode, or sends via Twilio if configured.
 * 
 * @param {string} mobile - Mobile number of the recipient.
 * @param {string} otp - The 6-digit OTP code to send.
 * @returns {Promise<any>}
 */
const sendSMS = async (mobile, otp) => {
    const provider = process.env.SMS_PROVIDER || 'console';
    
    // Ensure mobile has country code prefix (e.g. +91)
    let formattedMobile = mobile ? mobile.trim() : '';
    if (!formattedMobile.startsWith('+')) {
        if (formattedMobile.length === 10) {
            formattedMobile = '+91' + formattedMobile;
        } else if (formattedMobile.startsWith('91') && formattedMobile.length === 12) {
            formattedMobile = '+' + formattedMobile;
        }
    }

    if (provider === 'twilio') {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

        let username, password;
        if (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET) {
            username = process.env.TWILIO_API_KEY_SID;
            password = process.env.TWILIO_API_KEY_SECRET;
        } else {
            username = accountSid;
            password = process.env.TWILIO_AUTH_TOKEN;
        }

        if (!accountSid || !username || !password || (!fromNumber && !messagingServiceSid)) {
            logger.warn('[sms] Twilio configured but required credentials (TWILIO_ACCOUNT_SID, and either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID) are missing. Falling back to console.');
            console.log(`[SMS DEV MODE] Mobile: ${formattedMobile}, OTP: ${otp}`);
            return;
        }

        const message = `Your verification code for MOI VIBARAM is ${otp}. Valid for 10 minutes.`;

        const params = {
            To: formattedMobile,
            Body: message
        };

        if (messagingServiceSid) {
            params.MessagingServiceSid = messagingServiceSid;
        } else if (fromNumber && fromNumber.startsWith('MG')) {
            params.MessagingServiceSid = fromNumber;
        } else {
            params.From = fromNumber;
        }

        const postData = querystring.stringify(params);

        const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': auth
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    logger.info('[sms] Twilio API response', { statusCode: res.statusCode });
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        reject(new Error(`Twilio request failed: ${body}`));
                    }
                });
            });

            req.on('error', (e) => {
                logger.error('[sms] Twilio request error', { error: e.message });
                reject(e);
            });

            req.write(postData);
            req.end();
        });
    } else {
        // Console mode (Default)
        console.log(`[SMS DEV MODE] Mobile: ${formattedMobile}, OTP: ${otp}`);
        logger.info(`[SMS DEV MODE] Logged OTP for ${formattedMobile}: ${otp}`);
        return Promise.resolve();
    }
};

module.exports = { sendSMS };
