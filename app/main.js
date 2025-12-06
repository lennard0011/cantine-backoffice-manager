const RECIPIENT_COL = "E-mailadress";
const EMAIL_SENT_COL = "Email Sent";

/** 
 * Creates the menu item "Mail Merge" for user to run scripts on drop-down.
 */
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
  function getPaymentLinkInfo(user) {
    const amountString = user['Totaal'];
    const amount = parseFloat(amountString.replace('€', '').trim().replace(',', '.'));
    return amount >= 20 ? '' : 'Dit is een update van uw saldo. Geen betaling vereist op dit moment.';
  }
  sendEmails('Betaalverzoek Shawano\'s Bar', undefined, undefined, undefined, [{ 'PAYMENT_INFO': getPaymentLinkInfo }])
}

function dateStringToDate(dateString) {
  const dateParts = dateString.split('-');
  // Create a Date object by passing year, month (0-based), and day as arguments
  const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
  return date;
}

/**
 * Sends emails from sheet data.
 * @param {string} subjectLine (optional) for the email draft message
 * @param {Sheet} sheet to read data from
*/
function sendEmails(subjectLine, sheet = SpreadsheetApp.getActive().getSheetByName('Leden'), emailColumn = EMAIL_SENT_COL, userFilter = (row) => true, conditionalMailAddition = [], reminder) {
  // option to skip browser prompt if you want to use this code in other projects
  if (!subjectLine) {
    subjectLine = Browser.inputBox("Mail Merge",
      "Type or copy/paste the subject line of the Gmail " +
      "draft message you would like to mail merge with:",
      Browser.Buttons.OK_CANCEL);

    if (subjectLine === "cancel" || subjectLine == "") {
      // If no subject line, finishes up
      return;
    }
  }

  // Gets the draft Gmail message to use as a template
  const emailTemplate = getGmailTemplateFromDrafts_(subjectLine);

  // Gets the data from the passed sheet
  const dataRange = sheet.getDataRange();
  const data = dataRange.getDisplayValues();
  const heads = data.shift();

  // Gets the index of the column named 'Email Status' (Assumes header names are unique)
  // @see http://ramblings.mcpher.com/Home/excelquirks/gooscript/arrayfunctions
  const emailSentColIdx = heads.indexOf(emailColumn);

  const obj = data.map(r => (heads.reduce((o, k, i) => (o[k] = r[i] || '', o), {})));

  const out = [];

  // Loops through all the rows of data
  obj.forEach(function (row, rowIdx) {
    // Only sends emails if email_sent cell is blank and not hidden by a filter

    conditionalMailAddition.forEach(element => {
      row = { ...row, ...element }
    })

    const amountString = row['Totaal'];
    const amount = parseFloat(amountString.replace('€', '').trim().replace(',', '.'));

    if (!row['E-mailadress'].includes('@') || row['Totaal'] === '€ 0,00' || !userFilter(row)) { // || amount < 20) {
      out.push([row[emailColumn]]);
      return;
    }

    // REMINDER MAIL if gotten email, but still open bedrag which is positive and email was 7 days ago, continue
    const currentDate = new Date();
    if (reminder && !(row[emailColumn] != '' && row['Resterende'] != '€ 0,00' && !row['Resterende'].includes('-') && currentDate - dateStringToDate(row[emailColumn]) >= (7 * 24 * 60 * 60 * 1000))) {
      out.push([row[emailColumn]]);
      return;
    }

    try {
      const msgObj = fillInTemplateFromObject_(emailTemplate.message, row);

      GmailApp.sendEmail(row[RECIPIENT_COL], msgObj.subject, msgObj.text, {
        htmlBody: msgObj.html,
        attachments: emailTemplate.attachments,
        inlineImages: emailTemplate.inlineImages
      });
      out.push([new Date()]);

    } catch (e) {
      // modify cell to record error
      out.push([e.message]);
    }

  });

  // Updates the sheet with new data
  sheet.getRange(2, emailSentColIdx + 1, out.length).setValues(out);

  /**
   * Get a Gmail draft message by matching the subject line.
   * @param {string} subject_line to search for draft message
   * @return {object} containing the subject, plain and html message body and attachments
  */
  function getGmailTemplateFromDrafts_(subject_line) {
    try {
      // get drafts
      const drafts = GmailApp.getDrafts();
      // filter the drafts that match subject line
      const draft = drafts.filter(subjectFilter_(subject_line))[0];
      // get the message object
      const msg = draft.getMessage();

      // Handles inline images and attachments so they can be included in the merge
      // Based on https://stackoverflow.com/a/65813881/1027723
      // Gets all attachments and inline image attachments
      const allInlineImages = draft.getMessage().getAttachments({ includeInlineImages: true, includeAttachments: false });
      const attachments = draft.getMessage().getAttachments({ includeInlineImages: false });
      const htmlBody = msg.getBody();

      // Creates an inline image object with the image name as key 
      // (can't rely on image index as array based on insert order)
      const img_obj = allInlineImages.reduce((obj, i) => (obj[i.getName()] = i, obj), {});

      //Regexp searches for all img string positions with cid
      const imgexp = RegExp('<img.*?src="cid:(.*?)".*?alt="(.*?)"[^\>]+>', 'g');
      const matches = [...htmlBody.matchAll(imgexp)];

      //Initiates the allInlineImages object
      const inlineImagesObj = {};
      // built an inlineImagesObj from inline image matches
      matches.forEach(match => inlineImagesObj[match[1]] = img_obj[match[2]]);

      return {
        message: { subject: subject_line, text: msg.getPlainBody(), html: htmlBody },
        attachments: attachments, inlineImages: inlineImagesObj
      };
    } catch (e) {
      throw new Error("Oops - can't find Gmail draft");
    }

    /**
     * Filter draft objects with the matching subject linemessage by matching the subject line.
     * @param {string} subject_line to search for draft message
     * @return {object} GmailDraft object
    */
    function subjectFilter_(subject_line) {
      return function (element) {
        if (element.getMessage().getSubject() === subject_line) {
          return element;
        }
      }
    }
  }

  /**
   * Fill template string with data object
   * @see https://stackoverflow.com/a/378000/1027723
   * @param {string} template string containing {{}} markers which are replaced with data
   * @param {object} data object used to replace {{}} markers
   * @return {object} message replaced with data
  */
  function fillInTemplateFromObject_(template, data) {
    // We have two templates one for plain text and the html body
    // Stringifing the object means we can do a global replace
    let template_string = JSON.stringify(template);

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'function') {
        value = value(data);
      }
      template_string = template_string.replaceAll('$' + key, value);
    })

    return JSON.parse(template_string);
  }

  /**
   * Escape cell data to make JSON safe
   * @see https://stackoverflow.com/a/9204218/1027723
   * @param {string} str to escape JSON special characters from
   * @return {string} escaped string
  */
  function escapeData_(str) {
    return str
      .replace(/[\\]/g, '\\\\')
      .replace(/[\"]/g, '\\\"')
      .replace(/[\/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t');
  };
}

function sendConfirmEmail() {
  function userPaid(user) {
    return user['Bedrag voldaan'] == "TRUE" && !user['Confirmation Email Sent'];
  }
  function conditionalMailAddition(user) {
    let returnString = '';
    if (user['Resterende'].includes('-')) {
      const balance = user['Resterende'].replace('-', '')
      returnString += `U hebt teveel betaald. Je mag een betaalverzoek sturen ter waarde van ${balance}. Doet u dit niet, dan wordt het verekend met de volgende keer.`;
    }
    return returnString;
  }

  sendEmails('Bevestiging betaling Shawano\'s Bar', undefined, 'Confirmation Email Sent', userPaid, [{ 'HAS_NEGATIVE_BALANCE': conditionalMailAddition }])
}

function sendReminderEmail() {
  function getPaymentLinkInfo(user) {
    const amountString = user['Totaal'];
    const amount = parseFloat(amountString.replace('€', '').trim().replace(',', '.'));
    return amount >= 20 ? '' : 'Dit is een update van uw saldo. Geen betaling vereist op dit moment.';
  }
  sendEmails('Herinnering Betaalverzoek Shawano\'s Bar', undefined, undefined, undefined, [{ 'PAYMENT_INFO': getPaymentLinkInfo }], true)
}
