import { create } from "zustand";
import { supabase } from "../../utils/supabase";

const useCompanyStore = create((set, get) => ({
  companySettings: null,
  companies: [],
  loading: false,

  fetchCompanies: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .order('name');
    
    if (!error && data) {
      set({ companies: data });
      // If we don't have an active company selected yet, default to the first one
      if (data.length > 0) {
        set({ companySettings: data[0] });
      } else {
        set({ companySettings: null });
      }
    }
    set({ loading: false });
  },

  fetchCompanySettings: async () => {
    // Call fetchCompanies so that both arrays and single settings are updated
    await get().fetchCompanies();
  },

  createCompany: async (companyData) => {
    set({ loading: true });
    // Remove id from insertion if it is present
    const { id, ...insertData } = companyData;
    const { data, error } = await supabase
      .from('company_settings')
      .insert([insertData])
      .select()
      .single();
    
    set({ loading: false });
    if (!error && data) {
      await get().fetchCompanies();
      return { success: true, data };
    }
    return { success: false, error: error?.message };
  },

  updateCompany: async (id, companyData) => {
    set({ loading: true });
    // Strip id from companyData
    const { id: _, ...updateData } = companyData;
    const { data, error } = await supabase
      .from('company_settings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    set({ loading: false });
    if (!error && data) {
      await get().fetchCompanies();
      return { success: true, data };
    }
    return { success: false, error: error?.message };
  },

  deleteCompany: async (id) => {
    set({ loading: true });
    const { error } = await supabase
      .from('company_settings')
      .delete()
      .eq('id', id);
    
    set({ loading: false });
    if (!error) {
      await get().fetchCompanies();
      return { success: true };
    }
    return { success: false, error: error?.message };
  },

  updateCompanySettings: async (settingsData) => {
    if (settingsData.id) {
      return get().updateCompany(settingsData.id, settingsData);
    }
    
    // Strict fallback check for single profile setup
    const { data: existingData } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existingData && existingData.id) {
      return get().updateCompany(existingData.id, settingsData);
    } else {
      return get().createCompany(settingsData);
    }
  }
}));

export default useCompanyStore;
