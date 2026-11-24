import { ArrowLeftRight, Banknote, CreditCard } from "lucide-react";

const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash", icon: Banknote },
  { key: "CREDIT", label: "Utang", icon: CreditCard },
  { key: "SPLIT", label: "Split", icon: ArrowLeftRight }
];

export function PaymentMethodToggle(props) {
  return (
    <div role="group" aria-label="Payment method" className="grid grid-cols-3 gap-2">
      {PAYMENT_METHODS.map(function renderMethod(method) {
        const IconComponent = method.icon;
        const isSelected = props.paymentMethod === method.key;
        let buttonClass =
          "flex flex-col items-center gap-1.5 rounded-xl border py-2 text-xs font-medium cursor-pointer transition-all duration-100 ";
        if (isSelected) {
          buttonClass = buttonClass + "border-[#151515] border-b-2 border-b-[#2B2B2B] bg-[#151515] text-white font-semibold shadow-xs active:translate-y-[1px] active:shadow-none";
        } else {
          buttonClass = buttonClass + "border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] bg-white text-[#777777] shadow-xs hover:bg-[#F9F9F8] hover:text-[#151515] active:translate-y-[1px] active:shadow-none";
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
