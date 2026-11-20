import { formatQuantity } from "../format.js";
import { Button } from "./Button.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

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
      size="sm"
    >
      <form onSubmit={props.onSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Type</label>
          <select
            value={props.adjustType}
            onChange={function onTypeChange(event) {
              props.onAdjustTypeChange(event.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="DAMAGED">DAMAGED (Deduct)</option>
            <option value="EXPIRED">EXPIRED (Deduct)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (+/-)</option>
          </select>
        </div>

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

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger">
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
