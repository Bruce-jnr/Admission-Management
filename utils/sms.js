const axios = require('axios');
require('dotenv').config();

async function sendSMS(phoneNumber, message) {
  try {
    if (!process.env.ARKSEL_APIKEY || !process.env.ARKSEL_SENDER_ID) {
      return { success: false, error: 'SMS service is not configured' };
    }
    // Format phone number to international format
    const formattedPhone = formatPhoneNumber(phoneNumber);

    const data = {
      sender: process.env.ARKSEL_SENDER_ID,
      message: message,
      recipients: [formattedPhone],
    };

    const config = {
      method: 'post',
      url: 'https://sms.arkesel.com/api/v2/sms/send',
      headers: {
        'api-key': process.env.ARKSEL_APIKEY,
      },
      data: data,
    };

    const response = await axios(config);

    if (response.data.status === 'success') {
      const messageId =
        response.data.data && response.data.data[0]
          ? response.data.data[0].id
          : 'unknown';
      const recipient =
        response.data.data && response.data.data[0]
          ? response.data.data[0].recipient
          : formattedPhone;

      console.log('SMS sent successfully:', {
        messageId: messageId,
        recipient: recipient,
      });
      return {
        success: true,
        data: response.data,
        messageId: messageId,
        recipient: recipient,
      };
    } else {
      console.error('SMS sending failed:', response.data);
      return {
        success: false,
        error: response.data.message || 'Failed to send SMS',
      };
    }
  } catch (error) {
    console.error('SMS sending failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

function formatPhoneNumber(phone) {
  if (typeof phone !== 'string') throw new TypeError('Phone number is required');
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If number starts with 0, replace with 233
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }

  // If number doesn't start with 233, add it
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }

  return cleaned;
}

module.exports = { sendSMS, formatPhoneNumber };
