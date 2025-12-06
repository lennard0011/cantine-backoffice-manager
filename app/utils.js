// Pure utility functions extracted for testing

export function dateStringToDate(dateString) {
	const dateParts = dateString.split("-");
	const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
	return date;
}

export function rowsToObject(row, headers) {
	const obj = {};
	for (let j = 0; j < headers.length; j++) {
		obj[headers[j]] = row[j] !== undefined ? row[j] : "";
	}
	return obj;
}

export function parseObjectsToSheetData(objects) {
	return objects.map((obj) => {
		const amount = obj["Bedrag"];
		const name = obj["Naam initirende partij"];
		const date = obj["Rentedatum"];
		return [amount, name, date];
	});
}

export function fillInTemplateFromObject(template, data) {
	let template_string = JSON.stringify(template);

	Object.entries(data).forEach(([key, value]) => {
		if (typeof value === "function") {
			value = value(data);
		}
		template_string = template_string.replaceAll("$" + key, value);
	});

	return JSON.parse(template_string);
}

export function shouldSendPaymentRequest(row) {
	return row["E-mailadress"].includes("@") && row["Totaal"] !== "€ 0,00";
}

export function shouldSendReminder(row, emailColumn, currentDate) {
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

export function shouldSendConfirmation(user) {
	return user["Bedrag voldaan"] === "TRUE" && !user["Confirmation Email Sent"];
}

export function getConditionalMailAddition(user) {
	let returnString = "";
	if (user["Resterende"].includes("-")) {
		const balance = user["Resterende"].replace("-", "");
		returnString += `U hebt teveel betaald. Je mag een betaalverzoek sturen ter waarde van ${balance}. Doet u dit niet, dan wordt het verekend met de volgende keer.`;
	}
	return returnString;
}

export function shouldIncludePaymentLink(amountString) {
	const amount = parseFloat(
		amountString.replace("€", "").trim().replace(",", "."),
	);
	return amount >= 20;
}

export function getPaymentLinkText(user) {
	const shouldInclude = shouldIncludePaymentLink(user["Totaal"]);
	return shouldInclude
		? ""
		: "Dit is een update van uw saldo. Geen betaling vereist op dit moment.";
}
