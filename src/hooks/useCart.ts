'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CartItem, Product, ProductVariant } from '@/types';
import {
  getStoredCart,
  addToCart as addToCartLib,
  removeFromCart as removeFromCartLib,
  updateCartQuantity as updateCartQuantityLib,
  clearCart as clearCartLib,
  calculateCartTotals,
} from '@/lib/cart';
import { haptics } from '@/lib/haptics';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshCart = useCallback(() => {
    setCart(getStoredCart());
  }, []);

  useEffect(() => {
    setCart(getStoredCart());
    setIsLoaded(true);

    const handleCartUpdate = () => {
      refreshCart();
    };

    window.addEventListener('cart_updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);

    return () => {
      window.removeEventListener('cart_updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [refreshCart]);

  const add = useCallback((product: Product, variant: ProductVariant | null = null, quantity = 1) => {
    const updated = addToCartLib(product, variant, quantity);
    setCart([...updated]);
    haptics.cartAdd();
  }, []);

  const remove = useCallback((productId: string, variantId: string | null = null) => {
    const updated = removeFromCartLib(productId, variantId);
    setCart([...updated]);
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string | null = null, quantity: number) => {
    const updated = updateCartQuantityLib(productId, variantId, quantity);
    setCart([...updated]);
  }, []);

  const clear = useCallback(() => {
    clearCartLib();
    setCart([]);
  }, []);

  const { subtotal, itemCount } = calculateCartTotals(cart);

  return {
    cart,
    isLoaded,
    itemCount,
    subtotal,
    add,
    remove,
    updateQuantity,
    clear,
    refreshCart,
  };
}
