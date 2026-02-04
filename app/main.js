const RECIPIENT_COL = "E-mailadress";
const EMAIL_SENT_COL = "Email Sent";

function onOpen() {
	const ui = SpreadsheetApp.getUi();
	ui.createMenu("Automations")
		.addItem("Send Emails", "sendPaymentEmails")
		.addItem("Send Confirmation Email", "sendConfirmEmail")
		.addItem("Send Reminder Email", "sendReminderEmail")
		.addSeparator()
		.addItem("Dry Run - Payment Emails", "dryRunPaymentEmails")
		.addItem("Dry Run - Confirmation Email", "dryRunConfirmEmail")
		.addItem("Dry Run - Reminder Email", "dryRunReminderEmail")
		.addSeparator()
		.addItem("Handle transactions", "importCsvFilesFromFolder")
		.addToUi();
}

function sendPaymentEmails() {
	sendEmails(
		"Betaalverzoek Shawano's Bar",
		undefined,
		undefined,
		undefined,
		[
			{ PAYMENT_INFO: getPaymentLinkText },
			{ CONSUMPTION_INFO: getConsumptionInfo },
		],
		false,
		false,
	);
}

function dryRunPaymentEmails() {
	sendEmails(
		"Betaalverzoek Shawano's Bar",
		undefined,
		undefined,
		undefined,
		[
			{ PAYMENT_INFO: getPaymentLinkText },
			{ CONSUMPTION_INFO: getConsumptionInfo },
		],
		false,
		true,
	);
}

function getConsumptionInfo(user) {
	const lijstSheet = SpreadsheetApp.getActive().getSheetByName("Lijst");
	if (!lijstSheet) return "";

	const data = lijstSheet.getDataRange().getDisplayValues();
	const headers = data[0];
	const subHeaders = data[1];
	const userNameCol = 1; // Column B (0-indexed)
	const userData = data.find((aUser) => aUser[userNameCol] === user["Naam"]);

	// topic 1
	const consumptionData = [
		{
			topic: headers[5],
			entities: [
				{ topic: subHeaders[3], usage: userData[3], amount: userData[4] },
				{ topic: subHeaders[5], usage: userData[5], amount: userData[6] },
				{ topic: subHeaders[7], usage: userData[7], amount: userData[8] },
			],
		},
		{
			topic: headers[12],
			entities: [
				{ topic: subHeaders[10], usage: userData[10], amount: userData[11] },
				{ topic: subHeaders[12], usage: userData[12], amount: userData[13] },
				{ topic: subHeaders[14], usage: userData[14], amount: userData[15] },
			],
		},
		{
			topic: headers[19],
			entities: [
				{ topic: subHeaders[17], usage: userData[17], amount: userData[18] },
				{ topic: subHeaders[19], usage: userData[19], amount: userData[20] },
				{ topic: subHeaders[21], usage: userData[21], amount: userData[22] },
			],
		},
		{
			topic: headers[25],
			entities: [
				{ topic: subHeaders[23], usage: userData[23], amount: userData[24] },
				{ topic: subHeaders[25], usage: userData[25], amount: userData[26] },
				{ topic: subHeaders[27], usage: userData[27], amount: userData[28] },
			],
		},
		{
			topic: headers[32],
			entities: [{ topic: "", usage: 1, amount: userData[31] }],
		},
		{
			topic: headers[35],
			entities: [{ topic: "", usage: 1, amount: userData[34] }],
		},
		{
			topic: headers[38],
			entities: [{ topic: "", usage: 1, amount: userData[37] }],
		},
		{
			topic: "Vorige rekening",
			entities: [{ topic: "", usage: 1, amount: userData[43] }],
		},
	];

	return formatConsumptionInfo(consumptionData);
}

function formatConsumptionInfo(consumptionData) {
	let info = "Overzicht consumpties:\n";
	consumptionData.forEach((topicData) => {
		if (topicData.topic == "") return;

		info += `\n${topicData.topic}:\n`;
		topicData.entities.forEach((entity) => {
			if (entity.amount === "" || entity.amount === "€ 0,00") {
				info += `- ${entity.topic}: Geen consumpties.\n`;
				return;
			}
			info += `- ${entity.topic}: ${entity.usage} keer. ${entity.amount}\n`;
		});
	});
	return info;
}

