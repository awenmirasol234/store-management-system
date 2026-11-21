import { Button } from "./Button.jsx";

export function FormActions(props) {
  let confirmType = "submit";
  if (props.confirmType) {
    confirmType = props.confirmType;
  }

  let confirmVariant = "primary";
  if (props.confirmVariant) {
    confirmVariant = props.confirmVariant;
  }

  let containerClass = "flex justify-end gap-3 pt-2";
  if (props.className) {
    containerClass = "flex justify-end gap-3 " + props.className;
  }

  return (
    <div className={containerClass}>
      <Button variant="secondary" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button
        type={confirmType}
        variant={confirmVariant}
        onClick={props.onConfirm}
        disabled={props.disabled}
      >
        {props.confirmLabel}
      </Button>
    </div>
  );
}
