@getInvoiceStatus
Feature: Get Invoice Status
  As a partner
  I want to check the status of my invoice
  So that I can know whether it has been processed successfully

  Background:
    Given a valid authenticated user for invoice status

  Scenario: Successfully get the status of an analyzed invoice
    Given an invoice "inv-123" exists with "Analyzed" status
    When the user requests status for invoice "inv-123"
    Then the response status for invoice should be 200
    And the response should contain invoice "inv-123" with status "Analyzed"

  Scenario: Successfully get the status of a processing invoice
    Given an invoice "inv-456" exists with "Processing" status
    When the user requests status for invoice "inv-456"
    Then the response status for invoice should be 200
    And the response should contain invoice "inv-456" with status "Processing"

  Scenario: Successfully get the status of a failed invoice
    Given an invoice "inv-789" exists with "Failed" status
    When the user requests status for invoice "inv-789"
    Then the response status for invoice should be 200
    And the response should contain invoice "inv-789" with status "Failed"

  Scenario: Attempt to get the status of a non-existent invoice
    Given the invoice "invalid-id" does not exist for status
    When the user requests status for invoice "invalid-id"
    Then the response status for invoice should be 404
    And the response message for invoice should be "Invoice not found"

  Scenario: Attempt to get the status of an invoice belonging to another user
    Given the invoice "other-user-inv" belongs to another user for status
    When the user requests status for invoice "other-user-inv"
    Then the response status for invoice should be 403
    And the response message for invoice should be "Forbidden: You do not have access to this invoice"

  Scenario: Attempt to get the status without authentication
    Given an unauthenticated user for invoice status
    When the user requests status for invoice "inv-123"
    Then the response status for invoice should be 401
    And the response message for invoice should be "Unauthorized: Missing credentials"