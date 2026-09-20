import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../../lib/admin', () => ({
  adminStats: vi.fn(async () => ({ books: 2, orders: 1, pending: 1, revenue: 100 })),
  adminGetOrders: vi.fn(async () => ([
    {
      id: 'o1', customer_name: 'زبون اختبار', phone: '0600000000',
      total: 140, status: 'new', created_at: '2026-01-01T10:00:00Z', order_items: [],
    },
  ])),
  adminGetBooks: vi.fn(async () => ([
    {
      id: 'b1', title_ar: 'كتاب متوفر', author_ar: 'مؤلف', category: 'الفقه وأصوله',
      price: 60, old_price: null, stock_qty: 3, is_active: true,
      is_featured: false, is_out_of_stock: false, cover_image: '',
    },
    {
      id: 'b2', title_ar: 'كتاب نافد', author_ar: '', category: 'الفقه وأصوله',
      price: 15, old_price: 20, stock_qty: 0, is_active: false,
      is_featured: true, is_out_of_stock: true, cover_image: '',
    },
  ])),
  adminUpdateBook: vi.fn(async () => ({})),
  adminDeleteBookWithImages: vi.fn(async () => ({})),
  getAppSetting: vi.fn(async () => 'hide'),
  adminUpdateAppSetting: vi.fn(async () => ({})),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      mfa: { listFactors: async () => ({ data: { totp: [], phone: [] }, error: null }) },
      updateUser: async () => ({ data: {}, error: null }),
    },
  },
  SUPABASE_ENABLED: true,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
    profile: { email: 'admin@test.ma' },
    loading: false,
    isAdmin: true,
    signOut: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Link: ({ to, children, ...rest }) => (
      <a href={typeof to === 'string' ? to : '#'} {...rest}>{children}</a>
    ),
  };
});

vi.mock('../../components/Toast', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

const { default: Dashboard } = await import('./Dashboard');
const { default: BooksAdmin } = await import('./BooksAdmin');
const { default: PageHeader } = await import('./PageHeader');
const { default: Settings } = await import('./Settings');

afterEach(cleanup);

describe('PageHeader', () => {
  it('renders Amiri title, crumbs and actions', () => {
    render(
      <PageHeader
        title="العنوان"
        description="الوصف"
        crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'الحالية' }]}
        actions={<button>زر</button>}
      />
    );
    expect(screen.getByRole('heading', { name: 'العنوان' })).toBeTruthy();
    expect(screen.getByText('الوصف')).toBeTruthy();
    expect(screen.getByText('لوحة التحكم')).toBeTruthy();
    expect(screen.getByText('زر')).toBeTruthy();
  });
});

describe('Dashboard (reorganized)', () => {
  it('shows stats, attention zone and settings zone', async () => {
    render(<Dashboard />);
    // stats
    expect(await screen.findByText('إجمالي الكتب')).toBeTruthy();
    // attention zone: pending order + low-stock book + 2FA nudge
    expect(await screen.findByText('يحتاج انتباهك')).toBeTruthy();
    expect(await screen.findByText(/لديك 1 طلب قيد المعالجة/)).toBeTruthy();
    expect(await screen.findByText(/كتاب متوفر/)).toBeTruthy();
    // quick actions (settings lives on its own page now)
    expect(await screen.findByText('إجراءات سريعة')).toBeTruthy();
    expect(await screen.findByText('الإعدادات ⚙️')).toBeTruthy();
    // 2FA nudge in attention zone links to settings
    expect((await screen.findAllByText(/التحقق بخطوتين/)).length).toBeGreaterThanOrEqual(1);
    // recent orders
    expect(await screen.findByText('زبون اختبار')).toBeTruthy();
  });
});

describe('Settings (sensitive area, separate page)', () => {
  it('groups password, 2FA and store settings away from the overview', async () => {
    render(<Settings />);
    expect(await screen.findByText('الإعدادات ⚙️')).toBeTruthy();
    expect(await screen.findByText('أمان الحساب')).toBeTruthy();
    expect(await screen.findByText(/تغيير كلمة المرور/)).toBeTruthy();
    expect(await screen.findByText(/إظهار الكمية \(افتراضي\)/)).toBeTruthy();
    expect(await screen.findByText('إعدادات المتجر')).toBeTruthy();
    // 2FA enroll CTA (no factor enrolled in mock)
    expect(await screen.findByText(/تفعيل بخطوتين/)).toBeTruthy();
  });
});

describe('BooksAdmin (responsive + filters)', () => {
  it('renders search, filters, badges and steppers', async () => {
    render(<BooksAdmin />);
    expect(await screen.findByPlaceholderText(/ابحث بالعنوان/)).toBeTruthy();
    expect(await screen.findByText('قارب النفاد')).toBeTruthy();
    expect(await screen.findAllByText('كتاب متوفر')).not.toHaveLength(0);
    expect(await screen.findAllByText('كتاب نافد')).not.toHaveLength(0);
    // low-stock + out-of-stock badges
    expect(await screen.findAllByText(/بقي 3/)).not.toHaveLength(0);
    expect(await screen.findAllByText('نفد')).not.toHaveLength(0);
    // stock steppers (table + mobile card each render one)
    expect(await screen.findAllByLabelText('زيادة المخزون')).not.toHaveLength(0);
    expect(await screen.findAllByLabelText('نقص المخزون')).not.toHaveLength(0);
    // match count line
    expect(await screen.findByText(/مطابقة للبحث/)).toBeTruthy();
  });
});
