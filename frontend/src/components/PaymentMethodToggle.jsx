import { ArrowLeftRight, Banknote, CreditCard } from "lucide-react";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash", icon: Banknote },
  { key: "CREDIT", label: "Utang", icon: CreditCard },
  { key: "SPLIT", label: "Split", icon: ArrowLeftRight }
];

export function PaymentMethodToggle(props) {
  let visibleMethods = PAYMENT_METHODS;
  if (props.allowCredit === false) {
    visibleMethods = [PAYMENT_METHODS[0]];
  }
  return (
    <div
      role="group"
      aria-label="Payment method"
      className={"grid gap-2 " + (visibleMethods.length === 1 ? "grid-cols-1" : "grid-cols-3")}
    >
      {visibleMethods.map(function renderMethod(method) {
        const IconComponent = method.icon;
        const isSelected = props.paymentMethod === method.key;
        let buttonClass =
          "flex flex-col items-center gap-1.5 rounded-xl border py-2 text-xs font-medium cursor-pointer transition-colors ";
        if (isSelected) {
          buttonClass = buttonClass + "border-[#171717] bg-[#171717] text-white font-semibold shadow-xs";
        } else {
          buttonClass = buttonClass + "border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717]";
        }
        return (
          <button
            key={method.key}
            type="button"
            aria-pressed={isSelected}
            onClick={function selectMethod() {
              props.onChange(method.key);
            }}
            className={buttonClass}
          >
            <IconComponent className="h-4 w-4" />
            <span>{method.label}</span>
          </button>
        );
      })}
    </div>
  );
}
