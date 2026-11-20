import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Layers,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload
} from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity } from "../format.js";
import { filterProducts, getStockLevel, STOCK_LEVELS } from "../products.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { InventoryStockInModal } from "../components/InventoryStockInModal.jsx";
import { InventoryAdjustModal } from "../components/InventoryAdjustModal.jsx";

function createEmptyProductForm() {
  return {
    product_id: null,
    product_name: "",
    barcode: "",
    category_id: "",
    base_unit: "piece",
    current_stock: "0",
    cost_price: "0",
    selling_price: "",
    reorder_level: "5",
    allow_custom_amount: false,
    is_active: true
  };
}

function getStockBadgeTone(product) {
  const stockLevel = getStockLevel(product);
  if (stockLevel === STOCK_LEVELS.OUT) {
    return "red";
  }
  if (stockLevel === STOCK_LEVELS.LOW) {
    return "amber";
  }
  return "green";
}

export function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // Add / Edit product modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(createEmptyProductForm());
  const [imageFile, setImageFile] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Category modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState("");

  // Selling options modal
  const [optionsModalProduct, setOptionsModalProduct] = useState(null);
  const [productOptions, setProductOptions] = useState([]);
  const [optionName, setOptionName] = useState("");
  const [optionBarcode, setOptionBarcode] = useState("");
  const [optionQty, setOptionQty] = useState("");
  const [optionPrice, setOptionPrice] = useState("");

  // Stock-In modal
  const [stockInProduct, setStockInProduct] = useState(null);
  const [stockInOptions, setStockInOptions] = useState([]);
  const [stockInOptionId, setStockInOptionId] = useState("");
  const [stockInSupplierId, setStockInSupplierId] = useState("");
  const [stockInQty, setStockInQty] = useState("1");
  const [stockInUnitCost, setStockInUnitCost] = useState("");
  const [stockInRef, setStockInRef] = useState("");

  // Adjust Stock modal
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustType, setAdjustType] = useState("DAMAGED");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustRemarks, setAdjustRemarks] = useState("");

  // Delete product confirmation
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);

  async function loadAll() {
    setErrorBanner("");
    try {
      const results = await Promise.all([
        api.listProducts(),
        api.listCategories(),
        api.listSuppliers()
      ]);
      setProducts(results[0]);
      setCategories(results[1]);
      setSuppliers(results[2]);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(function init() {
    loadAll();
  }, []);

  function updateProductField(fieldName, value) {
    setProductForm(function update(previous) {
      const copy = Object.assign({}, previous);
      copy[fieldName] = value;
      return copy;
    });
  }

  function openCreateProduct() {
    setErrorBanner("");
    setProductForm(createEmptyProductForm());
    setImageFile(null);
    setProductModalOpen(true);
  }

  function openEditProduct(product) {
    setErrorBanner("");
    let categoryIdValue = "";
    if (product.category_id) {
      categoryIdValue = product.category_id;
    }
    let barcodeValue = "";
    if (product.barcode) {
      barcodeValue = product.barcode;
    }
    setProductForm({
      product_id: product.product_id,
      product_name: product.product_name,
      barcode: barcodeValue,
      category_id: categoryIdValue,
      base_unit: product.base_unit,
      current_stock: String(product.current_stock),
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      reorder_level: String(product.reorder_level),
      allow_custom_amount: product.allow_custom_amount,
      is_active: product.is_active
    });
    setImageFile(null);
    setProductModalOpen(true);
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setSavingProduct(true);
    setErrorBanner("");

    try {
      let categoryId = null;
      if (productForm.category_id.trim().length > 0) {
        categoryId = productForm.category_id.trim();
      }
      let barcode = null;
      if (productForm.barcode.trim().length > 0) {
        barcode = productForm.barcode.trim();
      }

      const payload = {
        product_name: productForm.product_name,
        barcode: barcode,
        category_id: categoryId,
        base_unit: productForm.base_unit,
        cost_price: Number(productForm.cost_price),
        selling_price: Number(productForm.selling_price),
        reorder_level: Number(productForm.reorder_level),
        allow_custom_amount: productForm.allow_custom_amount,
        is_active: productForm.is_active
      };

      let savedProduct = null;
      if (productForm.product_id) {
        savedProduct = await api.updateProduct(productForm.product_id, payload);
      } else {
        payload.current_stock = Number(productForm.current_stock);
        savedProduct = await api.createProduct(payload);
      }

      if (imageFile) {
        await api.uploadProductImage(savedProduct.product_id, imageFile);
      }

      setProductModalOpen(false);
      await loadAll();
    } catch (error) {
      setErrorBanner(error.message);
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(product) {
    setErrorBanner("");
    try {
      await api.deleteProduct(product.product_id);
      await loadAll();
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    setErrorBanner("");
    try {
      await api.createCategory({ category_name: categoryNameInput });
      setCategoryNameInput("");
      setCategoryModalOpen(false);
      await loadAll();
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  async function openOptionsModal(product) {
    setErrorBanner("");
    setOptionName("");
    setOptionBarcode("");
    setOptionQty("");
    setOptionPrice("");
    try {
      const list = await api.listSellingOptions(product.product_id);
      setProductOptions(list);
      setOptionsModalProduct(product);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  async function handleAddOption(event) {
    event.preventDefault();
    if (!optionsModalProduct) {
      return;
    }
    setErrorBanner("");
    try {
      let barcode = null;
      if (optionBarcode.trim().length > 0) {
        barcode = optionBarcode.trim();
      }
      await api.createSellingOption(optionsModalProduct.product_id, {
        option_name: optionName,
        barcode: barcode,
        quantity: Number(optionQty),
        price: Number(optionPrice)
      });
      const updatedList = await api.listSellingOptions(optionsModalProduct.product_id);
      setProductOptions(updatedList);
      setOptionName("");
      setOptionBarcode("");
      setOptionQty("");
      setOptionPrice("");
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  async function openStockInModal(product) {
    setErrorBanner("");
    setStockInOptionId("");
    setStockInSupplierId("");
    setStockInQty("1");
    setStockInUnitCost(String(product.cost_price));
    setStockInRef("");
    try {
      const list = await api.listSellingOptions(product.product_id);
      setStockInOptions(list);
      setStockInProduct(product);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  async function handleStockIn(event) {
    event.preventDefault();
    if (!stockInProduct) {
      return;
    }
    setErrorBanner("");
    try {
      const payload = {
        product_id: stockInProduct.product_id,
        quantity: Number(stockInQty),
        unit_cost: Number(stockInUnitCost),
        created_by: "owner"
      };
      if (stockInOptionId) {
        payload.option_id = stockInOptionId;
      }
      if (stockInSupplierId) {
        payload.supplier_id = stockInSupplierId;
      }
      if (stockInRef.trim().length > 0) {
        payload.reference_number = stockInRef.trim();
      }
      await api.stockIn(payload);
      setStockInProduct(null);
      await loadAll();
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  function openAdjustModal(product) {
    setErrorBanner("");
    setAdjustType("DAMAGED");
    setAdjustQty("");
    setAdjustRemarks("");
    setAdjustProduct(product);
  }

  async function handleAdjustStock(event) {
    event.preventDefault();
    if (!adjustProduct) {
      return;
    }
    setErrorBanner("");
    try {
      let qtyValue = Number(adjustQty);
      if ((adjustType === "DAMAGED" || adjustType === "EXPIRED") && qtyValue > 0) {
        qtyValue = -qtyValue;
      }
      await api.adjustStock({
        product_id: adjustProduct.product_id,
        transaction_type: adjustType,
        quantity: qtyValue,
        remarks: adjustRemarks,
        created_by: "owner"
      });
      setAdjustProduct(null);
      await loadAll();
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  const stockFilteredProducts = [];
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    if (lowStockOnly && getStockLevel(product) === STOCK_LEVELS.HEALTHY) {
      continue;
    }
    stockFilteredProducts.push(product);
  }
  const filteredProducts = filterProducts(stockFilteredProducts, searchQuery);

  let errorElement = <ErrorBanner message={errorBanner} className="relative z-[60] mb-6" />;

  let lowStockToggleVariant = "secondary";
  if (lowStockOnly) {
    lowStockToggleVariant = "primary";
  }

  let productTableBody = (
    <tr>
      <td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">
        No products yet. Click Add Product to start.
      </td>
    </tr>
  );
  if (filteredProducts.length > 0) {
    productTableBody = filteredProducts.map(function renderRow(product) {
      let barcodeText = "—";
      if (product.barcode) {
        barcodeText = product.barcode;
      }
      return (
        <tr key={product.product_id} className="hover:bg-slate-50">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3.5">
              <ProductThumb imageUrl={product.image_url} name={product.product_name} size="sm" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{product.product_name}</div>
                <div className="mt-0.5 font-mono text-xs text-slate-500">{barcodeText}</div>
              </div>
            </div>
          </td>
          <td className="px-5 py-4 text-xs text-slate-600">{product.base_unit}</td>
          <td className="px-5 py-4 font-mono text-sm text-slate-600 text-right">
            {formatPeso(product.cost_price)}
          </td>
          <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-900 text-right">
            {formatPeso(product.selling_price)}
          </td>
          <td className="px-5 py-4 text-right">
            <Badge tone={getStockBadgeTone(product)} className="font-mono">
              {formatQuantity(product.current_stock)} {product.base_unit}
            </Badge>
          </td>
          <td className="px-5 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="soft"
                size="sm"
                onClick={function openStock() {
                  openStockInModal(product);
                }}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Stock In</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={function openOpt() {
                  openOptionsModal(product);
                }}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Options</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={function openAdj() {
                  openAdjustModal(product);
                }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={function edit() {
                  openEditProduct(product);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={function remove() {
                  setDeleteConfirmProduct(product);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </tr>
      );
    });
  }

  let mobileCardsContent = (
    <div className="py-14 text-center text-sm text-slate-500">
      No products yet. Tap Add Product to start.
    </div>
  );
  if (filteredProducts.length > 0) {
    mobileCardsContent = filteredProducts.map(function renderProductCard(product) {
      let barcodeText = "—";
      if (product.barcode) {
        barcodeText = product.barcode;
      }
      return (
        <div
          key={product.product_id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
        >
          <div className="flex items-start gap-3">
            <ProductThumb imageUrl={product.image_url} name={product.product_name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 truncate">{product.product_name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">Barcode: {barcodeText}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={getStockBadgeTone(product)} className="font-mono text-xs">
                  {formatQuantity(product.current_stock)} {product.base_unit}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-slate-900">
                {formatPeso(product.selling_price)}
              </div>
              <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                Cost: {formatPeso(product.cost_price)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="soft"
              size="sm"
              onClick={function openStock() {
                openStockInModal(product);
              }}
              className="flex-1 justify-center"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>Stock In</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={function openOpt() {
                openOptionsModal(product);
              }}
              className="flex-1 justify-center"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Options</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={function openAdj() {
                openAdjustModal(product);
              }}
              title="Adjust Stock"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={function edit() {
                openEditProduct(product);
              }}
              title="Edit Product"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={function remove() {
                setDeleteConfirmProduct(product);
              }}
              title="Delete Product"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      );
    });
  }

  let productModalTitle = "Add Product";
  let initialStockField = (
    <Input
      label="Initial Stock"
      type="number"
      step="0.0001"
      min="0"
      value={productForm.current_stock}
      onChange={function onChange(event) {
        updateProductField("current_stock", event.target.value);
      }}
    />
  );
  if (productForm.product_id) {
    productModalTitle = "Edit Product";
    initialStockField = null;
  }

  let optionsTitle = "Selling Options";
  if (optionsModalProduct) {
    optionsTitle = "Options — " + optionsModalProduct.product_name;
  }

  let optionsListContent = (
    <div className="py-6 text-center text-xs text-slate-500">
      No extra selling options yet.
    </div>
  );
  if (productOptions.length > 0 && optionsModalProduct) {
    optionsListContent = (
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {productOptions.map(function renderOpt(option) {
          return (
            <div key={option.option_id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">{option.option_name}</div>
                <div className="mt-0.5 font-mono text-xs text-slate-500">
                  {formatQuantity(option.quantity)} {optionsModalProduct.base_unit}
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-slate-900">
                {formatPeso(option.price)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  let imageUploadLabel = "Upload JPEG, PNG, or WebP (max 2MB)";
  if (imageFile) {
    imageUploadLabel = imageFile.name;
  }

  let deleteProductName = "";
  if (deleteConfirmProduct) {
    deleteProductName = deleteConfirmProduct.product_name;
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3.5 flex-1 min-w-56 sm:min-w-64">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={function onChange(event) {
                setSearchQuery(event.target.value);
              }}
              placeholder="Search products or barcode..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <Button
            variant={lowStockToggleVariant}
            size="sm"
            onClick={function toggleLowStock() {
              setLowStockOnly(!lowStockOnly);
            }}
          >
            Low Stock
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            onClick={function openCat() {
              setCategoryModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Category</span>
          </Button>
          <Button variant="primary" onClick={openCreateProduct}>
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {errorElement}

      {/* Mobile Product Card List (< md) */}
      <div className="flex-1 overflow-y-auto space-y-3 md:hidden">
        {mobileCardsContent}
      </div>

      {/* Desktop Product Table (>= md) */}
      <div className="hidden md:block flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-5 py-3.5">Product</th>
              <th className="px-5 py-3.5">Unit</th>
              <th className="px-5 py-3.5 text-right">Cost</th>
              <th className="px-5 py-3.5 text-right">Price</th>
              <th className="px-5 py-3.5 text-right">Stock</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{productTableBody}</tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        open={productModalOpen}
        onClose={function close() {
          setProductModalOpen(false);
        }}
        title={productModalTitle}
      >
        <form onSubmit={handleSaveProduct} className="space-y-5">
          <Input
            label="Product Name"
            value={productForm.product_name}
            onChange={function onChange(event) {
              updateProductField("product_name", event.target.value);
            }}
            required={true}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Barcode"
              mono={true}
              value={productForm.barcode}
              onChange={function onChange(event) {
                updateProductField("barcode", event.target.value);
              }}
              placeholder="Optional"
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Category</label>
              <select
                value={productForm.category_id}
                onChange={function onChange(event) {
                  updateProductField("category_id", event.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Uncategorized</option>
                {categories.map(function renderCatOption(category) {
                  return (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Base Unit"
              value={productForm.base_unit}
              onChange={function onChange(event) {
                updateProductField("base_unit", event.target.value);
              }}
              placeholder="piece, kg, ml"
              required={true}
            />
            <Input
              label="Cost Price (₱)"
              type="number"
              step="0.01"
              min="0"
              value={productForm.cost_price}
              onChange={function onChange(event) {
                updateProductField("cost_price", event.target.value);
              }}
              required={true}
            />
            <Input
              label="Selling Price (₱)"
              type="number"
              step="0.01"
              min="0.01"
              value={productForm.selling_price}
              onChange={function onChange(event) {
                updateProductField("selling_price", event.target.value);
              }}
              required={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {initialStockField}
            <Input
              label="Reorder Level"
              type="number"
              step="0.0001"
              min="0"
              value={productForm.reorder_level}
              onChange={function onChange(event) {
                updateProductField("reorder_level", event.target.value);
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Product Image</label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600 hover:border-blue-400">
              <Upload className="h-4 w-4 text-slate-400" />
              <span>{imageUploadLabel}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={function onFile(event) {
                  if (event.target.files && event.target.files[0]) {
                    setImageFile(event.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          <label className="flex items-center gap-2.5 py-1 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={productForm.allow_custom_amount}
              onChange={function onCheck(event) {
                updateProductField("allow_custom_amount", event.target.checked);
              }}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Allow custom peso amount ("Tingi")</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={function cancel() {
                setProductModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingProduct}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        open={categoryModalOpen}
        onClose={function close() {
          setCategoryModalOpen(false);
        }}
        title="Add Category"
        size="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-5">
          <Input
            label="Category Name"
            value={categoryNameInput}
            onChange={function onChange(event) {
              setCategoryNameInput(event.target.value);
            }}
            placeholder="e.g. Beverages"
            required={true}
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={function cancel() {
                setCategoryModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Selling Options Modal */}
      <Modal
        open={optionsModalProduct !== null}
        onClose={function close() {
          setOptionsModalProduct(null);
        }}
        title={optionsTitle}
      >
        <div className="space-y-5">
          {optionsListContent}

          <form onSubmit={handleAddOption} className="space-y-4 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-slate-700">Add Selling Option</div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Option Name"
                value={optionName}
                onChange={function onChange(event) {
                  setOptionName(event.target.value);
                }}
                placeholder="e.g. 1 Pack (5 pcs)"
                required={true}
              />
              <Input
                label="Option Barcode"
                mono={true}
                value={optionBarcode}
                onChange={function onChange(event) {
                  setOptionBarcode(event.target.value);
                }}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Base Quantity"
                type="number"
                step="0.0001"
                min="0.0001"
                value={optionQty}
                onChange={function onChange(event) {
                  setOptionQty(event.target.value);
                }}
                placeholder="e.g. 5 or 0.25"
                required={true}
              />
              <Input
                label="Option Price (₱)"
                type="number"
                step="0.01"
                min="0.01"
                value={optionPrice}
                onChange={function onChange(event) {
                  setOptionPrice(event.target.value);
                }}
                placeholder="e.g. 70.00"
                required={true}
              />
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Add Option
            </Button>
          </form>
        </div>
      </Modal>

      {/* Stock In Modal */}
      <InventoryStockInModal
        product={stockInProduct}
        options={stockInOptions}
        suppliers={suppliers}
        optionId={stockInOptionId}
        onOptionIdChange={setStockInOptionId}
        qty={stockInQty}
        onQtyChange={setStockInQty}
        unitCost={stockInUnitCost}
        onUnitCostChange={setStockInUnitCost}
        supplierId={stockInSupplierId}
        onSupplierIdChange={setStockInSupplierId}
        reference={stockInRef}
        onReferenceChange={setStockInRef}
        onClose={function closeStockIn() {
          setStockInProduct(null);
        }}
        onSubmit={handleStockIn}
      />

      {/* Adjust Stock Modal */}
      <InventoryAdjustModal
        product={adjustProduct}
        adjustType={adjustType}
        onAdjustTypeChange={setAdjustType}
        qty={adjustQty}
        onQtyChange={setAdjustQty}
        remarks={adjustRemarks}
        onRemarksChange={setAdjustRemarks}
        onClose={function closeAdjust() {
          setAdjustProduct(null);
        }}
        onSubmit={handleAdjustStock}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmProduct !== null}
        onClose={function closeDeleteConfirm() {
          setDeleteConfirmProduct(null);
        }}
        title="Remove Product"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-slate-900">{deleteProductName}</span>? This
            product will be archived and will no longer appear on the POS screen.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={function cancel() {
                setDeleteConfirmProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={function confirm() {
                handleDeleteProduct(deleteConfirmProduct);
                setDeleteConfirmProduct(null);
              }}
            >
              Remove Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
