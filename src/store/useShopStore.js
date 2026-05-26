import { create } from "zustand";

const SHOPS = ["FRIENDS", "VISHAL", "MADHURA", "KUNAL", "BALAJI"];

const getInitialShop = () => {
  try {
    const saved = localStorage.getItem("globalSelectedShop");
    if (saved && (saved === "All" || SHOPS.includes(saved))) {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return "All";
};

const useShopStore = create((set) => ({
  shops: SHOPS,
  selectedShop: getInitialShop(),
  setSelectedShop: (shop) => {
    try {
      localStorage.setItem("globalSelectedShop", shop);
    } catch (e) {
      // ignore
    }
    set({ selectedShop: shop });
  },
}));

export default useShopStore;
