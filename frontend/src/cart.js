export function computeLocalCartTotals(cartItems, orderDiscount) {
  let subtotal = 0;
  for (let index = 0; index < cartItems.length; index++) {
    const item = cartItems[index];
    subtotal = subtotal + item.unit_price * item.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;

  let discount = Number(orderDiscount);
  if (!Number.isFinite(discount) || discount < 0) {
    discount = 0;
  }
  if (discount > subtotal) {
    discount = subtotal;
  }
  discount = Math.round(discount * 100) / 100;

  const total = Math.round((subtotal - discount) * 100) / 100;
  return {
    subtotal: subtotal,
    discount: discount,
    total: total
  };
}
