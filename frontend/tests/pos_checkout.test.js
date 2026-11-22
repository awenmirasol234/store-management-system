import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PosCheckoutModal } from "../src/components/PosCheckoutModal.jsx";

describe("PosCheckoutModal rendering tests", function () {
  const dummyCustomers = [
    {
      customer_id: "cust-1",
      full_name: "Mang Tomas",
      phone: "09171234567",
      current_balance: 350,
      credit_limit: 1000
    },
    {
      customer_id: "cust-2",
      full_name: "Aling Nena",
      phone: "09187654321",
      current_balance: 900,
      credit_limit: 1000
    }
  ];

  it("renders CASH checkout modal with quick bills", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CASH",
        onPaymentMethodChange: function () {},
        total: 250,
        amountPaid: "500",
        onAmountPaidChange: function () {},
        customerId: "",
        onCustomerIdChange: function () {},
        cashPart: "",
        onCashPartChange: function () {},
        changePreview: 250,
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    expect(html).toContain("Total Due");
    expect(html).toContain("Cash Tendered");
    expect(html).toContain("Change");
    expect(html).toContain("max-w-2xl");
    expect(html).toContain("grid-cols-1 md:grid-cols-2");
    expect(html).toContain("₱200.00");
  });

  it("renders CREDIT (Utang) checkout modal with customer options and credit notice", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CREDIT",
        onPaymentMethodChange: function () {},
        total: 200,
        amountPaid: "0",
        onAmountPaidChange: function () {},
        customerId: "cust-1",
        onCustomerIdChange: function () {},
        cashPart: "",
        onCashPartChange: function () {},
        changePreview: 0,
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    expect(html).toContain("Customer (Utang Account)");
    expect(html).toContain("Mang Tomas");
    expect(html).toContain("Current Utang");
    expect(html).toContain("Total Charged to Utang");
    expect(html).toContain("Projected New Utang");
  });

  it("displays warning when CREDIT purchase exceeds credit limit", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CREDIT",
        onPaymentMethodChange: function () {},
        total: 200, // Aling Nena already has 900 utang with 1000 limit -> 900 + 200 = 1100 > 1000
        amountPaid: "0",
        onAmountPaidChange: function () {},
        customerId: "cust-2",
        onCustomerIdChange: function () {},
        cashPart: "",
        onCashPartChange: function () {},
        changePreview: 0,
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    expect(html).toContain("Exceeds Credit Limit");
    expect(html).toContain("Aling Nena");
  });

  it("renders SPLIT payment with cash portion, utang portion, and tendered input", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "SPLIT",
        onPaymentMethodChange: function () {},
        total: 500,
        amountPaid: "200",
        onAmountPaidChange: function () {},
        customerId: "cust-1",
        onCustomerIdChange: function () {},
        cashPart: "200",
        onCashPartChange: function () {},
        changePreview: 0,
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    expect(html).toContain("Payment Breakdown");
    expect(html).toContain("Cash Portion");
    expect(html).toContain("Utang Portion");
    expect(html).toContain("50/50 Split");
    expect(html).toContain("Mang Tomas");
    expect(html).toContain('max="500"');
  });

  it("disables Confirm Sale button when customer is not selected for CREDIT", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CREDIT",
        onPaymentMethodChange: function () {},
        total: 500,
        amountPaid: "0",
        onAmountPaidChange: function () {},
        customerId: "",
        onCustomerIdChange: function () {},
        cashPart: "",
        onCashPartChange: function () {},
        changePreview: 0,
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    // Button should have disabled attribute
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("Confirm Sale");
  });
});
