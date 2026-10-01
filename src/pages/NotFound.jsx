import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-x py-20 text-center">
      <div className="text-5xl font-bold text-brand">٤٠٤</div>
      <h1 className="mt-2 text-lg font-bold text-ink">الصفحة غير موجودة</h1>
      <p className="mt-1 text-sm text-soft">يبدو أن هذه الصفحة انتقلت أو حُذفت.</p>
      <Button asChild className="mt-6">
        <Link to="/">العودة للرئيسية</Link>
      </Button>
    </div>
  );
}
