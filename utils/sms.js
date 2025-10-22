const axios = require('axios');
require('dotenv').config();

async function sendSMS(phoneNumber, message) {
  try {
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
        'Content-Type': 'application/json',
      },
      data: data,
    };

    const response = await axios(config);

    if (response.data.status === 'success') {
      console.log('SMS sent successfully:', {
        messageId: response.data.message_id,
        recipient: formattedPhone,
      });
      return {
        success: true,
        data: response.data,
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

module.exports = { sendSMS };
