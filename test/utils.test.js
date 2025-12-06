import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  dateStringToDate,
  rowsToObject,
  parseObjectsToSheetData,
  fillInTemplateFromObject,
  shouldSendPaymentRequest,
  shouldSendReminder,
  shouldSendConfirmation,
  getConditionalMailAddition
} from '../app/utils.js';

describe('dateStringToDate', () => {
  it('should convert DD-MM-YYYY string to Date object', () => {
    const result = dateStringToDate('15-03-2024');
    assert.strictEqual(result.getDate(), 15);
    assert.strictEqual(result.getMonth(), 2); // 0-indexed
    assert.strictEqual(result.getFullYear(), 2024);
  });

  it('should handle single digit day and month', () => {
    const result = dateStringToDate('5-1-2024');
    assert.strictEqual(result.getDate(), 5);
    assert.strictEqual(result.getMonth(), 0);
    assert.strictEqual(result.getFullYear(), 2024);
  });
});

describe('rowsToObject', () => {
  it('should convert row array to object using headers', () => {
    const headers = ['Name', 'Email', 'Amount'];
    const row = ['John', 'john@example.com', '100'];
    const result = rowsToObject(row, headers);
    
    assert.deepStrictEqual(result, {
      Name: 'John',
      Email: 'john@example.com',
      Amount: '100'
    });
  });

  it('should handle missing values with empty strings', () => {
    const headers = ['Name', 'Email', 'Amount'];
    const row = ['John'];
    const result = rowsToObject(row, headers);
    
    assert.deepStrictEqual(result, {
      Name: 'John',
      Email: '',
      Amount: ''
    });
  });

  it('should handle empty row', () => {
    const headers = ['Name', 'Email'];
    const row = [];
    const result = rowsToObject(row, headers);
    
    assert.deepStrictEqual(result, {
      Name: '',
      Email: ''
    });
  });
});

describe('parseObjectsToSheetData', () => {
  it('should extract amount, name, and date from objects', () => {
    const objects = [
      {
        'Bedrag': '€ 50,00',
        'Naam initirende partij': 'John Doe',
        'Rentedatum': '2024-03-15'
      },
      {
        'Bedrag': '€ 25,00',
        'Naam initirende partij': 'Jane Smith',
        'Rentedatum': '2024-03-16'
      }
    ];
    
    const result = parseObjectsToSheetData(objects);
    
    assert.deepStrictEqual(result, [
      ['€ 50,00', 'John Doe', '2024-03-15'],
      ['€ 25,00', 'Jane Smith', '2024-03-16']
    ]);
  });

  it('should handle empty array', () => {
    const result = parseObjectsToSheetData([]);
    assert.deepStrictEqual(result, []);
  });
});

describe('fillInTemplateFromObject', () => {
  it('should replace template variables with data values', () => {
    const template = {
      subject: 'Hello $Name',
      text: 'Your balance is $Amount',
      html: '<p>Dear $Name, you owe $Amount</p>'
    };
    const data = {
      Name: 'John',
      Amount: '€ 50,00'
    };
    
    const result = fillInTemplateFromObject(template, data);
    
    assert.strictEqual(result.subject, 'Hello John');
    assert.strictEqual(result.text, 'Your balance is € 50,00');
    assert.strictEqual(result.html, '<p>Dear John, you owe € 50,00</p>');
  });

  it('should handle function values', () => {
    const template = {
      text: 'Message: $Message'
    };
    const data = {
      Message: (d) => `Hello ${d.Name}`,
      Name: 'John'
    };
    
    const result = fillInTemplateFromObject(template, data);
    assert.strictEqual(result.text, 'Message: Hello John');
  });

  it('should handle missing variables gracefully', () => {
    const template = {
      text: 'Hello $Name, balance: $Amount'
    };
    const data = {
      Name: 'John'
    };
    
    const result = fillInTemplateFromObject(template, data);
    assert.strictEqual(result.text, 'Hello John, balance: $Amount');
  });
});

