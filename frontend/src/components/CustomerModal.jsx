import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Button } from "./Button.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { FormActions } from "./FormActions.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

export function buildCustomerPayload(fields) {
  const safeFields = fields || {};
  let rawName = "";
  if (safeFields.fullName !== undefined && safeFields.fullName !== null) {
    rawName = String(safeFields.fullName);
  }
  const cleanName = rawName.trim();
  if (cleanName.length === 0) {
    throw new Error("Customer name is required");
  }

  const payload = {
    full_name: cleanName
  };

  let rawPhone = "";
  if (safeFields.phone !== undefined && safeFields.phone !== null) {
    rawPhone = String(safeFields.phone);
  }
  const cleanPhone = rawPhone.trim();
  if (cleanPhone.length > 0) {
    payload.phone = cleanPhone;
  } else {
    payload.phone = null;
  }

  let rawAddress = "";
  if (safeFields.address !== undefined && safeFields.address !== null) {
    rawAddress = String(safeFields.address);
  }
  const cleanAddress = rawAddress.trim();
  if (cleanAddress.length > 0) {
    payload.address = cleanAddress;
  } else {
    payload.address = null;
  }

  let rawLimit = "";
  if (safeFields.creditLimit !== undefined && safeFields.creditLimit !== null) {
    rawLimit = String(safeFields.creditLimit);
  }
  const cleanLimit = rawLimit.trim();
  if (cleanLimit.length > 0) {
    const parsedLimit = Number(cleanLimit);
    if (Number.isNaN(parsedLimit) || !Number.isFinite(parsedLimit) || parsedLimit < 0) {
      throw new Error("Credit limit must be a valid positive amount");
    }
    payload.credit_limit = parsedLimit;
  } else {
    payload.credit_limit = null;
  }

  if (safeFields.isActive !== undefined) {
    payload.is_active = Boolean(safeFields.isActive);
  }

  return payload;
}

export async function saveCustomerRecord(fields, existingCustomer) {
  const payload = buildCustomerPayload(fields);
  if (existingCustomer && existingCustomer.customer_id) {
    return api.updateCustomer(existingCustomer.customer_id, payload);
  }
  return api.createCustomer(payload);
}

export function CustomerModal(props) {
  const [fullName, setFullName] = useState(function initFullName() {
    if (props.customer && props.customer.full_name) {
      return props.customer.full_name;
    }
    return "";
  });
  const [phone, setPhone] = useState(function initPhone() {
    if (props.customer && props.customer.phone) {
      return props.customer.phone;
    }
    return "";
  });
  const [address, setAddress] = useState(function initAddress() {
    if (props.customer && props.customer.address) {
      return props.customer.address;
    }
    return "";
  });
  const [creditLimit, setCreditLimit] = useState(function initLimit() {
    if (props.customer && props.customer.credit_limit !== null && props.customer.credit_limit !== undefined) {
      return String(props.customer.credit_limit);
    }
    return "";
  });
  const [isActive, setIsActive] = useState(function initActive() {
    if (props.customer && props.customer.is_active !== undefined) {
      return Boolean(props.customer.is_active);
    }
    return true;
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isEdit = Boolean(props.customer && props.customer.customer_id);

  useEffect(
    function populateForm() {
      if (!props.open) {
        return;
      }
      setErrorMessage("");
      if (props.customer) {
        setFullName(props.customer.full_name || "");
        let initialPhone = "";
        if (props.customer.phone) {
          initialPhone = props.customer.phone;
        }
        setPhone(initialPhone);

        let initialAddress = "";
        if (props.customer.address) {
          initialAddress = props.customer.address;
        }
        setAddress(initialAddress);

        let initialLimit = "";
        if (props.customer.credit_limit !== null && props.customer.credit_limit !== undefined) {
          initialLimit = String(props.customer.credit_limit);
        }
        setCreditLimit(initialLimit);

        let initialActive = true;
        if (props.customer.is_active !== undefined) {
          initialActive = Boolean(props.customer.is_active);
        }
        setIsActive(initialActive);
      } else {
        setFullName("");
        setPhone("");
        setAddress("");
        setCreditLimit("");
        setIsActive(true);
      }
    },
    [props.open, props.customer]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const saved = await saveCustomerRecord(
        {
          fullName: fullName,
          phone: phone,
          address: address,
          creditLimit: creditLimit,
          isActive: isActive
        },
        props.customer
      );

      if (props.onSaved) {
        props.onSaved(saved);
      }
      props.onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  let title = "New Customer";
  let confirmLabel = "Create Customer";
  if (isEdit) {
    title = "Edit Customer";
    confirmLabel = "Save Changes";
  }

  let errorElement = null;
  if (errorMessage) {
    errorElement = <ErrorBanner message={errorMessage} className="mb-4" />;
  }

  let activeCheckboxElement = null;
  if (isEdit) {
    activeCheckboxElement = (
      <div className="flex items-center gap-3 pt-1">
        <input
          id="customer-is-active"
          type="checkbox"
          checked={isActive}
          onChange={function handleActiveChange(event) {
            setIsActive(event.target.checked);
          }}
          className="h-4 w-4 rounded border-[#E9E9E9] text-[#171717] focus:ring-[#B9F36B]/30 accent-[#171717]"
        />
        <label htmlFor="customer-is-active" className="text-xs font-medium text-[#171717] select-none">
          Active Customer (uncheck to disable without losing credit history)
        </label>
      </div>
    );
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {errorElement}

        <Input
          label="Full Name *"
          placeholder="e.g. Maria Santos"
          value={fullName}
          onChange={function handleNameChange(event) {
            setFullName(event.target.value);
          }}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <Input
            label="Phone Number"
            placeholder="e.g. 0917-123-4567"
            value={phone}
            onChange={function handlePhoneChange(event) {
              setPhone(event.target.value);
            }}
          />

          <Input
            label="Credit Limit (₱)"
            type="number"
            step="0.01"
            min="0"
            placeholder="Leave blank for no limit"
            value={creditLimit}
            onChange={function handleLimitChange(event) {
              setCreditLimit(event.target.value);
            }}
            helper="Maximum allowed outstanding balance"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#171717]">
            Address / Landmark
          </label>
          <textarea
            value={address}
            onChange={function handleAddressChange(event) {
              setAddress(event.target.value);
            }}
            placeholder="e.g. Block 4 Lot 12, Purok 2, Near Chapel"
            rows={2}
            className="w-full rounded-xl border border-[#E9E9E9] bg-white px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#777777] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors"
          />
        </div>

        {activeCheckboxElement}

        <FormActions
          onCancel={props.onClose}
          confirmLabel={confirmLabel}
          disabled={submitting}
        />
      </form>
    </Modal>
  );
}
