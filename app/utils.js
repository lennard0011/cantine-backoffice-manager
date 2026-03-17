// Pure utility functions extracted for testing

const PAYMENT_LINK_PATTERN = /{{PAYMENT_LINK:([^}]+)}}/;

function dateStringToDate(dateString) {
	const dateParts = dateString.split("-");
	const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
	return date;
}

function rowsToObject(row, headers) {
	const obj = {};
	for (let j = 0; j < headers.length; j++) {
		obj[headers[j]] = row[j] !== undefined ? row[j] : "";
	}
	return obj;
}

function parseObjectsToSheetData(objects) {
	return objects.map((obj) => {
		const amount = obj["Bedrag"];
		const name = obj["Naam initi�rende partij"];
		const date = obj["Rentedatum"];
		return [amount, name, date];
	});
}

function fillInTemplateFromObject(template, data) {
	let template_string = JSON.stringify(template);

	Object.entries(data).forEach(([key, value]) => {
		if (typeof value === "function") {
			value = value(data);
		}
		if (key !== "" && typeof value === "string") {
			// Escape control characters for JSON
			value = value.replace(/[\n\r\t]/g, (match) => {
				switch (match) {
					case "\n":
						return "\\n";
					case "\r":
						return "\\r";
					case "\t":
						return "\\t";
					default:
						return match;
				}
			});
			template_string = template_string.replaceAll("$" + key, value);
		}
	});

	// Remove payment link pattern from final output
	template_string = template_string.replace(PAYMENT_LINK_PATTERN, "");

	return JSON.parse(template_string);
}

function shouldSendPaymentRequest(row) {
	return row["E-mailadress"].includes("@") && row["Totaal"] !== "€ 0,00";
}

function shouldSendReminder(row, emailColumn, currentDate) {
	if (
		!row[emailColumn] ||
		row["Resterende"] === "€ 0,00" ||
		row["Resterende"].includes("-")
	) {
		return false;
	}
	const emailSentDate = dateStringToDate(row[emailColumn]);
	const daysDiff = (currentDate - emailSentDate) / (24 * 60 * 60 * 1000);
	return daysDiff >= 7;
}

function shouldSendConfirmation(user) {
	return user["Bedrag voldaan"] === "TRUE" && !user["Confirmation Email Sent"];
}

function getConditionalMailAddition(user) {
	let returnString = "";
	if (user["Resterende"].includes("-")) {
		const balance = user["Resterende"].replace("-", "");
		returnString += `U hebt teveel betaald. Je mag een betaalverzoek sturen ter waarde van ${balance}. Doet u dit niet, dan wordt het verrekend met de volgende keer.`;
	}
	return returnString;
}

function shouldIncludePaymentLink(amountString) {
	const amount = parseFloat(
		amountString.replace("€", "").trim().replace(",", "."),
	);
	return amount >= 20;
}

function getPaymentLinkText(
	user,
	paymentLink = "https://betaalverzoek.rabobank.nl",
) {
	const shouldInclude = shouldIncludePaymentLink(user["Totaal"]);
	return shouldInclude
		? `Via de volgende link kunt u de betaling voldoen: ${paymentLink}.`
		: "Dit is een update van uw saldo. Geen betaling vereist op dit moment.";
}

function extractPaymentLinkFromTemplate(templateText) {
	const match = templateText.match(PAYMENT_LINK_PATTERN);
	return match ? match[1] : "https://betaalverzoek.rabobank.nl";
}