describe('shouldSendPaymentRequest', () => {
  it('should return true for valid email and non-zero amount', () => {
    const row = {
      'E-mailadress': 'john@example.com',
      'Totaal': '€ 50,00'
    };
    assert.strictEqual(shouldSendPaymentRequest(row), true);
  });

  it('should return false for invalid email', () => {
    const row = {
      'E-mailadress': 'invalid-email',
      'Totaal': '€ 50,00'
    };
    assert.strictEqual(shouldSendPaymentRequest(row), false);
  });

  it('should return false for zero amount', () => {
    const row = {
      'E-mailadress': 'john@example.com',
      'Totaal': '€ 0,00'
    };
    assert.strictEqual(shouldSendPaymentRequest(row), false);
  });
});

describe('shouldSendReminder', () => {
  it('should return true when email sent 7+ days ago with outstanding balance', () => {
    const row = {
      'Email Sent': '01-01-2024',
      'Resterende': '€ 50,00'
    };
    const currentDate = new Date('2024-01-10');
    
    assert.strictEqual(shouldSendReminder(row, 'Email Sent', currentDate), true);
  });

  it('should return false when less than 7 days', () => {
    const row = {
      'Email Sent': '01-01-2024',
      'Resterende': '€ 50,00'
    };
    const currentDate = new Date('2024-01-05');
    
    assert.strictEqual(shouldSendReminder(row, 'Email Sent', currentDate), false);
  });

  it('should return false when balance is zero', () => {
    const row = {
      'Email Sent': '01-01-2024',
      'Resterende': '€ 0,00'
    };
    const currentDate = new Date('2024-01-10');
    
    assert.strictEqual(shouldSendReminder(row, 'Email Sent', currentDate), false);
  });

  it('should return false when balance is negative', () => {
    const row = {
      'Email Sent': '01-01-2024',
      'Resterende': '-€ 10,00'
    };
    const currentDate = new Date('2024-01-10');
    
    assert.strictEqual(shouldSendReminder(row, 'Email Sent', currentDate), false);
  });

  it('should return false when no email sent', () => {
    const row = {
      'Email Sent': '',
      'Resterende': '€ 50,00'
    };
    const currentDate = new Date('2024-01-10');
    
    assert.strictEqual(shouldSendReminder(row, 'Email Sent', currentDate), false);
  });
});

describe('shouldSendConfirmation', () => {
  it('should return true when payment completed and no confirmation sent', () => {
    const user = {
      'Bedrag voldaan': 'TRUE',
      'Confirmation Email Sent': ''
    };
    assert.strictEqual(shouldSendConfirmation(user), true);
  });

  it('should return false when payment not completed', () => {
    const user = {
      'Bedrag voldaan': 'FALSE',
      'Confirmation Email Sent': ''
    };
    assert.strictEqual(shouldSendConfirmation(user), false);
  });

  it('should return false when confirmation already sent', () => {
    const user = {
      'Bedrag voldaan': 'TRUE',
      'Confirmation Email Sent': '2024-01-01'
    };
    assert.strictEqual(shouldSendConfirmation(user), false);
  });
});

describe('getConditionalMailAddition', () => {
  it('should return message for negative balance', () => {
    const user = {
      'Resterende': '-€ 10,00'
    };
    const result = getConditionalMailAddition(user);
    assert.ok(result.includes('€ 10,00'));
    assert.ok(result.includes('teveel betaald'));
  });

  it('should return empty string for positive balance', () => {
    const user = {
      'Resterende': '€ 50,00'
    };
    const result = getConditionalMailAddition(user);
    assert.strictEqual(result, '');
  });

  it('should return empty string for zero balance', () => {
    const user = {
      'Resterende': '€ 0,00'
    };
    const result = getConditionalMailAddition(user);
    assert.strictEqual(result, '');
  });
});
