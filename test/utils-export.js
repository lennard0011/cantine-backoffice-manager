// Export wrapper for testing - imports from utils.js and re-exports with ES6 syntax
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and evaluate utils.js
const utilsCode = readFileSync(
	join(__dirname, "..", "app", "utils.js"),
	"utf-8",
);
const wrappedCode = `${utilsCode}\nreturn { dateStringToDate, rowsToObject, parseObjectsToSheetData, fillInTemplateFromObject, shouldSendPaymentRequest, shouldSendReminder, shouldSendConfirmation, getConditionalMailAddition, shouldIncludePaymentLink, getPaymentLinkText };`;

const utils = new Function(wrappedCode)();

export const {
	dateStringToDate,
	rowsToObject,
	parseObjectsToSheetData,
	parseConsumptionData,
	fillInTemplateFromObject,
	shouldSendPaymentRequest,
	shouldSendReminder,
	shouldSendConfirmation,
	getConditionalMailAddition,
	shouldIncludePaymentLink,
	getPaymentLinkText,
} = utils;
