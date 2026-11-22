import { useEffect, useState } from "react";
import { Delete, KeyRound, Lock, Store, User } from "lucide-react";
import { api, setAuthToken } from "../api.js";
import { Button } from "../components/Button.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Input } from "../components/Input.jsx";

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
      dotClass = dotClass + "bg-blue-500 scale-110 shadow-sm shadow-blue-500/50";
    } else {
      dotClass = dotClass + "border-2 border-slate-600 bg-transparent";
    }
    pinDots.push(<div key={index} className={dotClass} />);
  }

  let errorElement = null;
  if (errorBanner) {
    errorElement = <ErrorBanner message={errorBanner} className="mb-4" />;
  }

  let submitButtonText = "Sign In to Terminal";
  if (submitting) {
    submitButtonText = "Signing in...";
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0F111E] px-4 py-8 select-none">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#181B2C] p-6 shadow-2xl shadow-black/60 md:p-8">
        {/* Branding header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">StoreFlow</h1>
          <p className="mt-1 text-xs text-slate-400">Sign in with your staff account and PIN</p>
        </div>

        {errorElement}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-slate-400">
              Staff Username
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={function (e) {
                  setUsername(e.target.value);
                }}
                placeholder="Enter username"
                className="w-full rounded-lg border border-white/10 bg-[#0F111E] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-slate-400">
              Security PIN
            </label>
            {/* PIN Dots visualizer */}
            <div className="flex h-11 items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#0F111E] px-4">
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
                  className="flex h-12 items-center justify-center rounded-xl bg-white/5 text-lg font-bold text-white transition hover:bg-white/10 active:scale-95 active:bg-blue-600 cursor-pointer"
                >
                  {num}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleClear}
              className="flex h-12 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 cursor-pointer"
              title="Clear PIN"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={function () {
                handleKeypadPress(0);
              }}
              className="flex h-12 items-center justify-center rounded-xl bg-white/5 text-lg font-bold text-white transition hover:bg-white/10 active:scale-95 active:bg-blue-600 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="flex h-12 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 active:scale-95 cursor-pointer"
              title="Backspace"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full py-2.5 text-sm font-semibold mt-2"
          >
            {submitButtonText}
          </Button>
        </form>
      </div>
    </div>
  );
}
