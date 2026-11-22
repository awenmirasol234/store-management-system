import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ScanBarcode,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  Wallet,
  XCircle
} from "lucide-react";
import { api } from "../api.js";
import {
  calculateProductCartStockUsage,
  canAddStockToCart,
  computeItemBaseQuantity,
  computeLocalCartTotals
} from "../cart.js";
import { formatPeso, formatQuantity } from "../format.js";
import { getStockLevel, filterProducts, STOCK_LEVELS } from "../products.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { FormActions } from "../components/FormActions.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { PaymentMethodToggle } from "../components/PaymentMethodToggle.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { ReceiptView } from "../components/ReceiptView.jsx";
import { PosCheckoutModal } from "../components/PosCheckoutModal.jsx";

function buildCartKey(productId, optionId, customAmount) {
  if (customAmount !== null && customAmount !== undefined) {
    return productId + ":custom:" + String(Date.now()) + ":" + String(Math.random());
  }
  if (optionId) {
    return productId + ":opt:" + optionId;
  }
  return productId + ":base";
}

export function PosPage(props) {
  const searchInputRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedCategoryRef = useRef(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  let initialCart = [];
  if (props && props.initialCartItems) {
    initialCart = props.initialCartItems;
  }
  const [cartItems, setCartItems] = useState(initialCart);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [pickerState, setPickerState] = useState(null);
  const [customPesoInput, setCustomPesoInput] = useState("");

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");

  const [lowStockModalOpen, setLowStockModalOpen] = useState(false);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(function initCartState() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return true;
    }
    return false;
  });
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [cashPartInput, setCashPartInput] = useState("");
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);

  const [completedReceipt, setCompletedReceipt] = useState(null);

  async function loadCatalog() {
    setErrorBanner("");
    try {
      let customerList = [];
      try {
        customerList = await api.listCustomers();
      } catch (customerError) {
        customerList = [];
      }

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
      setCustomers(customerList);
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

  useEffect(function bindResizeListener() {
    function handleResize() {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setCartCollapsed(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return function cleanup() {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function addItemToCart(product, option, customAmount) {
    setErrorBanner("");
    if (!product) {
      return false;
    }
    if (product.current_stock <= 0) {
      setErrorBanner(product.product_name + " is out of stock");
      return false;
    }

    const baseQuantityPerUnit = computeItemBaseQuantity({
      product: product,
      option: option,
      customAmount: customAmount,
      quantity: 1
    });

    const stockCheck = canAddStockToCart({
      cartItems: cartItems,
      product: product,
      additionalBaseQuantity: baseQuantityPerUnit
    });

    if (!stockCheck.allowed) {
      setErrorBanner(stockCheck.message);
      return false;
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
          base_unit: product.base_unit,
          current_stock: product.current_stock,
          base_quantity_per_unit: baseQuantityPerUnit,
          option_id: optionId,
          option_label: label,
          custom_amount: customValue,
          unit_price: unitPrice,
          quantity: 1
        });
      }
      return next;
    });
    return true;
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
      const added = addItemToCart(match.product, match.option, null);
      if (added) {
        setSearchQuery("");
      }
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  function changeCartItemQty(itemKey, delta) {
    setErrorBanner("");
    if (delta > 0) {
      let targetItem = null;
      for (let index = 0; index < cartItems.length; index++) {
        if (cartItems[index].key === itemKey) {
          targetItem = cartItems[index];
          break;
        }
      }

      if (!targetItem) {
        return;
      }

      let targetProduct = null;
      for (let index = 0; index < products.length; index++) {
        if (products[index].product_id === targetItem.product_id) {
          targetProduct = products[index];
          break;
        }
      }

      if (!targetProduct) {
        targetProduct = {
          product_id: targetItem.product_id,
          product_name: targetItem.product_name,
          base_unit: targetItem.base_unit,
          current_stock: targetItem.current_stock
        };
      }

      let perUnit = Number(targetItem.base_quantity_per_unit);
      if (!Number.isFinite(perUnit) || perUnit <= 0) {
        perUnit = 1;
      }
      const additionalBaseQuantity = perUnit * delta;

      const stockCheck = canAddStockToCart({
        cartItems: cartItems,
        product: targetProduct,
        additionalBaseQuantity: additionalBaseQuantity
      });

      if (!stockCheck.allowed) {
        setErrorBanner(stockCheck.message);
        return;
      }
    }

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
    setErrorBanner("");
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
    setClearConfirmOpen(false);
    setMobileCartOpen(false);
  }

  function handleRequestClearCart() {
    if (cartItems.length === 0) {
      return;
    }
    setClearConfirmOpen(true);
  }

  function handlePaymentMethodChange(newMethod) {
    setPaymentMethod(newMethod);
    if (newMethod === "CASH") {
      setAmountPaidInput(String(totals.total));
      setCashPartInput("");
    } else if (newMethod === "CREDIT") {
      setAmountPaidInput("0");
      setCashPartInput("");
    } else if (newMethod === "SPLIT") {
      const half = Math.round((totals.total / 2) * 100) / 100;
      setCashPartInput(String(half));
      setAmountPaidInput(String(half));
    }
  }

  function openCheckoutModal() {
    if (cartItems.length === 0) {
      return;
    }
    setErrorBanner("");
    if (paymentMethod === "CASH") {
      setAmountPaidInput(String(totals.total));
      setCashPartInput("");
    } else if (paymentMethod === "CREDIT") {
      setAmountPaidInput("0");
      setCashPartInput("");
    } else {
      if (!cashPartInput || Number(cashPartInput) <= 0) {
        const half = Math.round((totals.total / 2) * 100) / 100;
        setCashPartInput(String(half));
        setAmountPaidInput(String(half));
      }
    }
    setCheckoutModalOpen(true);
  }

  async function handleCompleteSale(event) {
    event.preventDefault();
    setErrorBanner("");

    if (paymentMethod !== "CASH" && customerIdInput.trim().length === 0) {
      setErrorBanner("Please select a customer for credit / utang sale");
      return;
    }

    setSubmittingSale(true);

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

      let createdBy = "owner";
      if (props && props.currentUser && props.currentUser.username) {
        createdBy = props.currentUser.username;
      }

      const payload = {
        items: payloadItems,
        discount_amount: totals.discount,
        payment_method: paymentMethod,
        created_by: createdBy
      };

      if (props.activeShift && props.activeShift.shift_id) {
        payload.shift_id = props.activeShift.shift_id;
      }

      if (paymentMethod === "CASH") {
        payload.amount_paid = Number(amountPaidInput);
      } else if (paymentMethod === "CREDIT") {
        payload.customer_id = customerIdInput.trim();
        payload.amount_paid = 0;
      } else {
        const cashPart = Number(cashPartInput);
        const creditPart = Math.round((totals.total - cashPart) * 100) / 100;
        payload.customer_id = customerIdInput.trim();
        payload.cash_amount = cashPart;
        payload.credit_amount = creditPart;
        payload.amount_paid = Number(amountPaidInput);
      }

      const result = await api.processSale(payload);
      if (props.onShiftChange) {
        props.onShiftChange();
      }
      setCheckoutModalOpen(false);
      clearCart();
      setCustomerIdInput("");
      setCashPartInput("");
      setAmountPaidInput("");
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
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-2xs font-bold text-white shadow-xs">
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
    "mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none";

  let allCategoryClass =
    "shrink-0 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-colors ";
  if (selectedCategoryId === "ALL") {
    allCategoryClass = allCategoryClass + "bg-[#151515] font-semibold text-white shadow-xs";
  } else {
    allCategoryClass =
      allCategoryClass + "bg-white text-[#777777] border border-[#E9E9E9] hover:bg-[#EEEEED] hover:text-[#151515]";
  }

  let productGridContent = null;
  if (filteredProducts.length === 0) {
    productGridContent = (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-[#E9E9E9] bg-white text-sm text-[#777777]">
        No products found. Add items in Products.
      </div>
    );
  } else {
    productGridContent = (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {filteredProducts.map(function renderCard(product) {
          let categoryName = product.base_unit;
          if (product.category_name) {
            categoryName = product.category_name;
          }
          return (
            <div
              key={product.product_id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#E9E9E9] bg-white text-left transition-all hover:border-[#151515]/30 hover:shadow-xs justify-between"
            >
              <div>
                <div
                  onClick={function onCardClick() {
                    handleProductCardClick(product);
                  }}
                  className="cursor-pointer"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EEEEED]">
                    <div className="absolute left-2 top-2 z-10 rounded-md bg-[#171717]/85 backdrop-blur-xs px-1.5 py-0.5 font-mono text-3xs sm:text-2xs font-medium text-white shadow-xs">
                      Stock: {formatQuantity(product.current_stock)}
                    </div>
                    <ProductThumb
                      imageUrl={product.image_url}
                      name={product.product_name}
                      fullBleed={true}
                    />
                  </div>
                  <div className="p-2.5 sm:p-3 pb-0 sm:pb-0">
                    <div className="truncate text-xs font-medium text-[#151515]">
                      {product.product_name}
                    </div>
                    <div className="mt-0.5 truncate text-2xs text-[#777777]">
                      {categoryName}
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold text-[#151515]">
                      {formatPeso(product.selling_price)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 pt-2.5 sm:pt-2.5">
                <button
                  type="button"
                  onClick={function onAddClick() {
                    handleProductCardClick(product);
                  }}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-[#E9E9E9] bg-white py-1.5 text-xs font-semibold text-[#151515] hover:bg-[#EEEEED] active:bg-[#E2E2E1] transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  let cartListContent = null;
  if (cartItems.length === 0) {
    cartListContent = (
      <EmptyState message="Tap a product or scan a barcode" padding="lg" tone="faint" />
    );
  } else {
    cartListContent = cartItems.map(function renderCartItem(item) {
      const lineSubtotal = Math.round(item.unit_price * item.quantity * 100) / 100;
      let qtyControl = <span className="font-mono text-xs text-[#777777]">Tingi</span>;
      if (item.custom_amount === null) {
        qtyControl = (
          <div className="inline-flex items-center rounded-lg border border-[#E9E9E9] bg-white">
            <button
              type="button"
              onClick={function dec() {
                changeCartItemQty(item.key, -1);
              }}
              className="flex h-7 w-7 items-center justify-center text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] rounded-l-lg cursor-pointer transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-8 text-center font-mono text-xs font-semibold text-[#151515]">
              {formatQuantity(item.quantity)}
            </span>
            <button
              type="button"
              onClick={function inc() {
                changeCartItemQty(item.key, 1);
              }}
              className="flex h-7 w-7 items-center justify-center text-[#151515] hover:bg-[#B9F36B]/40 rounded-r-lg cursor-pointer transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        );
      }

      return (
        <div key={item.key} className="flex items-center gap-3.5 py-3.5">
          <ProductThumb imageUrl={item.image_url} name={item.product_name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#151515]">
              {item.product_name}
            </div>
            <div className="mt-0.5 truncate text-2xs text-[#777777]">{item.option_label}</div>
            <div className="mt-2 flex items-center gap-2">{qtyControl}</div>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <button
              type="button"
              onClick={function remove() {
                removeCartItem(item.key);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#777777] hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="font-mono text-sm font-semibold text-[#151515]">
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

    let pickerErrorBanner = null;
    if (errorBanner) {
      pickerErrorBanner = <ErrorBanner message={errorBanner} className="mb-4" />;
    }

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
            const added = addItemToCart(pickerState.product, null, parsed);
            if (added) {
              setPickerState(null);
            }
          }}
          className="border-t border-[#E9E9E9] pt-4 space-y-4"
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
        {pickerErrorBanner}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={function pickBase() {
              const added = addItemToCart(pickerState.product, null, null);
              if (added) {
                setPickerState(null);
              }
            }}
            className="flex w-full items-center justify-between rounded-xl border border-[#E9E9E9] px-4 py-3 text-left hover:border-[#151515] hover:bg-[#EEEEED] transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-[#151515]">
              1 {pickerState.product.base_unit} (Default)
            </span>
            <span className="font-mono text-sm font-bold text-[#151515]">
              {formatPeso(pickerState.product.selling_price)}
            </span>
          </button>

          {pickerState.options.map(function renderOption(option) {
            return (
              <button
                key={option.option_id}
                type="button"
                onClick={function pickOption() {
                  const added = addItemToCart(pickerState.product, option, null);
                  if (added) {
                    setPickerState(null);
                  }
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[#E9E9E9] px-4 py-3 text-left hover:border-[#151515] hover:bg-[#EEEEED] transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-medium text-[#151515]">{option.option_name}</div>
                  <div className="mt-0.5 font-mono text-xs text-[#777777]">
                    {formatQuantity(option.quantity)} {pickerState.product.base_unit}
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-[#151515]">
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

  let lowStockBody = <EmptyState message="All products are stocked." padding="sm" />;
  if (lowStockProducts.length > 0) {
    lowStockBody = (
      <div className="divide-y divide-[#E9E9E9]">
        {lowStockProducts.map(function renderLowStock(product) {
          return (
            <div key={product.product_id} className="flex items-center justify-between py-3.5">
              <div>
                <div className="text-sm font-semibold text-[#151515]">{product.product_name}</div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#777777]">Subtotal</span>
          <span className="font-mono font-medium text-[#151515]">
            {formatPeso(totals.subtotal)}
          </span>
        </div>
        {discountSummaryRow}
        <div className="flex items-center justify-between pt-2">
          <span className="text-base font-bold text-[#151515]">Total</span>
          <span className="font-mono text-xl font-bold text-[#151515]">
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

      <PaymentMethodToggle
        paymentMethod={paymentMethod}
        onChange={handlePaymentMethodChange}
      />
    </div>
  );

  let mobileCartBar = null;
  if (cartItems.length > 0) {
    mobileCartBar = (
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-[#E9E9E9] bg-white/95 p-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={function openMobileCart() {
            setMobileCartOpen(true);
          }}
          className="flex w-full items-center justify-between rounded-xl bg-[#B9F36B] hover:bg-[#A8E65A] px-4 py-3 font-semibold text-[#151515] shadow-xs active:scale-[0.99] cursor-pointer transition-all"
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

  let cartErrorBanner = null;
  if (errorBanner) {
    cartErrorBanner = <ErrorBanner message={errorBanner} className="mb-2" />;
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
        {cartErrorBanner}
        <div className="flex items-center justify-between pb-2 border-b border-[#E9E9E9]">
          <span className="text-xs text-[#777777]">
            <span className="font-mono">{cartItems.length}</span> item(s) in cart
          </span>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={handleRequestClearCart}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[#777777] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>
        <div className="max-h-[45vh] overflow-y-auto divide-y divide-[#E9E9E9] pr-1">
          {cartListContent}
        </div>
        {cartFooterContent}
      </div>
    </Modal>
  );

  let shiftButton = null;
  if (props.onOpenShiftModal) {
    let shiftBadgeText = "Open Shift";
    let shiftIconClass = "text-amber-500";
    if (props.activeShift) {
      shiftBadgeText = "Shift Active";
      shiftIconClass = "text-emerald-600";
    }
    shiftButton = (
      <button
        type="button"
        onClick={props.onOpenShiftModal}
        className="flex h-11 items-center gap-2 rounded-xl border border-[#E9E9E9] bg-white px-3.5 text-xs font-medium text-[#151515] hover:bg-[#EEEEED] cursor-pointer shadow-xs shrink-0 transition-colors"
        title="Cash Drawer & Shift Reconciliation"
      >
        <Wallet className={"h-4 w-4 " + shiftIconClass} />
        <span className="hidden sm:inline">{shiftBadgeText}</span>
      </button>
    );
  }

  let rightSideCartPanel = null;
  if (cartCollapsed) {
    let itemUnitLabel = "items";
    if (cartItems.length === 1) {
      itemUnitLabel = "item";
    }

    let badgeCounter = null;
    if (cartItems.length > 0) {
      badgeCounter = (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#151515] px-1 font-mono text-3xs font-bold text-white shadow-xs">
          {cartItems.length}
        </span>
      );
    }

    rightSideCartPanel = (
      <aside
        className="hidden md:flex w-16 sm:w-20 shrink-0 flex-col justify-between border-l border-[#E9E9E9] bg-white py-4 transition-all duration-200 ease-in-out select-none"
        aria-label="Collapsed Cart Summary"
      >
        {/* Top: Expand Toggle & Icon Badge */}
        <div className="flex flex-col items-center gap-3 px-2">
          <button
            type="button"
            onClick={function expandCart() {
              setCartCollapsed(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9E9E9] bg-white text-[#151515] hover:bg-[#EEEEED] cursor-pointer shadow-xs transition-colors"
            title="Expand Cart Panel"
            aria-label="Expand Cart Panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            onClick={function expandOnBadgeClick() {
              setCartCollapsed(false);
            }}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#EEEEED] text-[#151515] hover:bg-[#E2E2E1] transition-colors"
            title={String(cartItems.length) + " item(s) in cart"}
          >
            <ShoppingBag className="h-5 w-5" />
            {badgeCounter}
          </div>
        </div>

        {/* Middle: Compact Summary (Item Count & Total) */}
        <div
          onClick={function expandOnSummaryClick() {
            setCartCollapsed(false);
          }}
          className="flex flex-col items-center gap-1 px-1 py-3 text-center cursor-pointer hover:bg-[#F5F5F4] rounded-xl mx-1 transition-colors"
          title="Click to expand cart details"
        >
          <span className="text-3xs font-semibold uppercase tracking-wider text-[#777777]">
            {cartItems.length} {itemUnitLabel}
          </span>
          <span className="font-mono text-xs font-bold text-[#151515] break-all px-0.5">
            {formatPeso(totals.total)}
          </span>
        </div>

        {/* Bottom: Quick Pay Trigger */}
        <div className="flex flex-col items-center gap-2 px-2">
          <button
            type="button"
            onClick={openCheckoutModal}
            disabled={cartItems.length === 0}
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[#B9F36B] hover:bg-[#A8E65A] text-[#151515] shadow-xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 transition-all"
            title="Proceed to Checkout"
            aria-label="Proceed to Checkout"
          >
            <span className="font-mono text-xs font-bold uppercase tracking-tight">Pay</span>
          </button>
        </div>
      </aside>
    );
  } else {
    rightSideCartPanel = (
      <aside className="hidden md:flex w-80 xl:w-96 shrink-0 flex-col border-l border-[#E9E9E9] bg-white transition-all duration-200 ease-in-out">
        <div className="flex items-center justify-between border-b border-[#E9E9E9] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={function collapseCart() {
                setCartCollapsed(true);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] cursor-pointer transition-colors"
              title="Collapse Cart Panel"
              aria-label="Collapse Cart Panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-[#151515]">
              Current Sale (<span className="font-mono">{cartItems.length}</span>)
            </h2>
          </div>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={handleRequestClearCart}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[#777777] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            title="Clear all items in cart"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E9E9E9] px-5">
          {cartListContent}
        </div>

        <div className="border-t border-[#E9E9E9] p-5">
          {cartFooterContent}
        </div>
      </aside>
    );
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#F5F5F4]">
      {/* Center Catalog Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden p-3.5 sm:p-5 lg:p-6">
        {/* Top Search & Low Stock Bar */}
        <div className="mb-5 flex items-center gap-3.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={function onChange(event) {
                setSearchQuery(event.target.value);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by product or scan barcode..."
              className="w-full rounded-xl border border-[#E9E9E9] bg-white py-3 pl-11 pr-20 text-sm text-[#151515] placeholder:text-[#777777] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-[#E9E9E9] bg-[#EEEEED] px-2 py-0.5 font-mono text-tiny text-[#777777]">
              Ctrl K
            </span>
          </div>

          {shiftButton}

          <button
            type="button"
            onClick={function openLowStock() {
              setLowStockModalOpen(true);
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] cursor-pointer shrink-0 transition-colors"
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
              "shrink-0 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-colors ";
            if (isSelected) {
              pillClass = pillClass + "bg-[#151515] font-semibold text-white shadow-xs";
            } else {
              pillClass =
                pillClass + "bg-white text-[#777777] border border-[#E9E9E9] hover:bg-[#EEEEED] hover:text-[#151515]";
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
        <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2 sm:gap-4 pt-2">
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
            disabled={cartItems.length === 0}
            onClick={handleRequestClearCart}
            className="text-xs sm:text-sm px-2 sm:px-4"
          >
            <XCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">Clear Sale</span>
          </Button>
        </div>
      </div>

      {/* Right Current Sale Cart Panel (Desktop & Tablet Collapsible) */}
      {rightSideCartPanel}

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
          <FormActions
            onCancel={function cancel() {
              setDiscountModalOpen(false);
            }}
            confirmLabel="Apply"
            className="pt-1"
          />
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
        onPaymentMethodChange={handlePaymentMethodChange}
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
        customers={customers}
        onCustomerCreated={function handleCustomerCreated(newCustomer) {
          setCustomers(function updateCustomers(previous) {
            const nextList = [newCustomer];
            for (let index = 0; index < previous.length; index++) {
              nextList.push(previous[index]);
            }
            return nextList;
          });
          setCustomerIdInput(newCustomer.customer_id);
        }}
      />

      {/* Clear Cart Confirmation Modal */}
      <Modal
        open={clearConfirmOpen}
        onClose={function closeClearConfirm() {
          setClearConfirmOpen(false);
        }}
        title="Clear Current Sale"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#777777]">
            Are you sure you want to clear all{" "}
            <span className="font-semibold text-[#151515] font-mono">
              {cartItems.length}
            </span>{" "}
            item(s) from the current sale? Any applied discounts will also be removed.
          </p>
          <FormActions
            onCancel={function cancelClear() {
              setClearConfirmOpen(false);
            }}
            confirmType="button"
            confirmVariant="danger"
            confirmLabel="Clear Cart"
            onConfirm={clearCart}
          />
        </div>
      </Modal>

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
