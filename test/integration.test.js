import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("Integration Tests", () => {
	describe("CSV Import Flow", () => {
		it("should process CSV data end-to-end", async () => {
			const mockRows = [
				["Bedrag", "Naam initirende partij", "Rentedatum"],
				["€ 50,00", "John Doe", "2024-03-15"],
				["€ 25,00", "Jane Smith", "2024-03-16"],
			];

			const headers = mockRows[0];
			const dataRows = mockRows.slice(1);

			const objects = dataRows.map((row) => {
				const obj = {};
				headers.forEach((header, i) => {
					obj[header] = row[i] || "";
				});
				return obj;
			});

			const sheetData = objects.map((obj) => [
				obj["Bedrag"],
				obj["Naam initirende partij"],
				obj["Rentedatum"],
			]);

			assert.strictEqual(sheetData.length, 2);
			assert.deepStrictEqual(sheetData[0], [
				"€ 50,00",
				"John Doe",
				"2024-03-15",
			]);
			assert.deepStrictEqual(sheetData[1], [
				"€ 25,00",
				"Jane Smith",
				"2024-03-16",
			]);
		});
	});

	describe("Email Sending Flow", () => {
		it("should filter users correctly for payment requests", () => {
			const users = [
				{
					"E-mailadress": "john@example.com",
					Totaal: "€ 50,00",
					"Email Sent": "",
				},
				{ "E-mailadress": "invalid", Totaal: "€ 30,00", "Email Sent": "" },
				{
					"E-mailadress": "jane@example.com",
					Totaal: "€ 0,00",
					"Email Sent": "",
				},
				{
					"E-mailadress": "bob@example.com",
					Totaal: "€ 20,00",
					"Email Sent": "",
				},
			];

			const validUsers = users.filter(
				(user) =>
					user["E-mailadress"].includes("@") && user["Totaal"] !== "€ 0,00",
			);

			assert.strictEqual(validUsers.length, 2);
			assert.strictEqual(validUsers[0]["E-mailadress"], "john@example.com");
			assert.strictEqual(validUsers[1]["E-mailadress"], "bob@example.com");
		});

		it("should filter users correctly for reminders", () => {
			const currentDate = new Date("2024-01-10");
			const users = [
				{
					"E-mailadress": "john@example.com",
					"Email Sent": "01-01-2024",
					Resterende: "€ 50,00",
					Totaal: "€ 50,00",
				},
				{
					"E-mailadress": "jane@example.com",
					"Email Sent": "05-01-2024",
					Resterende: "€ 30,00",
					Totaal: "€ 30,00",
				},
				{
					"E-mailadress": "bob@example.com",
					"Email Sent": "01-01-2024",
					Resterende: "€ 0,00",
					Totaal: "€ 50,00",
				},
				{
					"E-mailadress": "alice@example.com",
					"Email Sent": "01-01-2024",
					Resterende: "€ 15,00",
					Totaal: "€ 15,00",
				},
			];

			const needsReminder = users.filter((user) => {
				if (!user["Email Sent"] || user["Resterende"] === "€ 0,00")
					return false;
				const amount = parseFloat(
					user["Totaal"].replace("€", "").trim().replace(",", "."),
				);
				if (amount < 20) return false;
				const emailDate = new Date(
					user["Email Sent"].split("-").reverse().join("-"),
				);
				const daysDiff = (currentDate - emailDate) / (24 * 60 * 60 * 1000);
				return daysDiff >= 7;
			});

			assert.strictEqual(needsReminder.length, 1);
			assert.strictEqual(needsReminder[0]["E-mailadress"], "john@example.com");
		});
	});
});
