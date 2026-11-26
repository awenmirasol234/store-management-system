import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  SlidersHorizontal,
  AlertCircle,
  Download,
  Globe,
  Trash2,
  Upload
} from "lucide-react";
import { api, resolveImageUrl } from "../api.js";
import { exportToCsv } from "../export.js";
import { DEFAULT_CAPABILITIES } from "../navigation.js";
import { formatPeso, formatQuantity, formatQuantityWithUnit } from "../format.js";
import {
  COMMON_BASE_UNITS,
  filterProducts,
  getStockLevel,
  STOCK_LEVELS,
  validateImageUrl
} from "../products.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { CategoryFilterChips } from "../components/CategoryFilterChips.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { FilterPill } from "../components/FilterPill.jsx";
import { FormActions } from "../components/FormActions.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { SearchInput } from "../components/SearchInput.jsx";
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

function validateProductFormField(fieldName, value, form) {
  if (fieldName === "product_name") {
    if (!value || typeof value !== "string" || value.trim().length === 0) {
      return "Product name is required";
    }
    return "";
  }

  if (fieldName === "base_unit") {
    if (!value || typeof value !== "string" || value.trim().length === 0) {
      return "Base unit is required";
    }
    return "";
  }

  if (fieldName === "cost_price") {
    if (value === "" || value === null || value === undefined) {
      return "Cost price is required";
    }
    const costNumber = Number(value);
    if (isNaN(costNumber) || costNumber < 0) {
      return "Cost price cannot be negative";
    }
    return "";
  }

  if (fieldName === "selling_price") {
    if (value === "" || value === null || value === undefined) {
      return "Selling price is required";
    }
    const priceNumber = Number(value);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      return "Selling price must be greater than ₱0.00";
    }
    return "";
  }

  if (fieldName === "current_stock") {
    if (value !== "" && value !== null && value !== undefined) {
      const stockNumber = Number(value);
      if (isNaN(stockNumber) || stockNumber < 0) {
        return "Initial stock cannot be negative";
      }
    }
    return "";
  }

  if (fieldName === "reorder_level") {
    if (value !== "" && value !== null && value !== undefined) {
      const reorderNumber = Number(value);
      if (isNaN(reorderNumber) || reorderNumber < 0) {
        return "Reorder level cannot be negative";
      }
    }
    return "";
  }

  return "";
}

