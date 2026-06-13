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

function sendConfirmEmail() {
	sendEmails(
		"Bevestiging betaling Shawano's Bar",
		undefined,
		"Confirmation Email Sent",
		shouldSendConfirmation,
		[{ HAS_NEGATIVE_BALANCE: getConditionalMailAddition }],
		false,
		false,
		true,
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
