import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatPeso, formatSmartDateTime } from "../format.js";
import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";
import { DataTable } from "./DataTable.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { Modal } from "./Modal.jsx";

export function CustomerLedgerModal(props) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const customer = props.customer;

  useEffect(
    function fetchTransactions() {
      if (!props.open || !customer || !customer.customer_id) {
        return;
      }
      let isCancelled = false;
      setLoading(true);
      setErrorMessage("");

      async function loadHistory() {
        try {
          const list = await api.listCreditTransactions(customer.customer_id, 50);
          if (!isCancelled) {
            setTransactions(list || []);
          }
        } catch (error) {
          if (!isCancelled) {
            setErrorMessage(error.message);
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      }

      loadHistory();
      return function cleanup() {
        isCancelled = true;
      };
    },
    [props.open, customer]
  );

  let customerName = "Customer";
  let currentBalance = 0;
  let creditLimitDisplay = "No limit";
  if (customer) {
    if (customer.full_name) {
      customerName = customer.full_name;
    }
    if (customer.current_balance !== undefined && customer.current_balance !== null) {
      currentBalance = customer.current_balance;
    }
    if (customer.credit_limit !== undefined && customer.credit_limit !== null) {
      creditLimitDisplay = formatPeso(customer.credit_limit);
    }
  }

  let errorElement = null;
  if (errorMessage) {
    errorElement = <ErrorBanner message={errorMessage} className="mb-4" />;
  }

  let contentElement = null;
  if (loading) {
    contentElement = (
      <div className="flex h-48 items-center justify-center text-sm text-[#777777]">
        Loading transaction ledger...
      </div>
    );
  } else if (transactions.length === 0) {
    contentElement = (
      <EmptyState
        message="No charges or payments have been recorded for this customer."
        padding="sm"
      />
    );
  } else {
    const headRow = (
      <tr>
        <th className="px-4 py-3">Date & Time</th>
        <th className="px-4 py-3">Type</th>
        <th className="px-4 py-3 text-right">Amount</th>
        <th className="px-4 py-3">Cashier</th>
        <th className="px-4 py-3">Remarks / Details</th>
      </tr>
    );

    contentElement = (
      <div className="overflow-x-auto rounded-xl border border-[#E9E9E9]">
        <DataTable headRow={headRow} stickyHead={true}>
          {transactions.map(function renderTxRow(tx) {
            let badgeTone = "neutral";
            let badgeLabel = tx.type;
            let amountClass = "font-mono font-semibold ";
            let amountDisplay = formatPeso(tx.amount);

            if (tx.type === "CHARGE") {
              badgeTone = "amber";
              badgeLabel = "Utang Charge";
              amountClass = amountClass + "text-rose-600";
              amountDisplay = "+" + formatPeso(tx.amount);
            } else if (tx.type === "PAYMENT") {
              badgeTone = "green";
              badgeLabel = "Payment";
              amountClass = amountClass + "text-emerald-600";
              amountDisplay = "-" + formatPeso(tx.amount);
            } else if (tx.type === "RETURN_ADJUSTMENT") {
              badgeTone = "blue";
              badgeLabel = "Return Refund";
              amountClass = amountClass + "text-blue-600";
              amountDisplay = "-" + formatPeso(tx.amount);
            }

            let remarksDisplay = "-";
            if (tx.remarks && tx.remarks.trim().length > 0) {
              remarksDisplay = tx.remarks;
            } else if (tx.sale_id) {
              remarksDisplay = "Sale: " + tx.sale_id;
            }

            let cashierDisplay = tx.created_by;
            if (!cashierDisplay) {
              cashierDisplay = "staff";
            }

            return (
              <tr key={tx.credit_tx_id} className="hover:bg-[#EEEEED]/50 transition-colors">
                <td className="px-4 py-3 text-xs text-[#151515] whitespace-nowrap">
                  {formatSmartDateTime(tx.created_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge tone={badgeTone}>{badgeLabel}</Badge>
                </td>
                <td className={"px-4 py-3 text-right text-xs whitespace-nowrap " + amountClass}>
                  {amountDisplay}
                </td>
                <td className="px-4 py-3 text-xs text-[#777777] whitespace-nowrap">
                  {cashierDisplay}
                </td>
                <td className="px-4 py-3 text-xs text-[#777777] max-w-xs truncate">
                  {remarksDisplay}
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    );
  }

  let balanceValueClass = "font-mono text-base font-bold text-[#151515]";
  if (currentBalance > 0) {
    balanceValueClass = "font-mono text-base font-bold text-rose-600";
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Customer Credit Ledger" size="xl">
      <div className="space-y-4">
        {/* Customer Balance Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-4">
          <div>
            <div className="text-xs font-semibold text-[#777777]">Customer</div>
            <div className="text-base font-bold text-[#151515]">{customerName}</div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs font-semibold text-[#777777]">Credit Limit</div>
              <div className="font-mono text-sm font-bold text-[#151515]">{creditLimitDisplay}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#777777]">Current Utang</div>
              <div className={balanceValueClass}>
                {formatPeso(currentBalance)}
              </div>
            </div>
          </div>
        </div>

        {errorElement}

        {contentElement}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
