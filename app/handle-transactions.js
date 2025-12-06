function importCsvFilesFromFolder() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const paymentsSheet = ss.getSheetByName("Inkomende betalingen");

	if (!paymentsSheet) {
		SpreadsheetApp.getUi().alert(
			"Fout",
			'Het tabblad "Inkomende betalingen" is niet gevonden. Zorg ervoor dat het tabblad bestaat.',
			SpreadsheetApp.getUi().ButtonSet.OK,
		);
		return;
	}

	const folderName = "Transacties";
	let folder = null;

	const folders = DriveApp.getFoldersByName(folderName);
	if (folders.hasNext()) {
		folder = folders.next();
	} else {
		SpreadsheetApp.getUi().alert(
			"Fout",
			`De map "${folderName}" is niet gevonden. Zorg ervoor dat de map bestaat en zich in dezelfde Google Drive bevindt als dit script.`,
			SpreadsheetApp.getUi().ButtonSet.OK,
		);
		return;
	}

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
			SpreadsheetApp.getUi().alert(
				"Fout bij verwerken bestand",
				`Er is een fout opgetreden bij het verwerken van bestand '${fileName}': ${e.message}`,
				SpreadsheetApp.getUi().ButtonSet.OK,
			);
		}
	}

	const sheetData = parseObjectsToSheetData(allData);
	setSheetDataInSheet(paymentsSheet, sheetData);
}

function setSheetDataInSheet(paymentsSheet, sheetData) {
	if (sheetData.length > 0) {
		paymentsSheet
			.getRange(2, 1, sheetData.length, sheetData[0].length)
			.setValues(sheetData);
		SpreadsheetApp.getUi().alert(
			"Klaar",
			'Alle CSV-bestanden zijn geïmporteerd en in het tabblad "Betalingen" geplakt.',
			SpreadsheetApp.getUi().ButtonSet.OK,
		);
	} else {
		SpreadsheetApp.getUi().alert(
			"Geen bestanden",
			`Geen CSV-bestanden gevonden in de map "${folderName}" of de bestanden bevatten geen gegevens.`,
			SpreadsheetApp.getUi().ButtonSet.OK,
		);
	}
}
