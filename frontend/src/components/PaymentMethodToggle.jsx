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
          "flex flex-col items-center gap-1.5 rounded-lg border py-2 text-xs font-medium cursor-pointer ";
        if (isSelected) {
          buttonClass = buttonClass + "border-blue-600 bg-blue-50 text-blue-700 font-semibold";
        } else {
          buttonClass = buttonClass + "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
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
