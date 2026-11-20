import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Bell,
  Minus,
  Plus,
  ScanBarcode,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  XCircle
} from "lucide-react";
import { api } from "../api.js";
import { computeLocalCartTotals } from "../cart.js";
import { formatPeso, formatQuantity } from "../format.js";
import { getStockLevel, filterProducts, STOCK_LEVELS } from "../products.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { ReceiptView } from "../components/ReceiptView.jsx";
import { PosCheckoutModal } from "../components/PosCheckoutModal.jsx";

function getStockTextClass(product) {
  const stockLevel = getStockLevel(product);
  if (stockLevel === STOCK_LEVELS.OUT) {
    return "text-rose-600";
  }
  if (stockLevel === STOCK_LEVELS.LOW) {
    return "text-amber-600";
  }
  return "text-emerald-600";
}

function buildCartKey(productId, optionId, customAmount) {
  if (customAmount !== null && customAmount !== undefined) {
    return productId + ":custom:" + String(Date.now()) + ":" + String(Math.random());
  }
  if (optionId) {
    return productId + ":opt:" + optionId;
  }
  return productId + ":base";
}

export function PosPage() {
  const searchInputRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedCategoryRef = useRef(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  const [cartItems, setCartItems] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [pickerState, setPickerState] = useState(null);
  const [customPesoInput, setCustomPesoInput] = useState("");

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");

  const [lowStockModalOpen, setLowStockModalOpen] = useState(false);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [cashPartInput, setCashPartInput] = useState("");
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);

  const [completedReceipt, setCompletedReceipt] = useState(null);

  async function loadCatalog() {
    setErrorBanner("");
    try {
      const results = await Promise.all([
        api.listProducts(),
        api.listCategories(),
        api.listLowStockProducts()
      ]);
      const activeProducts = [];
      for (let index = 0; index < results[0].length; index++) {
        if (results[0][index].is_active) {
          activeProducts.push(results[0][index]);
        }
      }
      setProducts(activeProducts);
      setCategories(results[1]);
      setLowStockProducts(results[2]);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(function initLoad() {
    loadCatalog();
  }, []);

  useEffect(function bindCtrlKShortcut() {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function addItemToCart(product, option, customAmount) {
    setErrorBanner("");
    if (product.current_stock <= 0) {
      setErrorBanner(product.product_name + " is out of stock");
      return;
    }

    let optionIdForKey = null;
    if (option) {
      optionIdForKey = option.option_id;
    }
    const key = buildCartKey(product.product_id, optionIdForKey, customAmount);
    setCartItems(function updateCart(previous) {
      const next = [];
      let found = false;
      for (let index = 0; index < previous.length; index++) {
        const existing = previous[index];
        if (existing.key === key && existing.custom_amount === null) {
          found = true;
          next.push(
            Object.assign({}, existing, {
              quantity: existing.quantity + 1
            })
          );
        } else {
          next.push(existing);
        }
      }

      if (!found) {
        let label = "1 " + product.base_unit;
        let unitPrice = product.selling_price;
        let optionId = null;
        let customValue = null;

        if (customAmount !== null && customAmount !== undefined) {
          customValue = Number(customAmount);
          unitPrice = customValue;
          label = "Custom (" + formatPeso(customValue) + ")";
        } else if (option) {
          optionId = option.option_id;
          unitPrice = option.price;
          label = option.option_name;
        }

        next.push({
          key: key,
          product_id: product.product_id,
          product_name: product.product_name,
          image_url: product.image_url,
          option_id: optionId,
          option_label: label,
          custom_amount: customValue,
          unit_price: unitPrice,
          quantity: 1
        });
      }
      return next;
    });
  }

  async function handleProductCardClick(product) {
    setErrorBanner("");
    if (product.current_stock <= 0) {
      setErrorBanner(product.product_name + " is out of stock");
      return;
    }

    try {
      const options = await api.listSellingOptions(product.product_id);
      const activeOptions = [];
      for (let index = 0; index < options.length; index++) {
        if (options[index].is_active) {
          activeOptions.push(options[index]);
        }
      }

      if (activeOptions.length > 0 || product.allow_custom_amount) {
        setCustomPesoInput("");
        setPickerState({
          product: product,
          options: activeOptions
        });
        return;
      }

      addItemToCart(product, null, null);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  async function handleSearchKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      return;
    }
    event.preventDefault();
    try {
      const match = await api.lookupBarcode(trimmed);
      addItemToCart(match.product, match.option, null);
      setSearchQuery("");
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  function changeCartItemQty(itemKey, delta) {
    setCartItems(function update(previous) {
      const next = [];
      for (let index = 0; index < previous.length; index++) {
        const item = previous[index];
        if (item.key === itemKey) {
          const nextQty = item.quantity + delta;
          if (nextQty > 0) {
            next.push(Object.assign({}, item, { quantity: nextQty }));
          }
        } else {
          next.push(item);
        }
      }
      return next;
    });
  }

  function removeCartItem(itemKey) {
    setCartItems(function update(previous) {
      const next = [];
      for (let index = 0; index < previous.length; index++) {
        if (previous[index].key !== itemKey) {
          next.push(previous[index]);
        }
      }
      return next;
    });
  }

  function clearCart() {
    setCartItems([]);
    setOrderDiscount(0);
    setErrorBanner("");
  }

  function openCheckoutModal() {
    if (cartItems.length === 0) {
      return;
    }
    setErrorBanner("");
    setAmountPaidInput(String(totals.total));
    setCashPartInput("");
    setCheckoutModalOpen(true);
  }

  async function handleCompleteSale(event) {
    event.preventDefault();
    setSubmittingSale(true);
    setErrorBanner("");

    try {
      const payloadItems = [];
      for (let index = 0; index < cartItems.length; index++) {
        const item = cartItems[index];
        if (item.custom_amount !== null) {
          payloadItems.push({
            product_id: item.product_id,
            custom_amount: item.custom_amount
          });
        } else {
          payloadItems.push({
            product_id: item.product_id,
            option_id: item.option_id,
            quantity: item.quantity
          });
        }
      }

      const payload = {
        items: payloadItems,
        discount_amount: totals.discount,
        payment_method: paymentMethod,
        created_by: "owner"
      };

      if (paymentMethod === "CASH") {
        payload.amount_paid = Number(amountPaidInput);
      } else if (paymentMethod === "CREDIT") {
        payload.customer_id = customerIdInput.trim();
      } else {
        const cashPart = Number(cashPartInput);
        const creditPart = Math.round((totals.total - cashPart) * 100) / 100;
        payload.customer_id = customerIdInput.trim();
        payload.cash_amount = cashPart;
        payload.credit_amount = creditPart;
        payload.amount_paid = Number(amountPaidInput);
      }

      const result = await api.processSale(payload);
      setCheckoutModalOpen(false);
      clearCart();
      setCompletedReceipt(result);
      await loadCatalog();
    } catch (error) {
      setErrorBanner(error.message);
    } finally {
      setSubmittingSale(false);
    }
  }

  const categoryProducts = [];
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    if (selectedCategoryId !== "ALL" && product.category_id !== selectedCategoryId) {
      continue;
    }
    categoryProducts.push(product);
  }
  const filteredProducts = filterProducts(categoryProducts, searchQuery);

  const totals = computeLocalCartTotals(cartItems, orderDiscount);

  let cashDueForChange = totals.total;
  if (paymentMethod === "SPLIT") {
    const parsedCashPart = Number(cashPartInput);
    if (Number.isFinite(parsedCashPart) && parsedCashPart > 0) {
      cashDueForChange = parsedCashPart;
    } else {
      cashDueForChange = 0;
    }
  }
  const tenderedValue = Number(amountPaidInput);
  let changePreview = 0;
  if (Number.isFinite(tenderedValue) && tenderedValue > cashDueForChange) {
    changePreview = Math.round((tenderedValue - cashDueForChange) * 100) / 100;
  }

  let errorElement = <ErrorBanner message={errorBanner} className="relative z-[60] mb-4" />;

  let lowStockBadge = null;
  if (lowStockProducts.length > 0) {
    lowStockBadge = (
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 font-mono text-2xs font-bold text-white">
        {lowStockProducts.length}
      </span>
    );
  }

  let discountSummaryRow = null;
  if (totals.discount > 0) {
    discountSummaryRow = (
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Discount</span>
        <span className="font-mono font-medium text-blue-600">
          -{formatPeso(totals.discount)}
        </span>
      </div>
    );
  }

  function handleCategoryMouseDown(event) {
    if (event.button !== 0 || !categoryScrollRef.current) {
      return;
    }
    hasDraggedCategoryRef.current = false;
    dragStartXRef.current = event.pageX;
    dragScrollLeftRef.current = categoryScrollRef.current.scrollLeft;

    function handleWindowMouseMove(moveEvent) {
      if (!categoryScrollRef.current) {
        return;
      }
      const distance = moveEvent.pageX - dragStartXRef.current;
      if (Math.abs(distance) > 5) {
        hasDraggedCategoryRef.current = true;
      }
      categoryScrollRef.current.scrollLeft = dragScrollLeftRef.current - distance;
    }

    function handleWindowMouseUp() {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      setTimeout(function resetDragFlag() {
        hasDraggedCategoryRef.current = false;
      }, 0);
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  }

  function handleSelectCategory(categoryId) {
    if (hasDraggedCategoryRef.current) {
      return;
    }
    setSelectedCategoryId(categoryId);
  }

  const categoryContainerClass =
    "mb-6 flex items-center gap-2.5 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none";

  let allCategoryClass =
    "shrink-0 rounded-lg px-4 py-2 text-xs font-medium cursor-pointer ";
  if (selectedCategoryId === "ALL") {
    allCategoryClass = allCategoryClass + "bg-blue-600 font-semibold text-white";
  } else {
    allCategoryClass =
      allCategoryClass + "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";
  }

  let productGridContent = null;
  if (filteredProducts.length === 0) {
    productGridContent = (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
        No products found. Add items in Products.
      </div>
    );
  } else {
    productGridContent = (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map(function renderCard(product) {
          return (
            <button
              key={product.product_id}
              type="button"
              onClick={function onCardClick() {
                handleProductCardClick(product);
              }}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm cursor-pointer"
            >
              <ProductThumb imageUrl={product.image_url} name={product.product_name} />
              <div className="mt-3 truncate text-sm font-semibold text-slate-900">
                {product.product_name}
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                {formatPeso(product.selling_price)}
              </div>
              <div className={"mt-1.5 font-mono text-xs font-medium " + getStockTextClass(product)}>
                Stock: {formatQuantity(product.current_stock)} {product.base_unit}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  let cartListContent = null;
  if (cartItems.length === 0) {
    cartListContent = (
      <div className="py-16 text-center text-sm text-slate-400">
        Tap a product or scan a barcode
      </div>
    );
  } else {
    cartListContent = cartItems.map(function renderCartItem(item) {
      const lineSubtotal = Math.round(item.unit_price * item.quantity * 100) / 100;
      let qtyControl = <span className="font-mono text-xs text-slate-500">Tingi</span>;
      if (item.custom_amount === null) {
        qtyControl = (
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={function dec() {
                changeCartItemQty(item.key, -1);
              }}
              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-900 active:bg-slate-200 cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-8 text-center font-mono text-xs font-semibold text-slate-900">
              {formatQuantity(item.quantity)}
            </span>
            <button
              type="button"
              onClick={function inc() {
                changeCartItemQty(item.key, 1);
              }}
              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-900 active:bg-slate-200 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }

      return (
        <div key={item.key} className="flex items-center gap-3.5 py-3.5">
          <ProductThumb imageUrl={item.image_url} name={item.product_name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">
              {item.product_name}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{item.option_label}</div>
            <div className="mt-2 flex items-center gap-2">{qtyControl}</div>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <button
              type="button"
              onClick={function remove() {
                removeCartItem(item.key);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="font-mono text-sm font-bold text-slate-900">
              {formatPeso(lineSubtotal)}
            </div>
          </div>
        </div>
      );
    });
  }

  let pickerTitle = "";
  let pickerBody = null;
  if (pickerState) {
    pickerTitle = pickerState.product.product_name;
    let tingiForm = null;
    if (pickerState.product.allow_custom_amount) {
      tingiForm = (
        <form
          onSubmit={function submitTingi(event) {
            event.preventDefault();
            const parsed = Number(customPesoInput);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              return;
            }
            addItemToCart(pickerState.product, null, parsed);
            setPickerState(null);
          }}
          className="border-t border-slate-200 pt-4 space-y-4"
        >
          <Input
            label="Custom Peso Amount (Tingi)"
            type="number"
            step="0.01"
            min="0.01"
            value={customPesoInput}
            onChange={function onChange(event) {
              setCustomPesoInput(event.target.value);
            }}
            placeholder="e.g. 10.00"
          />
          <Button type="submit" variant="primary" className="w-full">
            Add Custom Amount
          </Button>
        </form>
      );
    }

    pickerBody = (
      <div className="space-y-5">
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={function pickBase() {
              addItemToCart(pickerState.product, null, null);
              setPickerState(null);
            }}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
          >
            <span className="text-sm font-medium text-slate-900">
              1 {pickerState.product.base_unit} (Default)
            </span>
            <span className="font-mono text-sm font-bold text-blue-700">
              {formatPeso(pickerState.product.selling_price)}
            </span>
          </button>

          {pickerState.options.map(function renderOption(option) {
            return (
              <button
                key={option.option_id}
                type="button"
                onClick={function pickOption() {
                  addItemToCart(pickerState.product, option, null);
                  setPickerState(null);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{option.option_name}</div>
                  <div className="mt-0.5 font-mono text-xs text-slate-500">
                    {formatQuantity(option.quantity)} {pickerState.product.base_unit}
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-blue-700">
                  {formatPeso(option.price)}
                </span>
              </button>
            );
          })}
        </div>
        {tingiForm}
      </div>
    );
  }

  let lowStockBody = (
    <div className="py-10 text-center text-sm text-slate-500">All products are stocked.</div>
  );
  if (lowStockProducts.length > 0) {
    lowStockBody = (
      <div className="divide-y divide-slate-100">
        {lowStockProducts.map(function renderLowStock(product) {
          return (
            <div key={product.product_id} className="flex items-center justify-between py-3.5">
              <div>
                <div className="text-sm font-semibold text-slate-900">{product.product_name}</div>
                <div className="mt-0.5 font-mono text-xs text-slate-500">
                  Reorder at {formatQuantity(product.reorder_level)} {product.base_unit}
                </div>
              </div>
              <Badge tone="amber" className="font-mono">
                {formatQuantity(product.current_stock)} {product.base_unit}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  let receiptBody = null;
  if (completedReceipt) {
    receiptBody = (
      <ReceiptView sale={completedReceipt.sale} items={completedReceipt.items} />
    );
  }

  const cartFooterContent = (
    <div className="space-y-4 pt-2">
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-mono font-medium text-slate-900">
            {formatPeso(totals.subtotal)}
          </span>
        </div>
        {discountSummaryRow}
        <div className="flex items-center justify-between pt-2">
          <span className="text-base font-bold text-slate-900">Total</span>
          <span className="font-mono text-xl font-bold text-slate-900">
            {formatPeso(totals.total)}
          </span>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        disabled={cartItems.length === 0}
        onClick={function handleCheckout() {
          setMobileCartOpen(false);
          openCheckoutModal();
        }}
        className="w-full justify-between px-5 py-3.5 text-base"
      >
        <span>Checkout</span>
        <span className="font-mono font-bold">{formatPeso(totals.total)}</span>
      </Button>

      <div className="grid grid-cols-1 gap-2">
        {[{ key: "CASH", label: "Cash", icon: Banknote }].map(function renderMethod(method) {
          const IconComponent = method.icon;
          const isSelected = paymentMethod === method.key;
          let btnClass =
            "flex flex-col items-center gap-1.5 rounded-lg border py-2 text-xs font-medium cursor-pointer ";
          if (isSelected) {
            btnClass = btnClass + "border-blue-600 bg-blue-50 text-blue-700";
          } else {
            btnClass = btnClass + "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
          }
          return (
            <button
              key={method.key}
              type="button"
              onClick={function selectMethod() {
                setPaymentMethod(method.key);
              }}
              className={btnClass}
            >
              <IconComponent className="h-4 w-4" />
              <span>{method.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  let mobileCartBar = null;
  if (cartItems.length > 0) {
    mobileCartBar = (
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={function openMobileCart() {
            setMobileCartOpen(true);
          }}
          className="flex w-full items-center justify-between rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md active:bg-blue-700 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span>Cart ({cartItems.length})</span>
          </div>
          <span className="font-mono text-sm font-bold">{formatPeso(totals.total)} →</span>
        </button>
      </div>
    );
  }

  let mobileCartModal = (
    <Modal
      open={mobileCartOpen}
      onClose={function closeMobileCart() {
        setMobileCartOpen(false);
      }}
      title={"Current Sale (" + String(cartItems.length) + ")"}
      size="sm"
    >
      <div className="flex flex-col space-y-4">
        <div className="max-h-[45vh] overflow-y-auto divide-y divide-slate-100 pr-1">
          {cartListContent}
        </div>
        {cartFooterContent}
      </div>
    </Modal>
  );

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-slate-50">
      {/* Center Catalog Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-7">
        {/* Top Search & Low Stock Bar */}
        <div className="mb-5 flex items-center gap-3.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={function onChange(event) {
                setSearchQuery(event.target.value);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by product or scan barcode..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-20 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-tiny text-slate-400">
              Ctrl K
            </span>
          </div>

          <button
            type="button"
            onClick={function openLowStock() {
              setLowStockModalOpen(true);
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Low Stock Alerts"
          >
            <Bell className="h-4 w-4" />
            {lowStockBadge}
          </button>
        </div>

        {errorElement}

        {/* Category Filter Pills */}
        <div
          ref={categoryScrollRef}
          onMouseDown={handleCategoryMouseDown}
          onWheel={function handleCategoryWheel(event) {
            if (event.deltaY !== 0) {
              event.currentTarget.scrollLeft = event.currentTarget.scrollLeft + event.deltaY;
            }
          }}
          className={categoryContainerClass}
        >
          <button
            type="button"
            onClick={function selectAll() {
              handleSelectCategory("ALL");
            }}
            className={allCategoryClass}
          >
            All
          </button>
          {categories.map(function renderCategory(category) {
            const isSelected = selectedCategoryId === category.category_id;
            let pillClass =
              "shrink-0 rounded-lg px-4 py-2 text-xs font-medium cursor-pointer ";
            if (isSelected) {
              pillClass = pillClass + "bg-blue-600 font-semibold text-white";
            } else {
              pillClass =
                pillClass + "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";
            }
            return (
              <button
                key={category.category_id}
                type="button"
                onClick={function selectCat() {
                  handleSelectCategory(category.category_id);
                }}
                className={pillClass}
              >
                {category.category_name}
              </button>
            );
          })}
        </div>

        {/* 4-Column Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">{productGridContent}</div>

        {/* Bottom Quick Action Bar */}
        <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 pt-2">
          <Button
            variant="soft"
            size="lg"
            onClick={function focusBarcode() {
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }}
            className="text-xs sm:text-sm px-2 sm:px-4"
          >
            <ScanBarcode className="h-4 w-4 shrink-0" />
            <span className="truncate">Scan Barcode</span>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={function openDiscount() {
              setDiscountDraft(String(orderDiscount));
              setDiscountModalOpen(true);
            }}
            className="text-xs sm:text-sm px-2 sm:px-4"
          >
            <Tag className="h-4 w-4 shrink-0" />
            <span className="truncate">Discount</span>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={clearCart}
            className="text-xs sm:text-sm px-2 sm:px-4"
          >
            <XCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">Clear Sale</span>
          </Button>
        </div>
      </div>

      {/* Right Current Sale Cart Panel (Desktop) */}
      <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-base font-bold text-slate-900">
            Current Sale (<span className="font-mono">{cartItems.length}</span>)
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-6">
          {cartListContent}
        </div>

        <div className="border-t border-slate-200 p-6">
          {cartFooterContent}
        </div>
      </aside>

      {mobileCartBar}
      {mobileCartModal}

      {/* Selling Option / Tingi Picker Modal */}
      <Modal
        open={pickerState !== null}
        onClose={function closePicker() {
          setPickerState(null);
        }}
        title={pickerTitle}
        size="sm"
      >
        {pickerBody}
      </Modal>

      {/* Order Discount Modal */}
      <Modal
        open={discountModalOpen}
        onClose={function closeDiscount() {
          setDiscountModalOpen(false);
        }}
        title="Apply Order Discount"
        size="sm"
      >
        <form
          onSubmit={function saveDiscount(event) {
            event.preventDefault();
            const parsed = Number(discountDraft);
            if (!Number.isFinite(parsed) || parsed < 0) {
              setOrderDiscount(0);
            } else {
              setOrderDiscount(parsed);
            }
            setDiscountModalOpen(false);
          }}
          className="space-y-5"
        >
          <Input
            label="Discount Amount (₱)"
            type="number"
            step="0.01"
            min="0"
            value={discountDraft}
            onChange={function onChange(event) {
              setDiscountDraft(event.target.value);
            }}
            placeholder="0.00"
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={function cancel() {
                setDiscountModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Apply
            </Button>
          </div>
        </form>
      </Modal>

      {/* Low Stock Alerts Modal */}
      <Modal
        open={lowStockModalOpen}
        onClose={function closeLowStock() {
          setLowStockModalOpen(false);
        }}
        title="Low Stock Alerts"
      >
        {lowStockBody}
      </Modal>

      {/* Checkout Payment Modal */}
      <PosCheckoutModal
        open={checkoutModalOpen}
        onClose={function closeCheckout() {
          setCheckoutModalOpen(false);
        }}
        paymentMethod={paymentMethod}
        total={totals.total}
        amountPaid={amountPaidInput}
        onAmountPaidChange={setAmountPaidInput}
        customerId={customerIdInput}
        onCustomerIdChange={setCustomerIdInput}
        cashPart={cashPartInput}
        onCashPartChange={setCashPartInput}
        changePreview={changePreview}
        submitting={submittingSale}
        onSubmit={handleCompleteSale}
      />

      {/* Receipt Preview Modal */}
      <Modal
        open={completedReceipt !== null}
        onClose={function closeReceipt() {
          setCompletedReceipt(null);
        }}
        title="Sale Completed"
        size="sm"
      >
        {receiptBody}
      </Modal>
    </div>
  );
}
