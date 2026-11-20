import { formatQuantity } from "../format.js";
import { Button } from "./Button.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

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
      size="sm"
    >
      <form onSubmit={props.onSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Stock-In Unit</label>
          <select
            value={props.optionId}
            onChange={function onOptChange(event) {
              props.onOptionIdChange(event.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Base Unit (1 {unitLabel})</option>
            {props.options.map(function renderOpt(option) {
              return (
                <option key={option.option_id} value={option.option_id}>
                  {option.option_name} ({formatQuantity(option.quantity)} {unitLabel})
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Supplier</label>
          <select
            value={props.supplierId}
            onChange={function onSupChange(event) {
              props.onSupplierIdChange(event.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">None</option>
            {props.suppliers.map(function renderSup(supplier) {
              return (
                <option key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.supplier_name}
                </option>
              );
            })}
          </select>
        </div>

        <Input
          label="Reference / DR #"
          mono={true}
          value={props.reference}
          onChange={function onRefChange(event) {
            props.onReferenceChange(event.target.value);
          }}
          placeholder="Optional"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
