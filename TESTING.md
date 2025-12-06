# Testing Documentation

## Testing Structure

This project uses **Node.js native test runner** (available in Node.js 18+) to test Google Apps Script functions locally.

### Architecture

Since Google Apps Script functions can't be tested directly in their runtime environment, we've extracted pure functions into a separate `utils.js` module that can be tested independently.

```
app/
├── main.js                  # Google Apps Script entry points
├── handle-transactions.js   # Google Apps Script CSV import
└── utils.js                 # Pure functions (testable)

test/
├── utils.test.js            # Unit tests (27 tests)
└── integration.test.js      # Integration tests (3 tests)
```

## Test Coverage

### Unit Tests (utils.test.js)

**Date Utilities:**
- `dateStringToDate()` - Converts DD-MM-YYYY strings to Date objects
  - ✓ Standard date conversion
  - ✓ Single digit day/month handling

**Data Transformation:**
- `rowsToObject()` - Converts CSV rows to objects
  - ✓ Standard conversion with headers
  - ✓ Missing values handling
  - ✓ Empty row handling

- `parseObjectsToSheetData()` - Extracts specific fields for sheet import
  - ✓ Multi-object extraction
  - ✓ Empty array handling

**Template Processing:**
- `fillInTemplateFromObject()` - Variable substitution in email templates
  - ✓ Basic variable replacement
  - ✓ Function value evaluation
  - ✓ Missing variable handling

**Business Logic:**
- `shouldSendPaymentRequest()` - Determines if payment request should be sent
  - ✓ Valid email and non-zero amount
  - ✓ Invalid email rejection
  - ✓ Zero amount rejection

- `shouldSendReminder()` - Determines if reminder should be sent
  - ✓ 7+ days overdue with outstanding balance
  - ✓ Less than 7 days rejection
  - ✓ Zero balance rejection
  - ✓ Negative balance rejection
  - ✓ No email sent rejection

- `shouldSendConfirmation()` - Determines if confirmation should be sent
  - ✓ Payment completed without confirmation
  - ✓ Unpaid rejection
  - ✓ Already confirmed rejection

- `getConditionalMailAddition()` - Generates overpayment message
  - ✓ Negative balance message generation
  - ✓ Positive balance (no message)
  - ✓ Zero balance (no message)

### Integration Tests (integration.test.js)

**CSV Import Flow:**
- ✓ End-to-end CSV processing (parse → transform → sheet data)

**Email Sending Flow:**
- ✓ Payment request filtering
- ✓ Reminder filtering with date logic

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch
```

## Test Results

```
✓ 27 tests passed
✓ 11 test suites
✓ 0 failures
```

## Why This Approach?

1. **No Google Apps Script Runtime Required**: Tests run locally in Node.js
2. **Fast Feedback**: Tests complete in ~200ms
3. **Pure Functions**: Extracted testable logic from Google Apps Script dependencies
4. **Native Test Runner**: No external testing frameworks needed (Node.js 18+)
5. **CI/CD Ready**: Can be integrated into automated pipelines

## Limitations

Functions that directly interact with Google Apps Script APIs (SpreadsheetApp, GmailApp, DriveApp) are not tested. These include:
- `onOpen()` - Menu creation
- `sendEmails()` - Gmail integration
- `importCsvFilesFromFolder()` - Drive integration

These functions are thin wrappers around the tested utility functions and Google APIs.
