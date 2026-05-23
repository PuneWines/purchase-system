import { create } from "zustand";
import { supabase } from "../../utils/supabase";

const useCompanyStore = create((set, get) => ({
  companySettings: null,
  loading: false,

  fetchCompanySettings: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('company_settings').select('*').limit(1).single();
    if (!error && data) {
      set({ companySettings: data });
    }
    set({ loading: false });
  },

  updateCompanySettings: async (settingsData) => {
    const currentSettings = get().companySettings;
    
    // If no settings exist yet, we insert
    if (!currentSettings) {
      const { data, error } = await supabase
        .from('company_settings')
        .insert([settingsData])
        .select()
        .single();
        
      if (!error && data) {
        set({ companySettings: data });
        return { success: true };
      }
      return { success: false, error: error?.message };
    }

    // Otherwise update
    const { data, error } = await supabase
      .from('company_settings')
      .update(settingsData)
      .eq('id', currentSettings.id)
      .select()
      .single();
      
    if (!error && data) {
      set({ companySettings: data });
      return { success: true };
    }
    return { success: false, error: error?.message };
  }
}));

export default useCompanyStore;
