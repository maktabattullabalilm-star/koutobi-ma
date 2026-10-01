import { supabase } from '../supabase';
import { ADMIN_PAGE_SIZE, adminGetBooks } from './books';

function throwDb(error) {
  throw new Error(error?.message || 'تعذّر تحميل البيانات');
}

export async function adminGetOrders({ limit = ADMIN_PAGE_SIZE } = {}) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throwDb(error);
  return data || [];
}

export async function adminUpdateOrderStatus(id, status) {
  const { error } = await supabase.rpc('admin_set_order_status', { p_order_id: id, p_status: status });
  if (error) throwDb(error);
}

export async function adminStats() {
  const [books, orders] = await Promise.all([adminGetBooks(), adminGetOrders()]);
  const pending = orders.filter((o) => o.status === 'new' || o.status === 'contacted');
  const revenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  return {
    books: books.length,
    orders: orders.length,
    pending: pending.length,
    revenue,
  };
}
