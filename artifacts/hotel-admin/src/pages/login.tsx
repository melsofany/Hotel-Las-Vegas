import { useState, type FormEvent } from 'react';
import { Phone, Lock, Loader2 } from 'lucide-react';
import { useLoginByPhone } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const loginMutation = useLoginByPhone({
    mutation: {
      onSuccess: (data) => {
        login(data);
      },
      onError: (err: unknown) => {
        const message =
          err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401
            ? 'الرقم السري غير صحيح'
            : 'لا يوجد موظف مسجل بهذا رقم الهاتف';
        setError(message);
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !password.trim()) {
      setError('من فضلك أدخل رقم الهاتف والرقم السري');
      return;
    }
    loginMutation.mutate({ data: { phone: phone.trim(), password: password.trim() } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-lg bg-primary flex items-center justify-center mb-4 overflow-hidden p-2 shadow-sm">
            <img src={logo} alt="فندق لاس فيجاس" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">فندق لاس فيجاس</h1>
          <p className="text-sm text-muted-foreground mt-1">نظام إدارة الحجوزات</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">رقم الهاتف</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                inputMode="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full bg-background border border-input rounded pr-10 pl-3 py-2.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">الرقم السري</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="w-full bg-background border border-input rounded pr-10 pl-3 py-2.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            سجّل الدخول باستخدام رقم هاتفك المسجل لدى إدارة الفندق
          </p>
        </form>
      </div>
    </div>
  );
}
