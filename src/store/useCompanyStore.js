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
    // First, strictly check the database to see if a company profile already exists
    // This prevents multiple inserts if local state was stale or null
    const { data: existingData } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existingData && existingData.id) {
      // A profile exists, STRICTLY UPDATE the existing row
      const { data, error } = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('id', existingData.id)
        .select()
        .single();
        
      if (!error && data) {
        set({ companySettings: data });
        return { success: true };
      }
      return { success: false, error: error?.message };
    } else {
      // No profile exists in the database at all, so we insert the FIRST one
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
  }
}));

export default useCompanyStore;
