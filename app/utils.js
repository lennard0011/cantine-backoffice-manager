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
		const name = obj["Naam initirende partij"];
		const date = obj["Rentedatum"];
		return [amount, name, date];
	});
}

function parseConsumptionData(sheetData) {
	if (!sheetData || sheetData.length < 2) return [];

	const headers = sheetData[0];
	const topic1 = headers[5] || "Soda";
	const topic2 = headers[6] || "Beer";

	const result = [];
	for (let i = 1; i < sheetData.length; i++) {
		const row = sheetData[i];
		const name = row[1]; // Column B
		if (name) {
			result.push({
				name: name,
				usage: {
					[topic1]: row[5] || "0",
					[topic2]: row[6] || "0",
				},
			});
		}
	}
	return result;
}

function fillInTemplateFromObject(template, data) {
	let template_string = JSON.stringify(template);

	Object.entries(data).forEach(([key, value]) => {
		if (typeof value === "function") {
			value = value(data);
		}
		if (key !== "") {
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
		returnString += `U hebt teveel betaald. Je mag een betaalverzoek sturen ter waarde van ${balance}. Doet u dit niet, dan wordt het verekend met de volgende keer.`;
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
		? paymentLink
		: "Dit is een update van uw saldo. Geen betaling vereist op dit moment.";
}

function extractPaymentLinkFromTemplate(templateText) {
	const match = templateText.match(PAYMENT_LINK_PATTERN);
	return match ? match[1] : "https://betaalverzoek.rabobank.nl";
}

function formatConsumptionInfo(userName, consumptionData) {
	if (!consumptionData || consumptionData.length === 0) return "";

	const userRow = consumptionData.find((row) => row.name === userName);
	if (!userRow) return "";

	const items = [];
	for (const [topic, usage] of Object.entries(userRow.usage)) {
		if (usage && usage !== "0") {
			items.push(`${topic}: ${usage}`);
		}
	}
	return items.length > 0 ? items.join(", ") : "";
}
