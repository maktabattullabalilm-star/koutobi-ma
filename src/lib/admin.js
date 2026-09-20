import { supabase } from './supabase';

export async function adminGetBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminCreateBook(payload) {
  const { data, error } = await supabase.from('books').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateBook(id, payload) {
  const { data, error } = await supabase
    .from('books')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminGetOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminUpdateOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminStats() {
  const [books, orders] = await Promise.all([adminGetBooks(), adminGetOrders()]);
  const completed = orders.filter((o) => o.status === 'new' || o.status === 'contacted');
  const revenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  return {
    books: books.length,
    orders: orders.length,
    pending: completed.length,
    revenue,
  };
}