import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// Isolated client for user creation — doesn't share session with the admin client
function tempClient() {
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `_hc_signup_${Date.now()}`,
    },
  });
}

// Admin client — used only for operations that require service role (delete, password reset)
const adminClient = serviceKey
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
  : null;

export async function adminCreateUser(email: string, password: string): Promise<{ id: string }> {
  const { data, error } = await tempClient().auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo crear la cuenta. Es posible que el correo ya esté registrado.');
  return { id: data.user.id };
}

export async function adminDeleteUser(userId: string): Promise<void> {
  if (!adminClient) return; // fail silently — user can delete from Supabase dashboard
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) console.warn('adminDeleteUser:', error.message);
}

export async function adminUpdateUser(userId: string, updates: { password?: string }): Promise<void> {
  if (!adminClient) throw new Error('Agrega VITE_SUPABASE_SERVICE_ROLE_KEY al .env para cambiar contraseñas.');
  const { error } = await adminClient.auth.admin.updateUserById(userId, updates);
  if (error) throw new Error(error.message);
}
