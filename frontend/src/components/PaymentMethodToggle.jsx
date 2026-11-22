import { Banknote, CreditCard } from "lucide-react";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash", icon: Banknote },
  { key: "CREDIT", label: "Utang", icon: CreditCard }
];

export function PaymentMethodToggle(props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PAYMENT_METHODS.map(function renderMethod(method) {
        const IconComponent = method.icon;
        const isSelected = props.paymentMethod === method.key;
        let buttonClass =
          "flex flex-col items-center gap-1.5 rounded-xl border py-2 text-xs font-medium cursor-pointer transition-colors ";
        if (isSelected) {
          buttonClass = buttonClass + "border-[#151515] bg-[#151515] text-white font-semibold shadow-xs";
        } else {
          buttonClass = buttonClass + "border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515]";
        }
        return (
          <button
            key={method.key}
            type="button"
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
