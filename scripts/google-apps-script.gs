function doPost(event) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('CARPOOL_EMAIL_SECRET');
  if (!expectedSecret) {
    return jsonResponse({ ok: false, error: 'Email service is not configured.' });
  }

  let request;
  try {
    request = JSON.parse(event.postData.contents);
  } catch (error) {
    return jsonResponse({ ok: false, error: 'Invalid request.' });
  }

  if (!request || request.secret !== expectedSecret) {
    return jsonResponse({ ok: false, error: 'Unauthorized request.' });
  }

  const recipient = typeof request.to === 'string' ? request.to.trim() : '';
  const subject = typeof request.subject === 'string' ? request.subject : '';
  const body = typeof request.text === 'string' ? request.text : '';
  const senderName = typeof request.senderName === 'string'
    ? request.senderName.slice(0, 100)
    : 'Student Carpool';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !subject || !body || body.length > 10000) {
    return jsonResponse({ ok: false, error: 'Invalid email fields.' });
  }

  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body,
      name: senderName
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Verification email send failed:', error.message);
    return jsonResponse({ ok: false, error: 'Google could not send the email. Check the Apps Script account and mail quota.' });
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
