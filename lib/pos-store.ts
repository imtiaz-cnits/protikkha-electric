import { create } from "zustand";

export interface CartItem {
  product_id: number;
  product_name: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  stock: number;
  unit: string;
  // Tiles properties (optional)
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  surface_finish?: string | null;
  category?: string | null;
  selling_mode?: "box" | "sqft";
  custom_sqft?: number | null;
}

export interface Customer {
  id: number;
  customer_id: string;
  customer_name: string;
  mobile: string;
  address_details?: string | null;
  previous_due_amount: number;
}

interface PosState {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  discount: number;
  discountType: "flat" | "percent";
  deliveryCharge: number;
  returnAdjustment: number;
  paidAmount: number;
  paymentMethod: string;
  transactionId: string;
  orderNote: string;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQty: (productId: number, qty: number) => void;
  updateTileCalculation: (productId: number, data: { quantity: number; selling_mode?: "box" | "sqft"; custom_sqft?: number | null; price?: number }) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;

  setCustomer: (customer: Customer | null) => void;
  setDiscount: (val: number) => void;
  setDiscountType: (type: "flat" | "percent") => void;
  setDeliveryCharge: (val: number) => void;
  setReturnAdjustment: (val: number) => void;
  setPaidAmount: (val: number) => void;
  setPaymentMethod: (method: string) => void;
  setTransactionId: (id: string) => void;
  setOrderNote: (note: string) => void;

  // Computed values
  getSubTotal: () => number;
  getCalculatedDiscount: () => number;
  getGrandTotal: () => number;
  getDueAmount: () => number;
  getTotalDueWithPrevious: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  selectedCustomer: null,
  discount: 0,
  discountType: "flat",
  deliveryCharge: 0,
  returnAdjustment: 0,
  paidAmount: 0,
  paymentMethod: "Cash",
  transactionId: "",
  orderNote: "",

  addItem: (product, qty = 1) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (item) => item.product_id === product.product_id
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += qty;
      set({ cart: updated });
    } else {
      set({
        cart: [...cart, { ...product, quantity: qty }],
      });
    }
  },

  updateQty: (productId, qty) => {
    const { cart } = get();
    if (qty <= 0) {
      set({
        cart: cart.filter((i) => i.product_id !== productId),
      });
      return;
    }

    set({
      cart: cart.map((item) => {
        if (item.product_id === productId) {
          return { ...item, quantity: qty };
        }
        return item;
      }),
    });
  },

  updateTileCalculation: (productId, data) => {
    const { cart } = get();
    set({
      cart: cart.map((item) => {
        if (item.product_id === productId) {
          return {
            ...item,
            quantity: data.quantity,
            selling_mode: data.selling_mode ?? item.selling_mode,
            custom_sqft: data.custom_sqft !== undefined ? data.custom_sqft : item.custom_sqft,
            selling_price: data.price !== undefined ? data.price : item.selling_price,
          };
        }
        return item;
      }),
    });
  },

  removeItem: (productId) => {
    const { cart } = get();
    set({
      cart: cart.filter((i) => i.product_id !== productId),
    });
  },

  clearCart: () => {
    set({
      cart: [],
      discount: 0,
      discountType: "flat",
      deliveryCharge: 0,
      returnAdjustment: 0,
      paidAmount: 0,
      paymentMethod: "Cash",
      transactionId: "",
      orderNote: "",
    });
  },

  setCustomer: (selectedCustomer) => set({ selectedCustomer }),
  setDiscount: (discount) => set({ discount }),
  setDiscountType: (discountType) => set({ discountType }),
  setDeliveryCharge: (deliveryCharge) => set({ deliveryCharge }),
  setReturnAdjustment: (returnAdjustment) => set({ returnAdjustment }),
  setPaidAmount: (paidAmount) => set({ paidAmount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setTransactionId: (transactionId) => set({ transactionId }),
  setOrderNote: (orderNote) => set({ orderNote }),

  getSubTotal: () => {
    return get().cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  },

  getCalculatedDiscount: () => {
    const sub = get().getSubTotal();
    const { discount, discountType } = get();
    if (discount <= 0) return 0;
    if (discountType === "percent") {
      return (sub * discount) / 100;
    }
    return discount;
  },

  getGrandTotal: () => {
    const sub = get().getSubTotal();
    const disc = get().getCalculatedDiscount();
    const { deliveryCharge, returnAdjustment } = get();
    const grand = sub + deliveryCharge - (disc + returnAdjustment);
    return Math.max(0, grand);
  },

  getDueAmount: () => {
    const grand = get().getGrandTotal();
    const { paidAmount } = get();
    const remaining = grand - paidAmount;
    return Math.max(0, remaining);
  },

  getTotalDueWithPrevious: () => {
    const currentDue = get().getDueAmount();
    const prevDue = get().selectedCustomer?.previous_due_amount || 0;
    return currentDue + prevDue;
  },
}));

