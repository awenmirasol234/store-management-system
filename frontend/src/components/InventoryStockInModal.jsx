import { formatQuantity } from "../format.js";
import { FormActions } from "./FormActions.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";
import { Select } from "./Select.jsx";

export function InventoryStockInModal(props) {
  const product = props.product;
  if (!product) {
    return null;
  }

  let unitLabel = product.base_unit;
  let title = "Stock In — " + product.product_name;

  return (
    <Modal
      open={true}
      onClose={props.onClose}
      title={title}
      size="md"
    >
      <form onSubmit={props.onSubmit} className="space-y-4 sm:space-y-5">
        <Select
          label="Stock-In Unit"
          value={props.optionId}
          onChange={function onOptChange(event) {
            props.onOptionIdChange(event.target.value);
          }}
        >
          <option value="">Base Unit (1 {unitLabel})</option>
          {props.options.map(function renderOpt(option) {
            return (
              <option key={option.option_id} value={option.option_id}>
                {option.option_name} ({formatQuantity(option.quantity)} {unitLabel})
              </option>
            );
          })}
        </Select>

        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          <Input
            label="Quantity"
            type="number"
            step="0.0001"
            min="0.0001"
            value={props.qty}
            onChange={function onQtyChange(event) {
              props.onQtyChange(event.target.value);
            }}
            required={true}
          />
          <Input
            label={"Cost / " + unitLabel + " (₱)"}
            type="number"
            step="0.01"
            min="0"
            value={props.unitCost}
            onChange={function onCostChange(event) {
              props.onUnitCostChange(event.target.value);
            }}
            required={true}
          />
        </div>

        <Select
          label="Supplier"
          value={props.supplierId}
          onChange={function onSupChange(event) {
            props.onSupplierIdChange(event.target.value);
          }}
        >
          <option value="">None</option>
          {props.suppliers.map(function renderSup(supplier) {
            return (
              <option key={supplier.supplier_id} value={supplier.supplier_id}>
                {supplier.supplier_name}
              </option>
            );
          })}
        </Select>

        <Input
          label="Reference / DR #"
          mono={true}
          value={props.reference}
          onChange={function onRefChange(event) {
            props.onReferenceChange(event.target.value);
          }}
          placeholder="Optional"
        />

        <FormActions onCancel={props.onClose} confirmLabel="Add Stock" />
      </form>
    </Modal>
  );
}