function sendEmails(
	subjectLine,
	sheet = SpreadsheetApp.getActive().getSheetByName("Leden"),
	emailColumn = EMAIL_SENT_COL,
	userFilter = (row) => true,
	conditionalMailAddition = [],
	reminder,
	dryRun = false,
) {
	if (!subjectLine) {
		subjectLine = Browser.inputBox(
			"Mail Merge",
			"Type or copy/paste the subject line of the Gmail " +
				"draft message you would like to mail merge with:",
			Browser.Buttons.OK_CANCEL,
		);

		if (subjectLine === "cancel" || subjectLine == "") {
			return;
		}
	}

	const emailTemplate = getGmailTemplateFromDrafts_(subjectLine);
	const paymentLink = extractPaymentLinkFromTemplate(
		emailTemplate.message.text,
	);
	const dataRange = sheet.getDataRange();
	const data = dataRange.getDisplayValues();
	const heads = data.shift();
	const emailSentColIdx = heads.indexOf(emailColumn);
	const obj = data.map((r) =>
		heads.reduce((o, k, i) => ((o[k] = r[i] || ""), o), {}),
	);
	const out = [];

	obj.forEach((row, rowIdx) => {
		conditionalMailAddition.forEach((element) => {
			if (typeof element === "object" && element.PAYMENT_INFO) {
				row = {
					...row,
					PAYMENT_INFO: (user) => element.PAYMENT_INFO(user, paymentLink),
				};
			} else {
				row = { ...row, ...element };
			}
		});

		if (
			!row["E-mailadress"].includes("@") ||
			row["Totaal"] === "€ 0,00" ||
			!userFilter(row)
		) {
			out.push([row[emailColumn]]);
			return;
		}

		if (reminder && !shouldSendReminder(row, emailColumn, new Date())) {
			out.push([row[emailColumn]]);
			return;
		}

		try {
			const msgObj = fillInTemplateFromObject(emailTemplate.message, row);

			if (dryRun) {
				Logger.log(`[DRY RUN] Would send email to: ${row[RECIPIENT_COL]}`);
				Logger.log(`Subject: ${msgObj.subject}`);
				Logger.log(`Body: ${msgObj.text}...`);
				Logger.log("---");
				out.push([row[emailColumn]]);
			} else {
				GmailApp.sendEmail(row[RECIPIENT_COL], msgObj.subject, msgObj.text, {
					attachments: emailTemplate.attachments,
					inlineImages: emailTemplate.inlineImages,
				});
				out.push([new Date()]);
			}
		} catch (e) {
			out.push([e.message]);
		}
	});

	if (!dryRun) {
		sheet.getRange(2, emailSentColIdx + 1, out.length).setValues(out);
	} else {
		Logger.log(`[DRY RUN] Would update ${out.length} rows in sheet`);
	}

	function getGmailTemplateFromDrafts_(subject_line) {
		try {
			const drafts = GmailApp.getDrafts();
			const draft = drafts.filter(subjectFilter_(subject_line))[0];
			const msg = draft.getMessage();
			const allInlineImages = draft.getMessage().getAttachments({
				includeInlineImages: true,
				includeAttachments: false,
			});
			const attachments = draft
				.getMessage()
				.getAttachments({ includeInlineImages: false });
			const htmlBody = msg.getBody();
			const img_obj = allInlineImages.reduce(
				(obj, i) => ((obj[i.getName()] = i), obj),
				{},
			);
			const imgexp = /<img.*?src="cid:(.*?)".*?alt="(.*?)"[^>]+>/g;
			const matches = [...htmlBody.matchAll(imgexp)];
			const inlineImagesObj = {};
			matches.forEach(
				(match) => (inlineImagesObj[match[1]] = img_obj[match[2]]),
			);

			return {
				message: {
					subject: subject_line,
					text: msg.getPlainBody(),
					html: htmlBody,
				},
				attachments: attachments,
				inlineImages: inlineImagesObj,
			};
		} catch (e) {
			throw new Error("Oops - can't find Gmail draft");
		}

		function subjectFilter_(subject_line) {
			return (element) => {
				if (element.getMessage().getSubject() === subject_line) {
					return element;
				}
			};
		}
	}
}

function sendConfirmEmail() {
	sendEmails(
		"Bevestiging betaling Shawano's Bar",
		undefined,
		"Confirmation Email Sent",
		shouldSendConfirmation,
		[{ HAS_NEGATIVE_BALANCE: getConditionalMailAddition }],
		false,
		false,
	);
}

function dryRunConfirmEmail() {
	sendEmails(
		"Bevestiging betaling Shawano's Bar",
		undefined,
		"Confirmation Email Sent",
		shouldSendConfirmation,
		[{ HAS_NEGATIVE_BALANCE: getConditionalMailAddition }],
		false,
		true,
	);
}

function sendReminderEmail() {
	sendEmails(
		"Herinnering Betaalverzoek Shawano's Bar",
		undefined,
		undefined,
		undefined,
		[
			{ PAYMENT_INFO: getPaymentLinkText },
			{ CONSUMPTION_INFO: getConsumptionInfo },
		],
		true,
		false,
	);
}

function dryRunReminderEmail() {
	sendEmails(
		"Herinnering Betaalverzoek Shawano's Bar",
		undefined,
		undefined,
		undefined,
		[
			{ PAYMENT_INFO: getPaymentLinkText },
			{ CONSUMPTION_INFO: getConsumptionInfo },
		],
		true,
		true,
	);
}
