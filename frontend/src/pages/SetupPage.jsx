import { useState } from "react";
import { ShieldCheck, Store } from "lucide-react";
import { api, setAuthToken } from "../api.js";
import { Button } from "../components/Button.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Input } from "../components/Input.jsx";

export function SetupPage(props) {
  const [username, setUsername] = useState("owner");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  async function handleSubmit(event) {
    if (event) {
      event.preventDefault();
    }
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedUsername) {
      setErrorBanner("Owner username is required");
      return;
    }
    if (!trimmedFullName) {
      setErrorBanner("Owner full name is required");
      return;
    }
    if (!pin || pin.length < 4 || pin.length > 8) {
      setErrorBanner("PIN must be between 4 and 8 digits");
      return;
    }
    if (pin !== confirmPin) {
      setErrorBanner("PIN confirmation does not match");
      return;
    }

    setSubmitting(true);
    setErrorBanner("");

    try {
      const result = await api.setupInitialOwner({
        username: trimmedUsername,
        full_name: trimmedFullName,
        pin: pin
      });
      setAuthToken(result.token);
      if (props.onSetupSuccess) {
        props.onSetupSuccess(result.user, result.token);
      }
    } catch (error) {
      setErrorBanner(error.message || "Failed to complete setup");
    } finally {
      setSubmitting(false);
    }
  }

  let errorElement = null;
  if (errorBanner) {
    errorElement = <ErrorBanner message={errorBanner} className="mb-4" />;
  }

  let submitButtonText = "Create Store Owner Account";
  if (submitting) {
    submitButtonText = "Initializing...";
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F5F5F4] px-4 py-8 select-none">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] bg-white p-6 shadow-xs md:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-[#B9F36B] shadow-xs">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#151515]">Welcome to StoreFlow</h1>
          <p className="mt-1 text-xs text-[#777777]">
            First-time launch: Set up your initial Store Owner account and security PIN
          </p>
        </div>

        {errorElement}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <Input
            label="Owner Username"
            value={username}
            onChange={function (e) {
              setUsername(e.target.value);
            }}
            placeholder="e.g. owner"
            autoComplete="username"
            required={true}
          />

          <Input
            label="Full Name"
            value={fullName}
            onChange={function (e) {
              setFullName(e.target.value);
            }}
            placeholder="e.g. Maria Santos"
            autoComplete="name"
            required={true}
          />

          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            <Input
              label="Security PIN (4-8 digits)"
              type="password"
              inputMode="numeric"
              maxLength={8}
              mono={true}
              inputClassName="text-center tracking-widest"
              value={pin}
              onChange={function (e) {
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="••••"
              required={true}
            />
            <Input
              label="Confirm PIN"
              type="password"
              inputMode="numeric"
              maxLength={8}
              mono={true}
              inputClassName="text-center tracking-widest"
              value={confirmPin}
              onChange={function (e) {
                setConfirmPin(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="••••"
              required={true}
            />
          </div>

          <div className="rounded-xl bg-[#EEEEED]/60 border border-[#E9E9E9] p-3.5 text-xs text-[#777777]">
            <div className="flex items-center gap-1.5 font-semibold text-[#151515] mb-1">
              <ShieldCheck className="h-4 w-4 text-[#151515]" />
              <span>Owner Role Privileges</span>
            </div>
            Full store administrative access: manage inventory, profit reports, cashier accounts, and backups.
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full shadow-xs"
          >
            {submitButtonText}
          </Button>
        </form>
      </div>
    </div>
  );
}
