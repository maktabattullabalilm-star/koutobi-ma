import { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { reportError } from '../lib/report';

/**
 * Last-resort crash boundary around route outlets (docs/backlog/21).
 * Data errors are handled per-page; this catches render crashes only.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error, info) {
    reportError(error, info?.componentStack?.slice(0, 500) || 'ErrorBoundary');
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="container-x py-20 text-center">
          <div className="text-5xl font-bold text-brand">عذرًا</div>
          <h1 className="mt-2 text-lg font-bold text-ink">حدث خطأ غير متوقع</h1>
          <p className="mt-1 text-sm text-soft">حدّث الصفحة، وإذا تكرر الأمر تواصل معنا.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>تحديث الصفحة</Button>
            <Button asChild variant="outline">
              <Link to="/">العودة للرئيسية</Link>
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
