import { formatQuantity } from "../format.js";
import { FormActions } from "./FormActions.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";
import { Select } from "./Select.jsx";

export function InventoryAdjustModal(props) {
  const product = props.product;
  if (!product) {
    return null;
  }

  let title = "Adjust Stock — " + product.product_name;

  return (
    <Modal
      open={true}
      onClose={props.onClose}
      title={title}
      size="md"
    >
      <form onSubmit={props.onSubmit} className="space-y-4 sm:space-y-5">
        <Select
          label="Type"
          value={props.adjustType}
          onChange={function onTypeChange(event) {
            props.onAdjustTypeChange(event.target.value);
          }}
        >
          <option value="DAMAGED">DAMAGED (Deduct)</option>
          <option value="EXPIRED">EXPIRED (Deduct)</option>
          <option value="ADJUSTMENT">ADJUSTMENT (+/-)</option>
        </Select>

        <Input
          label="Quantity"
          type="number"
          step="0.0001"
          value={props.qty}
          onChange={function onQtyChange(event) {
            props.onQtyChange(event.target.value);
          }}
          helper={"Current stock: " + formatQuantity(product.current_stock) + " " + product.base_unit}
          required={true}
        />

        <Input
          label="Remarks / Reason"
          value={props.remarks}
          onChange={function onRemarksChange(event) {
            props.onRemarksChange(event.target.value);
          }}
          placeholder="e.g. Broken bottle, pest damage"
          required={true}
        />

        <FormActions
          onCancel={props.onClose}
          confirmLabel="Save Adjustment"
          confirmVariant="danger"
        />
      </form>
    </Modal>
  );
}
