const RECIPIENT_COL = "E-mailadress";
const EMAIL_SENT_COL = "Email Sent";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Mail Merge')
    .addItem('Send Emails', 'sendPaymentEmails')
    .addItem('Send Confirmation Email', 'sendConfirmEmail')
    .addItem('Send Reminder Email', 'sendReminderEmail')
    .addItem('Handle transactions', 'importCsvFilesFromFolder')
    .addToUi();
}

function sendPaymentEmails() {
  sendEmails('Betaalverzoek Shawano\'s Bar', undefined, undefined, undefined, [{ 'PAYMENT_INFO': getPaymentLinkText }])
}

function sendEmails(subjectLine, sheet = SpreadsheetApp.getActive().getSheetByName('Leden'), emailColumn = EMAIL_SENT_COL, userFilter = (row) => true, conditionalMailAddition = [], reminder) {
  if (!subjectLine) {
    subjectLine = Browser.inputBox("Mail Merge",
      "Type or copy/paste the subject line of the Gmail " +
      "draft message you would like to mail merge with:",
      Browser.Buttons.OK_CANCEL);

    if (subjectLine === "cancel" || subjectLine == "") {
      return;
    }
  }

  const emailTemplate = getGmailTemplateFromDrafts_(subjectLine);
  const dataRange = sheet.getDataRange();
  const data = dataRange.getDisplayValues();
  const heads = data.shift();
  const emailSentColIdx = heads.indexOf(emailColumn);
  const obj = data.map(r => (heads.reduce((o, k, i) => (o[k] = r[i] || '', o), {})));
  const out = [];

  obj.forEach(function (row, rowIdx) {
    conditionalMailAddition.forEach(element => {
      row = { ...row, ...element }
    })

    if (!row['E-mailadress'].includes('@') || row['Totaal'] === '€ 0,00' || !userFilter(row)) {
      out.push([row[emailColumn]]);
      return;
    }

    if (reminder && !shouldSendReminder(row, emailColumn, new Date())) {
      out.push([row[emailColumn]]);
      return;
    }

    try {
      const msgObj = fillInTemplateFromObject(emailTemplate.message, row);

      GmailApp.sendEmail(row[RECIPIENT_COL], msgObj.subject, msgObj.text, {
        htmlBody: msgObj.html,
        attachments: emailTemplate.attachments,
        inlineImages: emailTemplate.inlineImages
      });
      out.push([new Date()]);

    } catch (e) {
      out.push([e.message]);
    }
  });

  sheet.getRange(2, emailSentColIdx + 1, out.length).setValues(out);

  function getGmailTemplateFromDrafts_(subject_line) {
    try {
      const drafts = GmailApp.getDrafts();
      const draft = drafts.filter(subjectFilter_(subject_line))[0];
      const msg = draft.getMessage();
      const allInlineImages = draft.getMessage().getAttachments({ includeInlineImages: true, includeAttachments: false });
      const attachments = draft.getMessage().getAttachments({ includeInlineImages: false });
      const htmlBody = msg.getBody();
      const img_obj = allInlineImages.reduce((obj, i) => (obj[i.getName()] = i, obj), {});
      const imgexp = RegExp('<img.*?src="cid:(.*?)".*?alt="(.*?)"[^\\>]+>', 'g');
      const matches = [...htmlBody.matchAll(imgexp)];
      const inlineImagesObj = {};
      matches.forEach(match => inlineImagesObj[match[1]] = img_obj[match[2]]);

      return {
        message: { subject: subject_line, text: msg.getPlainBody(), html: htmlBody },
        attachments: attachments, inlineImages: inlineImagesObj
      };
    } catch (e) {
      throw new Error("Oops - can't find Gmail draft");
    }

    function subjectFilter_(subject_line) {
      return function (element) {
        if (element.getMessage().getSubject() === subject_line) {
          return element;
        }
      }
    }
  }
}

function sendConfirmEmail() {
  sendEmails('Bevestiging betaling Shawano\'s Bar', undefined, 'Confirmation Email Sent', shouldSendConfirmation, [{ 'HAS_NEGATIVE_BALANCE': getConditionalMailAddition }])
}

function sendReminderEmail() {
  sendEmails('Herinnering Betaalverzoek Shawano\'s Bar', undefined, undefined, undefined, [{ 'PAYMENT_INFO': getPaymentLinkText }], true)
}
