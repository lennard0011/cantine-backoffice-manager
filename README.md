# Cantine Backoffice Manager

A Google Apps Script solution for managing canteen/bar payments and automated email communications for Shawano's Bar.

## Features

### 📧 Email Management
- **Payment Requests**: Send automated payment request emails to members
- **Payment Confirmations**: Send confirmation emails when payments are received
- **Payment Reminders**: Automatically send reminder emails for outstanding payments (7+ days overdue)
- **Template-based**: Uses Gmail drafts as email templates with variable substitution

### 💰 Transaction Processing
- **CSV Import**: Automatically import bank transaction CSV files from Google Drive
- **Batch Processing**: Process multiple CSV files at once
- **Data Parsing**: Extract payment amount, payer name, and transaction date

## Prerequisites

- Google Account with access to:
  - Google Sheets
  - Gmail
  - Google Drive
- [clasp](https://github.com/google/clasp) (Google Apps Script CLI) for deployment

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cantine-backoffice-manager.git
   cd cantine-backoffice-manager
   ```

2. **Install clasp**
   ```bash
   npm install -g @google/clasp
   clasp login
   ```

3. **Create a new Google Sheets spreadsheet** with the following sheets:
   - `Leden` (Members) - Contains member information and payment tracking
   - `Inkomende betalingen` (Incoming Payments) - Stores imported transaction data

4. **Required columns in the "Leden" sheet**:
   - `E-mailadress` - Member email addresses
   - `Totaal` - Total amount owed
   - `Resterende` - Remaining balance
   - `Bedrag voldaan` - Payment completed (TRUE/FALSE)
   - `Email Sent` - Timestamp of last payment request email
   - `Confirmation Email Sent` - Timestamp of confirmation email

5. **Create a Google Drive folder** named `Transacties` for CSV transaction files

6. **Deploy the script**
   ```bash
   clasp push
   ```

## Usage

### Sending Emails

1. **Create Gmail drafts** with the following subject lines:
   - `Betaalverzoek Shawano's Bar` - Payment request template
   - `Bevestiging betaling Shawano's Bar` - Payment confirmation template
   - `Herinnering Betaalverzoek Shawano's Bar` - Payment reminder template

2. **Use template variables** in your drafts (e.g., `$Naam`, `$Totaal`, `$Resterende`)

3. **Access the menu** in Google Sheets: `Mail Merge` → Select desired action

### Importing Transactions

1. Upload CSV files to the `Transacties` folder in Google Drive
2. In Google Sheets: `Mail Merge` → `Handle transactions`
3. Transaction data will be imported to the "Inkomende betalingen" sheet

### Email Sending Logic

- **Payment Requests**: Sent to members with outstanding balances > €0.00
- **Confirmations**: Sent when `Bedrag voldaan` is TRUE and no confirmation sent yet
- **Reminders**: Sent if payment request was sent 7+ days ago and balance remains unpaid

## Project Structure

```
cantine-backoffice-manager/
├── app/
│   ├── main.js                  # Email sending and menu functions
│   └── handle-transactions.js   # CSV import and transaction processing
├── appsscript.json              # Apps Script configuration
├── .clasp.json                  # clasp deployment configuration
└── README.md
```

## License

MIT License - See [LICENSE](LICENSE) file for details

Copyright (c) 2025 Lennard van der Plas

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
