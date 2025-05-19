Feature: Get Invoice By ID
  As a partner
  I want to retrieve an invoice by its ID
  So that I can view the details of a specific invoice

  Background:
    Given a valid authenticated user

  Scenario: Successfully retrieve an existing invoice
    Given an invoice "invoice-123" exists and belongs to the user
    When the user requests invoice with ID "invoice-123"
    Then the response status should be 200
    And the response should contain the invoice details

  Scenario: Attempt to retrieve a non-existent invoice
    Given the invoice "invalid-id" does not exist
    When the user requests invoice with ID "invalid-id"
    Then the response status should be 404
    And the response message should be "Invoice not found"

  Scenario: Attempt to retrieve an invoice belonging to another user
    Given the invoice "other-user-invoice" belongs to another user
    When the user requests invoice with ID "other-user-invoice"
    Then the response status should be 403
    And the response message should be "Unauthorized: You do not own this invoice"

  Scenario: Attempt to retrieve an invoice when not authenticated
    Given the user is not authenticated
    When the user requests invoice with ID "invoice-123"
    Then the response status should be 401
    And the response message should be "Unauthorized"