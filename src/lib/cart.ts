import type { CartItem, Product, ProductVariant } from '@/types';

const CART_STORAGE_KEY = 'shopbd_cart_items';

export function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse cart from storage:', err);
    return [];
  }
}

export function saveStoredCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cart_updated'));
  } catch (err) {
    console.error('Failed to save cart to storage:', err);
  }
}

export function addToCart(
  product: Product,
  variant: ProductVariant | null = null,
  quantity = 1
): CartItem[] {
  const current = getStoredCart();
  const targetVarId = variant?.id || null;
  const existingIndex = current.findIndex(
    item => item.product_id === product.id && (item.variant_id || null) === targetVarId
  );

  if (existingIndex > -1) {
    current[existingIndex].quantity += quantity;
  } else {
    current.push({
      product_id: product.id,
      variant_id: targetVarId,
      quantity,
      product,
      variant: variant || undefined,
    });
  }

  saveStoredCart(current);
  return current;
}

export function removeFromCart(productId: string, variantId: string | null = null): CartItem[] {
  const targetVarId = variantId || null;
  const current = getStoredCart().filter(
    item => !(item.product_id === productId && (item.variant_id || null) === targetVarId)
  );
  saveStoredCart(current);
  return current;
}

export function updateCartQuantity(
  productId: string,
  variantId: string | null = null,
  quantity: number
): CartItem[] {
  const targetVarId = variantId || null;
  const current = getStoredCart();
  const index = current.findIndex(
    item => item.product_id === productId && (item.variant_id || null) === targetVarId
  );

  if (index > -1) {
    if (quantity <= 0) {
      current.splice(index, 1);
    } else {
      current[index].quantity = quantity;
    }
    saveStoredCart(current);
  }

  return current;
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new Event('cart_updated'));
}

export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  itemCount: number;
} {
  return items.reduce(
    (acc, item) => {
      const unitPrice = item.variant
        ? (item.product.sale_price ?? item.product.base_price) + item.variant.price_modifier
        : item.product.sale_price ?? item.product.base_price;
      acc.subtotal += unitPrice * item.quantity;
      acc.itemCount += item.quantity;
      return acc;
    },
    { subtotal: 0, itemCount: 0 }
  );
}

const DIRECT_BUY_STORAGE_KEY = 'shopbd_direct_buy_item';

export function setDirectBuyItem(product: Product, variant: ProductVariant | null = null, quantity = 1): CartItem {
  const item: CartItem = {
    product_id: product.id,
    variant_id: variant?.id || null,
    quantity,
    product,
    variant: variant || undefined,
  };
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(DIRECT_BUY_STORAGE_KEY, JSON.stringify(item));
      localStorage.setItem(DIRECT_BUY_STORAGE_KEY, JSON.stringify(item));
    } catch {}
  }
  return item;
}

export function getDirectBuyItem(): CartItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DIRECT_BUY_STORAGE_KEY) || localStorage.getItem(DIRECT_BUY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDirectBuyItem(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DIRECT_BUY_STORAGE_KEY);
    localStorage.removeItem(DIRECT_BUY_STORAGE_KEY);
  } catch {}
}
