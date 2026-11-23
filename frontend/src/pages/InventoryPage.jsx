import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload
} from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatQuantityWithUnit } from "../format.js";
import { COMMON_BASE_UNITS, filterProducts, getStockLevel, STOCK_LEVELS } from "../products.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { CategoryFilterChips } from "../components/CategoryFilterChips.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { FormActions } from "../components/FormActions.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { Select } from "../components/Select.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";
import { InventoryStockInModal } from "../components/InventoryStockInModal.jsx";
import { InventoryAdjustModal } from "../components/InventoryAdjustModal.jsx";

function createEmptyProductForm() {
  return {
    product_id: null,
    product_name: "",
    barcode: "",
    category_id: "",
    base_unit: "Piece (pc)",
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
  return "dark";
}

export function InventoryPage(props) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState(COMMON_BASE_UNITS);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
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

  // Grouped actions dropdown menu
  const [actionMenu, setActionMenu] = useState(null);

  useEffect(function bindActionMenuEscape() {
    if (!actionMenu) {
      return;
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setActionMenu(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [actionMenu]);

  function toggleActionMenu(event, product) {
    event.stopPropagation();
    if (actionMenu && actionMenu.product.product_id === product.product_id) {
      setActionMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    let topPos = rect.bottom + 4;
    if (typeof window !== "undefined") {
      if (rect.bottom + 190 > window.innerHeight) {
        topPos = Math.max(8, rect.top - 190);
      }
    }
    let rightPos = 8;
    if (typeof window !== "undefined") {
      rightPos = Math.max(8, window.innerWidth - rect.right);
    }
    setActionMenu({
      product: product,
      top: topPos,
      right: rightPos
    });
  }

  async function loadAll() {
    setErrorBanner("");
    try {
      const results = await Promise.all([
        api.listProducts(),
        api.listCategories(),
        api.listSuppliers(),
        api.listUnits().catch(function handleUnitsError() {
          return null;
        })
      ]);
      setProducts(results[0]);
      setCategories(results[1]);
      setSuppliers(results[2]);
      if (results[3] && Array.isArray(results[3]) && results[3].length > 0) {
        const unitNames = [];
        for (let unitIndex = 0; unitIndex < results[3].length; unitIndex = unitIndex + 1) {
          unitNames.push(results[3][unitIndex].unit_name);
        }
        setUnits(unitNames);
      }
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
      let createdBy = "owner";
      if (props && props.currentUser && props.currentUser.username) {
        createdBy = props.currentUser.username;
      }

      const payload = {
        product_id: stockInProduct.product_id,
        quantity: Number(stockInQty),
        unit_cost: Number(stockInUnitCost),
        created_by: createdBy
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
      let createdBy = "owner";
      if (props && props.currentUser && props.currentUser.username) {
        createdBy = props.currentUser.username;
      }

      await api.adjustStock({
        product_id: adjustProduct.product_id,
        transaction_type: adjustType,
        quantity: qtyValue,
        remarks: adjustRemarks,
        created_by: createdBy
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
    if (selectedCategoryId !== "ALL" && product.category_id !== selectedCategoryId) {
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
    <TableEmptyRow colSpan="6" message="No products yet. Click Add Product to start." />
  );
  if (filteredProducts.length > 0) {
    productTableBody = filteredProducts.map(function renderRow(product) {
      let barcodeText = "—";
      if (product.barcode) {
        barcodeText = product.barcode;
      }
      return (
        <tr key={product.product_id} className="hover:bg-[#EEEEED]/50 transition-colors">
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3.5">
              <ProductThumb imageUrl={product.image_url} name={product.product_name} size="sm" />
              <div>
                <div className="text-sm font-semibold text-[#151515]">{product.product_name}</div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">{barcodeText}</div>
              </div>
            </div>
          </td>
          <td className="px-5 py-3.5 text-xs text-[#777777]">{product.base_unit}</td>
          <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right">
            {formatPeso(product.cost_price)}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#151515] text-right">
            {formatPeso(product.selling_price)}
          </td>
          <td className="px-5 py-3.5 text-right">
            <Badge tone={getStockBadgeTone(product)} className="font-mono">
              {formatQuantityWithUnit(product.current_stock, product.base_unit)}
            </Badge>
          </td>
          <td className="px-5 py-3.5">
            <div className="flex items-center justify-end gap-1.5">
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
              <button
                type="button"
                onClick={function openMenu(event) {
                  toggleActionMenu(event, product);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9E9E9] bg-white text-[#777777] hover:border-[#151515] hover:bg-[#EEEEED] hover:text-[#151515] transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  }

  let mobileCardsContent = <EmptyState message="No products yet. Tap Add Product to start." />;
  if (filteredProducts.length > 0) {
    mobileCardsContent = filteredProducts.map(function renderProductCard(product) {
      let barcodeText = "—";
      if (product.barcode) {
        barcodeText = product.barcode;
      }
      return (
        <div
          key={product.product_id}
          className="rounded-2xl border border-[#E9E9E9] bg-white p-4 shadow-xs space-y-3"
        >
          <div className="flex items-start gap-3">
            <ProductThumb imageUrl={product.image_url} name={product.product_name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[#151515] truncate">{product.product_name}</div>
              <div className="text-xs text-[#777777] font-mono mt-0.5">Barcode: {barcodeText}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={getStockBadgeTone(product)} className="font-mono text-xs">
                  {formatQuantityWithUnit(product.current_stock, product.base_unit)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[#151515]">
                {formatPeso(product.selling_price)}
              </div>
              <div className="font-mono text-tiny text-[#777777] mt-0.5">
                Cost: {formatPeso(product.cost_price)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#E9E9E9]">
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
            <button
              type="button"
              onClick={function openMenu(event) {
                toggleActionMenu(event, product);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
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
    <div className="py-6 text-center text-xs text-[#777777]">
      No extra selling options yet.
    </div>
  );
  if (productOptions.length > 0 && optionsModalProduct) {
    optionsListContent = (
      <div className="divide-y divide-[#E9E9E9] rounded-xl border border-[#E9E9E9]">
        {productOptions.map(function renderOpt(option) {
          return (
            <div key={option.option_id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[#151515]">{option.option_name}</div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
                  {formatQuantityWithUnit(option.quantity, optionsModalProduct.base_unit)}
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-[#151515]">
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

  const unitOptions = [];
  for (let unitIdx = 0; unitIdx < units.length; unitIdx = unitIdx + 1) {
    unitOptions.push(units[unitIdx]);
  }
  if (productForm.base_unit && !unitOptions.includes(productForm.base_unit)) {
    unitOptions.unshift(productForm.base_unit);
  }

  return (
    <PageLayout>
      <PageHeader title="Products" stackOnMobile={true}>
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
      </PageHeader>

      {/* Search & Low Stock Filter Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 sm:gap-3.5">
        <div className="relative flex-1 min-w-56 sm:min-w-64 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
          <input
            type="text"
            value={searchQuery}
            onChange={function onChange(event) {
              setSearchQuery(event.target.value);
            }}
            placeholder="Search products or barcode..."
            className="w-full rounded-xl border border-[#E9E9E9] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#151515] placeholder:text-[#777777] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors"
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

      <CategoryFilterChips
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {errorElement}

      {/* Mobile Product Card List (< md) */}
      <div className="flex-1 overflow-y-auto space-y-3 md:hidden">
        {mobileCardsContent}
      </div>

      {/* Desktop Product Table (>= md) */}
      <div className="hidden md:block flex-1 overflow-auto rounded-2xl border border-[#E9E9E9] bg-white">
        <DataTable
          stickyHead={true}
          headRow={
            <tr>
              <th className="px-5 py-3">Product</th>
              <th className="px-5 py-3">Unit</th>
              <th className="px-5 py-3 text-right">Cost</th>
              <th className="px-5 py-3 text-right">Price</th>
              <th className="px-5 py-3 text-right">Stock</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          }
        >
          {productTableBody}
        </DataTable>
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
                <Select
                  label="Category"
                  value={productForm.category_id}
                  onChange={function onChange(event) {
                    updateProductField("category_id", event.target.value);
                  }}
                >
                  <option value="">Uncategorized</option>
                  {categories.map(function renderCatOption(category) {
                    return (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Base Unit"
                  value={productForm.base_unit}
                  onChange={function onChange(event) {
                    updateProductField("base_unit", event.target.value);
                  }}
                  required={true}
                >
                  {unitOptions.map(function renderUnitOption(unitName) {
                    return (
                      <option key={unitName} value={unitName}>
                        {unitName}
                      </option>
                    );
                  })}
                </Select>
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
            <label className="mb-1.5 block text-xs font-medium text-[#151515]">Product Image</label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[#E9E9E9] bg-[#EEEEED]/40 px-4 py-3 text-xs text-[#151515] hover:border-[#151515] transition-colors">
              <Upload className="h-4 w-4 text-[#777777]" />
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

          <label className="flex items-center gap-2.5 py-1 text-xs font-medium text-[#151515] cursor-pointer">
            <input
              type="checkbox"
              checked={productForm.allow_custom_amount}
              onChange={function onCheck(event) {
                updateProductField("allow_custom_amount", event.target.checked);
              }}
              className="h-4 w-4 rounded border-[#E9E9E9] text-[#151515] focus:ring-[#B9F36B]/30"
            />
            <span>Allow custom peso amount ("Tingi")</span>
          </label>

          <FormActions
            onCancel={function cancel() {
              setProductModalOpen(false);
            }}
            confirmLabel="Save Product"
            disabled={savingProduct}
          />
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
          <FormActions
            onCancel={function cancel() {
              setCategoryModalOpen(false);
            }}
            confirmLabel="Save"
            className="pt-1"
          />
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

          <form onSubmit={handleAddOption} className="space-y-4 border-t border-[#E9E9E9] pt-4">
            <div className="text-xs font-semibold text-[#151515]">Add Selling Option</div>
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
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
          <p className="text-sm text-[#777777]">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-[#151515]">{deleteProductName}</span>? This
            product will be archived and will no longer appear on the POS screen.
          </p>
          <FormActions
            onCancel={function cancel() {
              setDeleteConfirmProduct(null);
            }}
            confirmType="button"
            confirmVariant="danger"
            confirmLabel="Remove Product"
            onConfirm={function confirm() {
              handleDeleteProduct(deleteConfirmProduct);
              setDeleteConfirmProduct(null);
            }}
          />
        </div>
      </Modal>

      {/* Floating More Actions Dropdown */}
      {actionMenu !== null && (
        <div
          className="fixed inset-0 z-50 select-none"
          onClick={function closeMenu() {
            setActionMenu(null);
          }}
        >
          <div
            style={{ top: actionMenu.top, right: actionMenu.right }}
            className="fixed w-44 rounded-xl border border-[#E9E9E9] bg-white p-1 shadow-lg"
            onClick={function stopPropagation(event) {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={function handleEdit() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                openEditProduct(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#151515] hover:bg-[#EEEEED] transition-colors cursor-pointer text-left"
            >
              <Pencil className="h-3.5 w-3.5 text-[#777777]" />
              <span>Edit Product</span>
            </button>

            <button
              type="button"
              onClick={function handleOptions() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                openOptionsModal(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#151515] hover:bg-[#EEEEED] transition-colors cursor-pointer text-left"
            >
              <Layers className="h-3.5 w-3.5 text-[#777777]" />
              <span>Selling Options</span>
            </button>

            <button
              type="button"
              onClick={function handleAdjust() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                openAdjustModal(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#151515] hover:bg-[#EEEEED] transition-colors cursor-pointer text-left"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#777777]" />
              <span>Adjust Stock</span>
            </button>

            <div className="my-1 border-t border-[#E9E9E9]" />

            <button
              type="button"
              onClick={function handleDelete() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                setDeleteConfirmProduct(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>Remove Product</span>
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
