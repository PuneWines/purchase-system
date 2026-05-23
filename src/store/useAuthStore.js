import { create } from "zustand";
import { supabase } from "../../utils/supabase";

const useAuthStore = create((set, get) => ({
  currentUser: null,
  users: [],
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();
      
      if (error || !data) {
        set({ loading: false });
        return { success: false, error: 'Invalid username or password' };
      }
      
      // Store user in local storage to keep session active
      localStorage.setItem('currentUser', JSON.stringify(data));
      set({ currentUser: data, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: 'Login failed. Please try again.' };
    }
  },

  logout: () => {
    localStorage.removeItem('currentUser');
    set({ currentUser: null });
  },

  fetchUsers: async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      set({ users: data });
    }
  },

  updateUser: async (userId, updatedData) => {
    const { error } = await supabase
      .from('users')
      .update(updatedData)
      .eq('id', userId);
      
    if (!error) {
      const { users, currentUser } = get();
      set({
        users: users.map((u) => (u.id === userId ? { ...u, ...updatedData } : u)),
      });
      if (currentUser?.id === userId) {
        const newCurrentUser = { ...currentUser, ...updatedData };
        localStorage.setItem('currentUser', JSON.stringify(newCurrentUser));
        set({ currentUser: newCurrentUser });
      }
      return { success: true };
    }
    return { success: false, error: error.message };
  },

  createUser: async (userData) => {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
      
    if (!error && data) {
      const { users } = get();
      set({ users: [...users, data] });
      return { success: true, data };
    }
    return { success: false, error: error?.message || 'Error creating user' };
  },

  deleteUser: async (userId) => {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (!error) {
      const { users } = get();
      set({ users: users.filter((u) => u.id !== userId) });
      return { success: true };
    }
    return { success: false, error: error.message };
  },

  hasPermission: (permission) => {
    const { currentUser } = get();
    return currentUser?.permissions?.includes(permission) || false;
  },

  initSession: () => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      set({ currentUser: JSON.parse(storedUser) });
    }
  }
}));

export default useAuthStore;
