import { create } from "zustand";
import { supabase } from "../../utils/supabase";

const useVendorStore = create((set, get) => ({
  vendors: [],
  loading: false,

  fetchVendors: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('vendors').select('*');
    if (!error && data) {
      set({ vendors: data });
    }
    set({ loading: false });
  },

  updateVendor: async (vendorId, updatedData) => {
    const { error } = await supabase
      .from('vendors')
      .update(updatedData)
      .eq('id', vendorId);
      
    if (!error) {
      const { vendors } = get();
      set({
        vendors: vendors.map((v) => (v.id === vendorId ? { ...v, ...updatedData } : v)),
      });
      return { success: true };
    }
    return { success: false, error: error.message };
  },

  createVendor: async (vendorData) => {
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendorData])
      .select()
      .single();
      
    if (!error && data) {
      const { vendors } = get();
      set({ vendors: [...vendors, data] });
      return { success: true, data };
    }
    return { success: false, error: error?.message || 'Error creating vendor' };
  },

  deleteVendor: async (vendorId) => {
    const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
    if (!error) {
      const { vendors } = get();
      set({ vendors: vendors.filter((v) => v.id !== vendorId) });
      return { success: true };
    }
    return { success: false, error: error.message };
  },
}));

export default useVendorStore;
