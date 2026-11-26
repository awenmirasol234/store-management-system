import { useEffect, useState } from "react";
import { Delete, Store, User } from "lucide-react";
import { api, setAuthToken } from "../api.js";
import { Button } from "../components/Button.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";

export function LoginPage(props) {
  const [username, setUsername] = useState("owner");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  function handleKeypadPress(digit) {
    if (pin.length < 8) {
      setPin(pin + String(digit));
      setErrorBanner("");
    }
  }

  function handleBackspace() {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorBanner("");
    }
  }

  function handleClear() {
    setPin("");
    setErrorBanner("");
  }

  async function handleSubmit(event) {
    if (event) {
      event.preventDefault();
    }
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorBanner("Please enter your staff username");
      return;
    }
    if (!pin || pin.length < 4) {
      setErrorBanner("Please enter a PIN with at least 4 digits");
      return;
    }

    setSubmitting(true);
    setErrorBanner("");

    try {
      const result = await api.login({
        username: trimmedUsername,
        pin: pin
      });
      setAuthToken(result.token);
      if (props.onLoginSuccess) {
        props.onLoginSuccess(result.user, result.token);
      }
    } catch (error) {
      setErrorBanner(error.message || "Failed to sign in");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(
    function handleKeyDown() {
      function onKeyDown(event) {
        let activeTag = "";
        if (document.activeElement) {
          activeTag = document.activeElement.tagName;
        }
        if (activeTag === "INPUT") {
          if (event.key === "Enter") {
            handleSubmit();
          }
          return;
        }

        if (event.key >= "0" && event.key <= "9") {
          handleKeypadPress(event.key);
        } else if (event.key === "Backspace") {
          handleBackspace();
        } else if (event.key === "Enter") {
          handleSubmit();
        } else if (event.key === "Escape") {
          handleClear();
        }
      }

      window.addEventListener("keydown", onKeyDown);
      return function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
      };
    },
    [username, pin]
  );

  let pinDots = [];
  const maxDots = Math.max(4, pin.length);
  for (let index = 0; index < maxDots; index = index + 1) {
    const isFilled = index < pin.length;
    let dotClass = "h-3.5 w-3.5 rounded-full transition-all ";
    if (isFilled) {
      dotClass = dotClass + "bg-[#171717] scale-110 shadow-xs";
    } else {
      dotClass = dotClass + "border-2 border-[#E9E9E9] bg-white";
    }
    pinDots.push(<div key={index} className={dotClass} />);
  }

  let errorElement = null;
  if (errorBanner) {
    errorElement = <ErrorBanner message={errorBanner} className="mb-4" />;
  }

  let submitButtonText = "Sign In";
  if (submitting) {
    submitButtonText = "Signing in...";
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F5F5F4] px-4 py-8 select-none">
      <div className="w-full max-w-sm rounded-2xl border border-[#E9E9E9] bg-white p-6 shadow-sm md:p-8">
        {/* Branding header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-[#B9F36B] shadow-xs">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#171717]">Duane Store</h1>
          <p className="mt-1 text-xs text-[#777777]">Sign in with your staff account and PIN</p>
        </div>

        {errorElement}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-staff-username"
              className="mb-1.5 block text-2xs font-semibold uppercase tracking-wider text-[#777777]"
            >
              Staff Username
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#777777]">
                <User className="h-4 w-4" />
              </div>
              <input
                id="login-staff-username"
                type="text"
                value={username}
                onChange={function (e) {
                  setUsername(e.target.value);
                }}
                placeholder="Enter username"
                className="w-full rounded-xl border border-[#E9E9E9] bg-white py-2.5 pl-10 pr-3.5 text-sm font-medium text-[#171717] placeholder:text-[#777777] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="block text-2xs font-semibold uppercase tracking-wider text-[#777777]">
                Security PIN
              </span>
              <span className="font-mono text-3xs text-[#777777]">4–8 digits</span>
            </div>
            {/* PIN Dots visualizer */}
            <div
              role="status"
              aria-label={"Security PIN: " + String(pin.length) + " digits entered"}
              className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#E9E9E9] bg-[#F5F5F4] px-4"
            >
              {pinDots}
            </div>
          </div>

          {/* On-screen Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(function renderNumKey(num) {
              return (
                <button
                  key={num}
                  type="button"
                  onClick={function () {
                    handleKeypadPress(num);
                  }}
                  className="btn-glossy btn-glossy-secondary flex h-13 items-center justify-center rounded-xl border border-[#E9E9E9] bg-white font-mono text-xl font-bold text-[#171717] shadow-xs hover:border-[#171717] hover:bg-[#EEEEED] active:scale-95 active:bg-[#171717] active:text-white transition-all cursor-pointer select-none"
                >
                  {num}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleClear}
              className="btn-glossy btn-glossy-secondary flex h-13 items-center justify-center rounded-xl border border-[#E9E9E9] bg-white text-xs font-semibold text-[#777777] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all cursor-pointer select-none"
              title="Clear PIN"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={function () {
                handleKeypadPress(0);
              }}
              className="btn-glossy btn-glossy-secondary flex h-13 items-center justify-center rounded-xl border border-[#E9E9E9] bg-white font-mono text-xl font-bold text-[#171717] shadow-xs hover:border-[#171717] hover:bg-[#EEEEED] active:scale-95 active:bg-[#171717] active:text-white transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="btn-glossy btn-glossy-secondary flex h-13 items-center justify-center rounded-xl border border-[#E9E9E9] bg-white text-[#777777] hover:border-[#171717] hover:bg-[#EEEEED] hover:text-[#171717] active:scale-95 transition-all cursor-pointer select-none"
              title="Backspace"
              aria-label="Backspace"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full mt-2 font-bold shadow-xs"
          >
            {submitButtonText}
          </Button>

          <p className="pt-2 text-center font-mono text-3xs text-[#777777]">
            Press Enter to sign in • Esc to clear
          </p>
        </form>
      </div>
    </div>
  );
}