export function validateProductImageFile(file) {
  if (!file) {
    return "Please select an image file";
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return "Image must be JPEG, PNG, or WebP";
  }
  if (file.size > 2 * 1024 * 1024) {
    return "Image must be 2 MB or smaller";
  }
  return "";
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
  const canWrite = !props.currentUser || props.currentUser.role === "OWNER";
  const capabilities = props.capabilities || DEFAULT_CAPABILITIES;
  const pendingWrite = useRef(false);
  const savedProductForm = useRef(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState(COMMON_BASE_UNITS);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [modalError, setModalError] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");

  // Add / Edit product modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(createEmptyProductForm());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageSourceMode, setImageSourceMode] = useState("file");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageUrlStatus, setImageUrlStatus] = useState("idle");
  const [imageUrlError, setImageUrlError] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingStock, setSavingStock] = useState(false);

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
      let categoriesPromise = Promise.resolve([]);
      let suppliersPromise = Promise.resolve([]);
      if (capabilities.catalog_extras) {
        categoriesPromise = api.listCategories();
        suppliersPromise = api.listSuppliers();
      }
      const results = await Promise.all([
        api.listProducts(),
        categoriesPromise,
        suppliersPromise,
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

  useEffect(
    function syncImagePreview() {
      if (!imageFile) {
        setImagePreviewUrl(null);
        return;
      }
      let objectUrl = null;
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        try {
          objectUrl = URL.createObjectURL(imageFile);
          setImagePreviewUrl(objectUrl);
        } catch (err) {
          setImagePreviewUrl(null);
        }
      }
      return function cleanup() {
        if (objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (err) {
            // ignore error in mock environment
          }
        }
      };
    },
    [imageFile]
  );

  function updateProductField(fieldName, value) {
    setProductForm(function update(previous) {
      const copy = Object.assign({}, previous);
      copy[fieldName] = value;
      return copy;
    });
  }

  function handleImageFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    const validationError = validateProductImageFile(file);
    if (validationError) {
      setImageFile(null);
      setModalError(validationError);
      event.target.value = "";
      return;
    }
    setModalError("");
    setImageFile(file);
  }

  function handleProductFieldChange(fieldName, value) {
    updateProductField(fieldName, value);
    if (touchedFields[fieldName]) {
      const updatedForm = Object.assign({}, productForm);
      updatedForm[fieldName] = value;
      const error = validateProductFormField(fieldName, value, updatedForm);
      setFieldErrors(function updateErrors(prev) {
        const next = Object.assign({}, prev);
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        return next;
      });
    }
  }

  function handleProductFieldBlur(fieldName) {
    setTouchedFields(function markTouched(prev) {
      const next = Object.assign({}, prev);
      next[fieldName] = true;
      return next;
    });
    const error = validateProductFormField(fieldName, productForm[fieldName], productForm);
    setFieldErrors(function updateErrors(prev) {
      const next = Object.assign({}, prev);
      if (error) {
        next[fieldName] = error;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  }

  function openCreateProduct() {
    setErrorBanner("");
    setModalError("");
    setFieldErrors({});
    setTouchedFields({});
    savedProductForm.current = null;
    setProductForm(createEmptyProductForm());
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageSourceMode("file");
    setImageUrlInput("");
    setImageUrlStatus("idle");
    setImageUrlError("");
    setExistingImageUrl(null);
    setProductModalOpen(true);
  }

  function openEditProduct(product) {
    setErrorBanner("");
    setModalError("");
    setFieldErrors({});
    setTouchedFields({});
    savedProductForm.current = null;
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
    setImagePreviewUrl(null);
    setImageUrlError("");
    if (product.image_url) {
      setExistingImageUrl(product.image_url);
      if (product.image_url.startsWith("http://") || product.image_url.startsWith("https://")) {
        setImageSourceMode("url");
        setImageUrlInput(product.image_url);
        setImageUrlStatus("loaded");
      } else {
        setImageSourceMode("file");
        setImageUrlInput("");
        setImageUrlStatus("idle");
      }
    } else {
      setExistingImageUrl(null);
      setImageSourceMode("file");
      setImageUrlInput("");
      setImageUrlStatus("idle");
    }
    setProductModalOpen(true);
  }

  function handleImageUrlChange(value) {
    setImageUrlInput(value);
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setImageUrlStatus("idle");
      setImageUrlError("");
      setFieldErrors(function updateErrors(prev) {
        const next = Object.assign({}, prev);
        delete next.image_url;
        return next;
      });
      return;
    }
    const validationError = validateImageUrl(trimmed);
    if (validationError) {
      setImageUrlStatus("error");
      setImageUrlError(validationError);
      setFieldErrors(function updateErrors(prev) {
        const next = Object.assign({}, prev);
        next.image_url = validationError;
        return next;
      });
    } else {
      setImageUrlStatus("loading");
      setImageUrlError("");
      setFieldErrors(function updateErrors(prev) {
        const next = Object.assign({}, prev);
        delete next.image_url;
        return next;
      });
    }
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    if (pendingWrite.current) {
      return;
    }

    const newErrors = {};
    const nameError = validateProductFormField("product_name", productForm.product_name, productForm);
    if (nameError) {
      newErrors.product_name = nameError;
    }

    if (productForm.selling_price !== "") {
      const priceError = validateProductFormField("selling_price", productForm.selling_price, productForm);
      if (priceError) {
        newErrors.selling_price = priceError;
      }
    } else if (touchedFields.selling_price) {
      newErrors.selling_price = "Selling price is required";
    }

    if (productForm.cost_price !== "") {
      const costError = validateProductFormField("cost_price", productForm.cost_price, productForm);
      if (costError) {
        newErrors.cost_price = costError;
      }
    }

    if (productForm.current_stock !== "") {
      const stockError = validateProductFormField("current_stock", productForm.current_stock, productForm);
      if (stockError) {
        newErrors.current_stock = stockError;
      }
    }

    if (productForm.reorder_level !== "") {
      const reorderError = validateProductFormField("reorder_level", productForm.reorder_level, productForm);
      if (reorderError) {
        newErrors.reorder_level = reorderError;
      }
    }

    if (imageSourceMode === "url" && imageUrlInput.trim().length > 0) {
      const urlValidationError = validateImageUrl(imageUrlInput.trim());
      if (urlValidationError) {
        newErrors.image_url = urlValidationError;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setTouchedFields({
        product_name: true,
        selling_price: true,
        cost_price: true,
        current_stock: true,
        reorder_level: true
      });
      return;
    }

    pendingWrite.current = true;
    setSavingProduct(true);
    setModalError("");

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

      let productId = productForm.product_id;
      if (productForm !== savedProductForm.current) {
        if (productId) {
          await api.updateProduct(productId, payload);
          savedProductForm.current = productForm;
        } else {
          payload.current_stock = Number(productForm.current_stock);
          const savedProduct = await api.createProduct(payload);
          productId = savedProduct.product_id;
          const savedForm = Object.assign({}, productForm, { product_id: productId });
          savedProductForm.current = savedForm;
          setProductForm(savedForm);
        }
      }

      if (imageSourceMode === "url" && imageUrlInput.trim().length > 0) {
        try {
          await api.saveProductImageUrl(productId, imageUrlInput.trim());
        } catch (error) {
          setModalError("Product saved, but image download failed: " + error.message);
          await loadAll();
          return;
        }
      } else if (imageSourceMode === "file" && imageFile) {
        try {
          await api.uploadProductImage(productId, imageFile);
        } catch (error) {
          setModalError("Product saved. Image upload failed: " + error.message);
          await loadAll();
          return;
        }
      } else if (productForm.product_id && !existingImageUrl && !imageFile && !imageUrlInput.trim()) {
        try {
          await api.updateProduct(productId, { image_url: null });
        } catch (error) {
          // ignore clear error
        }
      }

      setProductModalOpen(false);
      setFieldErrors({});
      setTouchedFields({});
      await loadAll();
    } catch (error) {
      setModalError(error.message);
    } finally {
      pendingWrite.current = false;
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
    setModalError("");
    try {
      await api.createCategory({ category_name: categoryNameInput });
      setCategoryNameInput("");
      setCategoryModalOpen(false);
      await loadAll();
    } catch (error) {
      setModalError(error.message);
    }
  }

  async function openOptionsModal(product) {
    setErrorBanner("");
    setModalError("");
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
    setModalError("");
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
      setModalError(error.message);
    }
  }

  async function openStockInModal(product) {
    setErrorBanner("");
    setModalError("");
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

  async function saveStock(write, close) {
    if (pendingWrite.current) {
      return;
    }
    pendingWrite.current = true;
    setSavingStock(true);
    setModalError("");
    try {
      await write();
      close();
      await loadAll();
    } catch (error) {
      setModalError(error.message);
    } finally {
      pendingWrite.current = false;
      setSavingStock(false);
    }
  }

  async function handleStockIn(event) {
    event.preventDefault();
    if (!stockInProduct) {
      return;
    }
    await saveStock(async function writeStockIn() {
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
    }, function closeStockIn() {
      setStockInProduct(null);
    });
  }

  function openAdjustModal(product) {
    setErrorBanner("");
    setModalError("");
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
    await saveStock(async function writeAdjustment() {
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
    }, function closeAdjustment() {
      setAdjustProduct(null);
    });
  }

  async function handleToggleOptionActive(option) {
    if (!optionsModalProduct) {
      return;
    }
    setModalError("");
    try {
      await api.updateSellingOption(optionsModalProduct.product_id, option.option_id, {
        is_active: !option.is_active
      });
      const updatedList = await api.listSellingOptions(optionsModalProduct.product_id);
      setProductOptions(updatedList);
    } catch (error) {
      setModalError(error.message);
    }
  }

  let lowStockCount = 0;
  const stockFilteredProducts = [];
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    const isLowOrOut = getStockLevel(product) !== STOCK_LEVELS.HEALTHY;
    if (isLowOrOut) {
      lowStockCount = lowStockCount + 1;
    }
    if (lowStockOnly && !isLowOrOut) {
      continue;
    }
    if (selectedCategoryId !== "ALL" && product.category_id !== selectedCategoryId) {
      continue;
    }
    stockFilteredProducts.push(product);
  }
  const filteredProducts = filterProducts(stockFilteredProducts, searchQuery);

  const errorElement = <ErrorBanner message={errorBanner} className="mb-4 sm:mb-5" />;

  let emptyProductsMessage = "No products yet.";
  let productColumnCount = 5;
  if (canWrite) {
    emptyProductsMessage = "No products yet. Use Add Product to start.";
    productColumnCount = 6;
  }
  let productTableBody = <TableEmptyRow colSpan={productColumnCount} message={emptyProductsMessage} />;
  if (filteredProducts.length > 0) {
    productTableBody = filteredProducts.map(function renderRow(product) {
      let barcodeText = "—";
      if (product.barcode) {
        barcodeText = product.barcode;
      }
      let stockBadgeLabel = formatQuantityWithUnit(product.current_stock, product.base_unit);
      if (getStockLevel(product) === STOCK_LEVELS.OUT) {
        stockBadgeLabel = "Out of Stock";
      }
      return (
        <tr key={product.product_id} className="hover:bg-[#EEEEED]/50 transition-colors">
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3.5">
              <ProductThumb imageUrl={product.image_url} name={product.product_name} size="sm" />
              <div>
                <div className="text-sm font-semibold text-[#171717]">{product.product_name}</div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">{barcodeText}</div>
              </div>
            </div>
          </td>
          <td className="px-5 py-3.5 text-xs text-[#777777] whitespace-nowrap">{product.base_unit}</td>
          <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right whitespace-nowrap">
            {formatPeso(product.cost_price)}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#171717] text-right whitespace-nowrap">
            {formatPeso(product.selling_price)}
          </td>
          <td className="px-5 py-3.5 text-right whitespace-nowrap">
            <Badge tone={getStockBadgeTone(product)} className="font-mono">
              {stockBadgeLabel}
            </Badge>
          </td>
          {canWrite && <td className="px-5 py-3.5 text-right whitespace-nowrap">
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <Button
                variant="soft"
                size="sm"
                onClick={function openStock() {
                  openStockInModal(product);
                }}
              >
                <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" />
                <span>Stock In</span>
              </Button>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={Boolean(
                  actionMenu && actionMenu.product.product_id === product.product_id
                )}
                aria-label={"More actions for " + product.product_name}
                onClick={function openMenu(event) {
                  toggleActionMenu(event, product);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E9E9E9] bg-white text-[#777777] hover:border-[#171717] hover:bg-[#EEEEED] hover:text-[#171717] transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </td>}
        </tr>
      );
    });
  }

  let mobileCardsContent = <EmptyState message={emptyProductsMessage} />;
  if (filteredProducts.length > 0) {
    mobileCardsContent = filteredProducts.map(function renderProductCard(product) {
      let barcodeText = "—";
      if (product.barcode) {
        barcodeText = product.barcode;
      }
      let stockBadgeLabel = formatQuantityWithUnit(product.current_stock, product.base_unit);
      if (getStockLevel(product) === STOCK_LEVELS.OUT) {
        stockBadgeLabel = "Out of Stock";
      }
      return (
        <div
          key={product.product_id}
          className="rounded-2xl border border-[#E9E9E9] bg-white p-4 shadow-xs space-y-3"
        >
          <div className="flex items-start gap-3">
            <ProductThumb imageUrl={product.image_url} name={product.product_name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[#171717] truncate">{product.product_name}</div>
              <div className="text-xs text-[#777777] font-mono mt-0.5">Barcode: {barcodeText}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={getStockBadgeTone(product)} className="font-mono text-xs">
                  {stockBadgeLabel}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[#171717]">
                {formatPeso(product.selling_price)}
              </div>
              <div className="font-mono text-tiny text-[#777777] mt-0.5">
                Cost: {formatPeso(product.cost_price)}
              </div>
            </div>
          </div>

          {canWrite && <div className="flex items-center gap-2 pt-2 border-t border-[#E9E9E9]">
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
              aria-haspopup="menu"
              aria-expanded={Boolean(
                actionMenu && actionMenu.product.product_id === product.product_id
              )}
              aria-label={"More actions for " + product.product_name}
              onClick={function openMenu(event) {
                toggleActionMenu(event, product);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717] transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>}
        </div>
      );
    });
  }

  let productModalTitle = "Add Product";
  let initialStockField = null;
  if (!productForm.product_id) {
    initialStockField = (
      <Input
        label="Initial Stock (optional)"
        type="number"
        step="0.0001"
        min="0"
        placeholder="0"
        helper="Starting quantity on hand"
        value={productForm.current_stock}
        error={fieldErrors.current_stock}
        onChange={function onChange(event) {
          handleProductFieldChange("current_stock", event.target.value);
        }}
        onBlur={function onBlur() {
          handleProductFieldBlur("current_stock");
        }}
      />
    );
  }
  if (productForm.product_id) {
    productModalTitle = "Edit Product";
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
          let inactiveBadge = null;
          let toggleActionLabel = "Disable";
          let rowTextClass = "text-sm font-medium text-[#171717]";
          if (option.is_active === false) {
            inactiveBadge = <Badge tone="neutral">Inactive</Badge>;
            toggleActionLabel = "Enable";
            rowTextClass = "text-sm font-medium text-[#777777]";
          }
          let barcodeSuffix = "";
          if (option.barcode) {
            barcodeSuffix = " · " + option.barcode;
          }
          return (
            <div key={option.option_id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={rowTextClass}>{option.option_name}</span>
                  {inactiveBadge}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
                  {formatQuantityWithUnit(option.quantity, optionsModalProduct.base_unit)}
                  {barcodeSuffix}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-sm font-bold text-[#171717]">
                  {formatPeso(option.price)}
                </div>
                <button
                  type="button"
                  onClick={function toggleOpt() {
                    handleToggleOptionActive(option);
                  }}
                  className="text-2xs font-medium text-[#777777] hover:text-[#171717] underline cursor-pointer transition-colors"
                >
                  {toggleActionLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  let profitPreviewElement = null;
  const costNum = Number(productForm.cost_price);
  const priceNum = Number(productForm.selling_price);
  if (
    productForm.selling_price !== "" &&
    !isNaN(priceNum) &&
    priceNum > 0 &&
    !isNaN(costNum) &&
    costNum >= 0
  ) {
    const profit = priceNum - costNum;
    let marginPercent = 0;
    if (priceNum > 0) {
      marginPercent = Math.round((profit / priceNum) * 1000) / 10;
    }

    if (profit > 0) {
      profitPreviewElement = (
        <div className="flex items-center gap-2 rounded-xl bg-[#F4FBF0] border border-[#DCF7C5] px-3.5 py-2 text-xs text-[#245913]">
          <span className="font-semibold">Est. Profit:</span>
          <span className="font-mono font-medium">+{formatPeso(profit)}</span>
          <span className="text-[#4E7E32]">({marginPercent}% margin)</span>
        </div>
      );
    } else if (profit === 0) {
      profitPreviewElement = (
        <div className="flex items-center gap-2 rounded-xl bg-[#F6F6F5] border border-[#E9E9E9] px-3.5 py-2 text-xs text-[#777777]">
          <span className="font-semibold">Est. Profit:</span>
          <span className="font-mono font-medium">₱0.00</span>
          <span>(Break-even)</span>
        </div>
      );
    } else {
      profitPreviewElement = (
        <div className="flex items-center gap-2 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] px-3.5 py-2 text-xs text-[#B42318]">
          <span className="font-semibold">Selling Below Cost:</span>
          <span className="font-mono font-medium">{formatPeso(profit)}</span>
          <span>(Loss of {Math.abs(marginPercent)}%)</span>
        </div>
      );
    }
  }

  const imageModeSelector = (
    <div
      role="tablist"
      aria-label="Image source options"
      className="inline-flex items-center gap-1 rounded-xl bg-[#EEEEED]/70 p-1 mb-2.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={imageSourceMode === "file"}
        onClick={function chooseFileMode() {
          setImageSourceMode("file");
        }}
        className={
          "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium cursor-pointer transition-colors " +
          (imageSourceMode === "file"
            ? "bg-[#171717] text-white shadow-xs font-semibold"
            : "text-[#777777] hover:text-[#171717]")
        }
      >
        <Upload className="h-3.5 w-3.5" />
        <span>Upload File</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={imageSourceMode === "url"}
        onClick={function chooseUrlMode() {
          setImageSourceMode("url");
        }}
        className={
          "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium cursor-pointer transition-colors " +
          (imageSourceMode === "url"
            ? "bg-[#171717] text-white shadow-xs font-semibold"
            : "text-[#777777] hover:text-[#171717]")
        }
      >
        <Globe className="h-3.5 w-3.5" />
        <span>Image URL</span>
      </button>
    </div>
  );

  let fileModeContent = null;
  if (imageFile) {
    let fileSizeLabel = "";
    if (imageFile.size) {
      const sizeKb = Math.round(imageFile.size / 1024);
      if (sizeKb > 1024) {
        fileSizeLabel = (Math.round((sizeKb / 1024) * 10) / 10) + " MB";
      } else {
        fileSizeLabel = sizeKb + " KB";
      }
    }

    let thumbnailElement = (
      <div className="h-12 w-12 rounded-lg bg-[#EEEEED] flex items-center justify-center shrink-0">
        <Upload className="h-5 w-5 text-[#777777]" />
      </div>
    );
    if (imagePreviewUrl) {
      thumbnailElement = (
        <img
          src={imagePreviewUrl}
          alt="Preview"
          className="h-12 w-12 rounded-lg object-cover border border-[#E9E9E9] shrink-0"
        />
      );
    }

    fileModeContent = (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E9E9E9] bg-white p-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {thumbnailElement}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#171717]">{imageFile.name}</p>
            {fileSizeLabel && <p className="text-2xs text-[#777777] font-mono">{fileSizeLabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-2xs font-medium text-[#171717] hover:underline cursor-pointer">
            <span>Change</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileSelection}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={function removeImage() {
              setImageFile(null);
            }}
            className="text-2xs font-medium text-[#E0533C] hover:underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>
    );
  } else if (existingImageUrl) {
    const existingSrc = resolveImageUrl(existingImageUrl);
    fileModeContent = (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E9E9E9] bg-white p-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {existingSrc ? (
            <img
              src={existingSrc}
              alt="Current product"
              className="h-12 w-12 rounded-lg object-cover border border-[#E9E9E9] shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-[#EEEEED] flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-[#777777]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#171717]">Current Image</p>
            <p className="text-2xs text-[#777777] font-mono">Saved locally</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-2xs font-medium text-[#171717] hover:underline cursor-pointer">
            <span>Change</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileSelection}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={function removeExistingImage() {
              setExistingImageUrl(null);
              setImageFile(null);
            }}
            className="text-2xs font-medium text-[#E0533C] hover:underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>
    );
  } else {
    fileModeContent = (
      <label className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#E9E9E9] bg-[#EEEEED]/30 px-4 py-3.5 text-xs text-[#171717] hover:border-[#171717] hover:bg-[#EEEEED]/50 transition-colors">
        <Upload className="h-4 w-4 text-[#777777]" />
        <span className="text-[#777777]">Upload JPEG, PNG, or WebP <span className="text-2xs text-[#999999]">(max 2MB)</span></span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageFileSelection}
          className="hidden"
        />
      </label>
    );
  }

  let urlPreviewCard = null;
  const trimmedUrl = imageUrlInput.trim();
  if (trimmedUrl.length > 0) {
    let thumbnailElement = (
      <div className="h-12 w-12 rounded-lg bg-[#EEEEED] flex items-center justify-center shrink-0 border border-[#E9E9E9]">
        <Globe className="h-5 w-5 text-[#777777]" />
      </div>
    );

    if (imageUrlStatus === "loading") {
      thumbnailElement = (
        <div className="h-12 w-12 rounded-lg bg-[#EEEEED] flex items-center justify-center shrink-0 border border-[#E9E9E9]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
        </div>
      );
    } else if (imageUrlStatus === "error") {
      thumbnailElement = (
        <div className="h-12 w-12 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-600" />
        </div>
      );
    } else if (imageUrlStatus === "loaded") {
      thumbnailElement = (
        <img
          src={trimmedUrl}
          alt="Preview"
          className="h-12 w-12 rounded-lg object-cover border border-[#E9E9E9] shrink-0"
        />
      );
    }

    let statusDescription = "Loading preview...";
    let statusClass = "text-[#777777]";
    if (imageUrlStatus === "loaded") {
      statusDescription = "Preview ready · Will be saved locally on submit";
      statusClass = "text-[#171717] font-medium";
    } else if (imageUrlStatus === "error") {
      statusDescription = imageUrlError || "Failed to load image";
      statusClass = "text-rose-600 font-medium";
    }

    urlPreviewCard = (
      <div className="space-y-2">
        <img
          src={trimmedUrl}
          alt=""
          aria-hidden="true"
          className="hidden"
          onLoad={function handleProbeLoad() {
            setImageUrlStatus("loaded");
            setImageUrlError("");
          }}
          onError={function handleProbeError() {
            setImageUrlStatus("error");
            setImageUrlError("Unable to load image. Please check the URL or try another link.");
          }}
        />

        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E9E9E9] bg-white p-2.5">
          <div className="flex items-center gap-3 min-w-0">
            {thumbnailElement}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#171717]">{trimmedUrl}</p>
              <p className={"text-2xs truncate " + statusClass}>{statusDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={function clearUrl() {
                setImageUrlInput("");
                setImageUrlStatus("idle");
                setImageUrlError("");
                setFieldErrors(function (prev) {
                  const next = Object.assign({}, prev);
                  delete next.image_url;
                  return next;
                });
              }}
              className="text-2xs font-medium text-[#E0533C] hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  const urlModeContent = (
    <div className="space-y-3">
      <Input
        label="Image Web Address (URL)"
        type="url"
        placeholder="https://example.com/product-image.jpg"
        value={imageUrlInput}
        error={fieldErrors.image_url || imageUrlError}
        helper="Paste a direct image link (JPEG, PNG, or WebP). It will be saved locally on your POS."
        onChange={function onUrlChange(event) {
          handleImageUrlChange(event.target.value);
        }}
        autoComplete="off"
      />
      {urlPreviewCard}
    </div>
  );

  let imagePreviewSection = (
    <div>
      {imageModeSelector}
      {imageSourceMode === "file" ? fileModeContent : urlModeContent}
    </div>
  );

  let confirmLabel = "Add Product";
  if (productForm.product_id) {
    if (savingProduct) {
      confirmLabel = "Saving Changes...";
    } else {
      confirmLabel = "Save Changes";
    }
  } else {
    if (savingProduct) {
      confirmLabel = "Adding Product...";
    } else {
      confirmLabel = "Add Product";
    }
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

  let activeProductToggle = null;
  if (productForm.product_id) {
    activeProductToggle = (
      <label className="flex items-start gap-2.5 py-1.5 text-xs font-medium text-[#171717] cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(productForm.is_active)}
          onChange={function onActiveCheck(event) {
            updateProductField("is_active", event.target.checked);
          }}
          className="mt-0.5 h-4 w-4 rounded border-[#E9E9E9] text-[#171717] focus:ring-[#B9F36B]/30 accent-[#171717]"
        />
        <div>
          <span>Active product (available on POS screen)</span>
          <p className="text-2xs font-normal text-[#777777] mt-0.5">
            Uncheck to archive or hide from sales without deleting history
          </p>
        </div>
      </label>
    );
  }

  function handleExportCsv() {
    const headers = [
      { key: "product_name", label: "product_name" },
      { key: "barcode", label: "barcode" },
      { key: "category", label: "category" },
      { key: "description", label: "description" },
      { key: "image_url", label: "image_url" },
      { key: "base_unit", label: "base_unit" },
      { key: "cost_price", label: "cost_price" },
      { key: "selling_price", label: "selling_price" },
      { key: "current_stock", label: "current_stock" },
      { key: "reorder_level", label: "reorder_level" },
      { key: "allow_custom_amount", label: "allow_custom_amount" },
      { key: "is_active", label: "is_active" }
    ];

    const categoryMap = new Map();
    for (let c = 0; c < categories.length; c = c + 1) {
      categoryMap.set(categories[c].category_id, categories[c].category_name);
    }

    const rows = products.map(function (p) {
      let catName = "";
      if (p.category_id && categoryMap.has(p.category_id)) {
        catName = categoryMap.get(p.category_id);
      }
      return {
        product_name: p.product_name,
        barcode: p.barcode || "",
        category: catName,
        description: p.description || "",
        image_url: p.image_url || "",
        base_unit: p.base_unit,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        current_stock: p.current_stock,
        reorder_level: p.reorder_level,
        allow_custom_amount: Boolean(p.allow_custom_amount),
        is_active: Boolean(p.is_active)
      };
    });

    const today = new Date().toISOString().slice(0, 10);
    exportToCsv("products_inventory_" + today, headers, rows);
  }

  function handleDownloadTemplate() {
    const headers = [
      { key: "product_name", label: "product_name" },
      { key: "barcode", label: "barcode" },
      { key: "category", label: "category" },
      { key: "description", label: "description" },
      { key: "image_url", label: "image_url" },
      { key: "base_unit", label: "base_unit" },
      { key: "cost_price", label: "cost_price" },
      { key: "selling_price", label: "selling_price" },
      { key: "current_stock", label: "current_stock" },
      { key: "reorder_level", label: "reorder_level" },
      { key: "allow_custom_amount", label: "allow_custom_amount" },
      { key: "is_active", label: "is_active" }
    ];

    const sampleRows = [
      {
        product_name: "Century Tuna Flakes in Oil 180g",
        barcode: "4800016644812",
        category: "Canned Goods",
        description: "Flakes in oil",
        image_url: "",
        base_unit: "Can",
        cost_price: "28.50",
        selling_price: "38.00",
        current_stock: "24",
        reorder_level: "5",
        allow_custom_amount: "false",
        is_active: "true"
      },
      {
        product_name: "Coca-Cola Regular 330ml",
        barcode: "4800000000012",
        category: "Beverages",
        description: "Carbonated soda",
        image_url: "",
        base_unit: "Can",
        cost_price: "22.00",
        selling_price: "30.00",
        current_stock: "48",
        reorder_level: "10",
        allow_custom_amount: "false",
        is_active: "true"
      }
    ];

    exportToCsv("product_import_template", headers, sampleRows);
  }

  async function handleImportSubmit(event) {
    event.preventDefault();
    if (!importFile) {
      setImportError("Please select a .csv file to import.");
      return;
    }
    if (!importFile.name.toLowerCase().endsWith(".csv")) {
      setImportError("Only CSV files (.csv) are supported for product import.");
      return;
    }
    setImportError("");
    setImportSubmitting(true);
    try {
      const result = await api.importProductsCsv(importFile, importUpdateExisting);
      setImportModalOpen(false);
      setImportFile(null);
      setImportUpdateExisting(false);
      let msg = "Successfully imported " + result.imported_count + " products.";
      if (result.created_count !== undefined && result.updated_count !== undefined) {
        msg = "Successfully imported " + result.imported_count + " products (" + result.created_count + " created, " + result.updated_count + " updated).";
      }
      setSuccessBanner(msg);
      await loadAll();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <PageHeader title="Inventory" stackOnMobile={true}>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="secondary" onClick={handleExportCsv} title="Export existing products to CSV">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          {canWrite && (
            <Button
              variant="secondary"
              onClick={function openImport() {
                setImportError("");
                setImportFile(null);
                setImportUpdateExisting(false);
                setImportModalOpen(true);
              }}
              title="Bulk import products from CSV"
            >
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </Button>
          )}
          {canWrite && (
            <Button
              variant="secondary"
              onClick={function openCat() {
                setModalError("");
                setCategoryModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Category</span>
            </Button>
          )}
          {canWrite && (
            <Button variant="primary" onClick={openCreateProduct}>
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {successBanner && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800">
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={function () {
              setSuccessBanner("");
            }}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Low Stock Filter Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products or barcode..."
          className="flex-1 min-w-56 sm:min-w-64 max-w-md"
        />
        <FilterPill
          label="Low Stock"
          count={lowStockCount}
          active={lowStockOnly}
          onClick={function toggleLowStock() {
            setLowStockOnly(!lowStockOnly);
          }}
        />
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
              <th className="px-5 py-3 whitespace-nowrap">Unit</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">Cost</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">Price</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">Stock</th>
              {canWrite && <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>}
            </tr>
          }
        >
          {productTableBody}
        </DataTable>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        open={productModalOpen}
        dismissDisabled={savingProduct}
        size="3xl"
        onClose={function close() {
          setProductModalOpen(false);
          setFieldErrors({});
          setTouchedFields({});
        }}
        title={productModalTitle}
      >
        <form onSubmit={handleSaveProduct}>
          <ErrorBanner message={modalError} className="mb-4" />
          <fieldset disabled={savingProduct} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Core Product Details */}
              <div className="lg:col-span-7 space-y-6">
                {/* Section 1: Basic Details */}
            <div>
              <div className="border-b border-[#E9E9E9] pb-1.5 mb-3">
                <span className="text-2xs font-semibold tracking-wider text-[#777777] uppercase">
                  Basic Details
                </span>
              </div>
              <div className="space-y-4">
                <Input
                  label="Product Name *"
                  placeholder="e.g., San Miguel Pale Pilsen 330ml"
                  value={productForm.product_name}
                  error={fieldErrors.product_name}
                  onChange={function onChange(event) {
                    handleProductFieldChange("product_name", event.target.value);
                  }}
                  onBlur={function onBlur() {
                    handleProductFieldBlur("product_name");
                  }}
                  required={true}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Category (optional)"
                    value={productForm.category_id}
                    onChange={function onChange(event) {
                      handleProductFieldChange("category_id", event.target.value);
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
                  <Input
                    label="Barcode (optional)"
                    mono={true}
                    placeholder="Scan or enter barcode"
                    value={productForm.barcode}
                    onChange={function onChange(event) {
                      handleProductFieldChange("barcode", event.target.value);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Unit */}
            <div>
              <div className="border-b border-[#E9E9E9] pb-1.5 mb-3">
                <span className="text-2xs font-semibold tracking-wider text-[#777777] uppercase">
                  Pricing & Unit
                </span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="Base Unit *"
                    value={productForm.base_unit}
                    error={fieldErrors.base_unit}
                    onChange={function onChange(event) {
                      handleProductFieldChange("base_unit", event.target.value);
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
                    label="Cost Price (₱) *"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={productForm.cost_price}
                    error={fieldErrors.cost_price}
                    onChange={function onChange(event) {
                      handleProductFieldChange("cost_price", event.target.value);
                    }}
                    onBlur={function onBlur() {
                      handleProductFieldBlur("cost_price");
                    }}
                    required={true}
                  />
                  <Input
                    label="Selling Price (₱) *"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={productForm.selling_price}
                    error={fieldErrors.selling_price}
                    onChange={function onChange(event) {
                      handleProductFieldChange("selling_price", event.target.value);
                    }}
                    onBlur={function onBlur() {
                      handleProductFieldBlur("selling_price");
                    }}
                    required={true}
                  />
                </div>
                {profitPreviewElement}
              </div>
            </div>

            {/* Section 3: Inventory & Stock Tracking */}
            <div>
              <div className="border-b border-[#E9E9E9] pb-1.5 mb-3">
                <span className="text-2xs font-semibold tracking-wider text-[#777777] uppercase">
                  Inventory Tracking
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {initialStockField}
                <Input
                  label="Reorder Level (optional)"
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="5"
                  helper="Alerts when stock reaches this level"
                  value={productForm.reorder_level}
                  error={fieldErrors.reorder_level}
                  onChange={function onChange(event) {
                    handleProductFieldChange("reorder_level", event.target.value);
                  }}
                  onBlur={function onBlur() {
                    handleProductFieldBlur("reorder_level");
                  }}
                />
              </div>
            </div>

              </div>

              {/* Right Column: Media & Preferences */}
              <div className="lg:col-span-5 space-y-6">
                {/* Section 4: Media & Preferences */}
            <div>
              <div className="border-b border-[#E9E9E9] pb-1.5 mb-3">
                <span className="text-2xs font-semibold tracking-wider text-[#777777] uppercase">
                  Media & Preferences
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#171717]">
                    Product Image <span className="text-[#777777] font-normal text-2xs">(optional)</span>
                  </label>
                  {imagePreviewSection}
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2.5 py-1 text-xs font-medium text-[#171717] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.allow_custom_amount}
                      onChange={function onCheck(event) {
                        updateProductField("allow_custom_amount", event.target.checked);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-[#E9E9E9] text-[#171717] focus:ring-[#B9F36B]/30 accent-[#171717]"
                    />
                    <div>
                      <span>Allow custom peso amount ("Tingi")</span>
                      <p className="text-2xs font-normal text-[#777777] mt-0.5">
                        Permits selling partial or arbitrary peso amounts at checkout
                      </p>
                    </div>
                  </label>

                  {activeProductToggle}
                </div>
              </div>
            </div>

              </div>
            </div>

            <div className="pt-2 border-t border-[#E9E9E9]">
              <FormActions
              onCancel={function cancel() {
                setProductModalOpen(false);
                setFieldErrors({});
                setTouchedFields({});
              }}
              confirmLabel={confirmLabel}
              disabled={savingProduct}
            />
          </div>
        </fieldset>
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
          <ErrorBanner message={modalError} />
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
          <ErrorBanner message={modalError} />
          {optionsListContent}

          <form onSubmit={handleAddOption} className="space-y-4 border-t border-[#E9E9E9] pt-4">
            <div className="text-xs font-semibold text-[#171717]">Add Selling Option</div>
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
        saving={savingStock}
        errorMessage={modalError}
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
        saving={savingStock}
        errorMessage={modalError}
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
            <span className="font-semibold text-[#171717]">{deleteProductName}</span>? This
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
            role="menu"
            style={{ top: actionMenu.top, right: actionMenu.right }}
            className="fixed w-44 rounded-xl border border-[#E9E9E9] bg-white p-1 shadow-lg"
            onClick={function stopPropagation(event) {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={function handleEdit() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                openEditProduct(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#EEEEED] transition-colors cursor-pointer text-left"
            >
              <Pencil className="h-3.5 w-3.5 text-[#777777]" />
              <span>Edit Product</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={function handleOptions() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                openOptionsModal(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#EEEEED] transition-colors cursor-pointer text-left"
            >
              <Layers className="h-3.5 w-3.5 text-[#777777]" />
              <span>Selling Options</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={function handleAdjust() {
                const targetProduct = actionMenu.product;
                setActionMenu(null);
                openAdjustModal(targetProduct);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#EEEEED] transition-colors cursor-pointer text-left"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#777777]" />
              <span>Adjust Stock</span>
            </button>

            <div className="my-1 border-t border-[#E9E9E9]" />

            <button
              type="button"
              role="menuitem"
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
      {/* Import Products from CSV Modal */}
      <Modal
        open={importModalOpen}
        onClose={function closeImport() {
          if (!importSubmitting) {
            setImportModalOpen(false);
          }
        }}
        title="Import Products from CSV"
        size="md"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="rounded-xl bg-[#F5F5F4] p-3.5 text-xs text-[#777777] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#171717]">Need a starter spreadsheet?</span>
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-2xs"
              >
                <Download className="h-3 w-3 mr-1" />
                <span>Download Template</span>
              </Button>
            </div>
            <p className="text-2xs leading-relaxed text-[#777777]">
              Required columns: <span className="font-mono text-[#171717]">product_name</span>, <span className="font-mono text-[#171717]">base_unit</span>, <span className="font-mono text-[#171717]">selling_price</span>.
              Optional: <span className="font-mono text-[#171717]">barcode, category, description, image_url, cost_price, current_stock, reorder_level, allow_custom_amount, is_active</span>.
            </p>
          </div>

          {importError && (
            <div className="whitespace-pre-line">
              <ErrorBanner message={importError} />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1.5">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={importSubmitting}
              onChange={function (e) {
                if (e.target.files && e.target.files[0]) {
                  setImportFile(e.target.files[0]);
                  setImportError("");
                }
              }}
              className="block w-full text-xs text-[#777777] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#171717] file:text-white hover:file:bg-[#333333] file:cursor-pointer cursor-pointer border border-[#E9E9E9] rounded-xl p-2 bg-white"
            />
            {importFile && (
              <p className="mt-1 text-2xs text-[#777777]">
                Selected: <span className="font-semibold text-[#171717]">{importFile.name}</span> ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 pt-1 text-xs text-[#171717] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={importUpdateExisting}
              disabled={importSubmitting}
              onChange={function (e) {
                setImportUpdateExisting(e.target.checked);
              }}
              className="mt-0.5 h-4 w-4 rounded border-[#E9E9E9] text-[#171717] focus:ring-[#B9F36B]/30 accent-[#171717]"
            />
            <div>
              <span className="font-medium">Update existing products if barcode matches</span>
              <p className="text-2xs text-[#777777]">
                When checked, existing products with the same barcode will be updated. When unchecked, existing barcodes are blocked to prevent accidental overwrites.
              </p>
            </div>
          </label>

          <FormActions
            onCancel={function () {
              setImportModalOpen(false);
            }}
            confirmLabel={importSubmitting ? "Importing Products..." : "Import Products"}
            submitting={importSubmitting}
            className="pt-2"
          />
        </form>
      </Modal>

    </PageLayout>
  );
}
