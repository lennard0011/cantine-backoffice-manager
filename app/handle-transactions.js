/**
 * Imports all CSV files from the "Transacties" Drive folder into the
 * "Inkomende betalingen" sheet.
 *
 * @returns {{ ok: boolean, titleKey: string, message: string }}
 *   A result object describing success or the first error encountered.
 *   The caller (UI controller in main.js) is responsible for showing alerts.
 */
function importCsvFilesFromFolder() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const paymentsSheet = ss.getSheetByName("Inkomende betalingen");

	if (!paymentsSheet) {
		return {
			ok: false,
			title: "Fout",
			message:
				'Het tabblad "Inkomende betalingen" is niet gevonden. Zorg ervoor dat het tabblad bestaat.',
		};
	}

	const folderName = "Transacties";
	const folders = DriveApp.getFoldersByName(folderName);

	if (!folders.hasNext()) {
		return {
			ok: false,
			title: "Fout",
			message: `De map "${folderName}" is niet gevonden. Zorg ervoor dat de map bestaat en zich in dezelfde Google Drive bevindt als dit script.`,
		};
	}

	const folder = folders.next();
	const files = folder.getFilesByType(MimeType.CSV);
	const allData = [];
	let headers;

	while (files.hasNext()) {
		const file = files.next();
		const fileName = file.getName();
		try {
			const csvData = file.getBlob().getDataAsString();
			const rows = Utilities.parseCsv(csvData);

			for (const [index, row] of rows.entries()) {
				if (index == 0) {
					if (!headers) {
						headers = row;
					}
					continue;
				}

				const obj = rowsToObject(row, headers);
				allData.push(obj);
			}

			Logger.log(`Bestand '${fileName}' succesvol verwerkt.`);
		} catch (e) {
			return {
				ok: false,
				title: "Fout bij verwerken bestand",
				message: `Er is een fout opgetreden bij het verwerken van bestand '${fileName}': ${e.message}`,
			};
		}
	}

	const sheetData = parseObjectsToSheetData(allData);
	sheetData.sort((a, b) => {
		if (a[2] < b[2]) return -1;
		if (a[2] > b[2]) return 1;
		if (a[1] < b[1]) return -1;
		if (a[1] > b[1]) return 1;
		if (a[0] < b[0]) return -1;
		if (a[0] > b[0]) return 1;
		return 0;
	});
	return setSheetDataInSheet(paymentsSheet, sheetData);
}

function setSheetDataInSheet(paymentsSheet, sheetData) {
	if (sheetData.length === 0) {
		return {
			ok: true,
			title: "Geen bestanden",
			message:
				"Geen CSV-bestanden gevonden in de map of de bestanden bevatten geen gegevens.",
		};
	}

	paymentsSheet
		.getRange(2, 1, sheetData.length, sheetData[0].length)
		.setValues(sheetData);

	return {
		ok: true,
		title: "Klaar",
		message:
			'Alle CSV-bestanden zijn geïmporteerd en in het tabblad "Betalingen" geplakt.',
	};
}
