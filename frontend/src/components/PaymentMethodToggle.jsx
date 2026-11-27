import { Banknote, CreditCard } from "lucide-react";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash", icon: Banknote },
  { key: "CREDIT", label: "Utang", icon: CreditCard }
];

export function PaymentMethodToggle(props) {
  let visibleMethods = PAYMENT_METHODS;
  if (props.allowCredit === false) {
    visibleMethods = [PAYMENT_METHODS[0]];
  }
  let columnsClass = "grid-cols-2";
  if (visibleMethods.length === 1) {
    columnsClass = "grid-cols-1";
  }
  return (
    <div
      role="group"
      aria-label="Payment method"
      className={"grid gap-1 rounded-xl border border-[#E9E9E9] bg-[#F2F2F2] p-1 " + columnsClass}
    >
      {visibleMethods.map(function renderMethod(method) {
        const IconComponent = method.icon;
        const isSelected = props.paymentMethod === method.key;
        let buttonClass =
          "flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3.5 py-3 text-sm cursor-pointer transition-colors ";
        if (isSelected) {
          buttonClass = buttonClass + "bg-[#171717] text-white font-semibold shadow-xs";
        } else {
          buttonClass = buttonClass + "bg-transparent text-[#777777] font-medium hover:text-[#171717]";
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
            <IconComponent className="h-4 w-4 shrink-0" />
            <span>{method.label}</span>
          </button>
        );
      })}
    </div>
  );
}
