import { useMemo, useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import {
  useListEmployees,
  useGetEmployeeStats,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  getListEmployeesQueryKey,
  getGetEmployeeStatsQueryKey,
  type Employee,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Mail, Phone, Search, UsersRound, TrendingUp, Plus, Loader2, MoreVertical, Pencil, Trash2, Ban, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function Employees() {
  const { employee: currentEmployee } = useAuth();
  const isAdmin = currentEmployee?.role === 'admin';
  const { data: employees, isLoading: empLoading } = useListEmployees();
  const { data: stats, isLoading: statsLoading } = useGetEmployeeStats();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleActiveMutation = useUpdateEmployee({
    mutation: {
      onSuccess: (_data, variables) => {
        toast({ title: variables.data.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب' });
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      },
      onError: (err: unknown) => {
        toast({ title: 'حدث خطأ', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
      },
    },
  });

  const deleteMutation = useDeleteEmployee({
    mutation: {
      onSuccess: () => {
        toast({ title: 'تم حذف الموظف' });
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetEmployeeStatsQueryKey() });
        setDeletingEmployee(null);
      },
      onError: (err: unknown) => {
        toast({ title: 'حدث خطأ', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        setDeletingEmployee(null);
      },
    },
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير النظام';
      case 'employee': return 'موظف';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getEmployeeStat = (id: number) => {
    return stats?.find((s) => s.employeeId === id);
  };

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const matchesSearch =
        search.trim() === '' ||
        emp.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        emp.phone.includes(search.trim());
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees?.forEach((emp) => {
      counts[emp.role] = (counts[emp.role] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const isLoading = empLoading || statsLoading;

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-2">
        <PageHeader title="طاقم العمل" description="إدارة موظفي الفندق وأدائهم" />
        {isAdmin && (
          <Button onClick={() => setIsDialogOpen(true)} className="flex-shrink-0">
            <Plus className="h-4 w-4 ml-1" /> إضافة موظف
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UsersRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{employees?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">إجمالي الموظفين</div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{roleCounts.admin ?? 0}</div>
            <div className="text-xs text-muted-foreground">مديرو النظام</div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{roleCounts.employee ?? 0}</div>
            <div className="text-xs text-muted-foreground">موظفون</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full bg-card border border-input rounded pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-card border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">كل الأدوار</option>
          <option value="admin">مدير النظام</option>
          <option value="employee">موظف</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">جاري التحميل...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
          <UsersRound className="h-10 w-10 opacity-30" />
          <span>لا يوجد موظفون مطابقون للبحث</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => {
            const empStat = getEmployeeStat(employee.id);
            return (
              <div
                key={employee.id}
                className={`bg-card border border-card-border rounded-lg overflow-hidden flex flex-col relative group hover:shadow-md transition-shadow ${employee.isActive === false ? 'opacity-60' : ''}`}
              >
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="p-6 border-b border-border flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{employee.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleColor(employee.role)}`}>
                          {employee.role === 'admin' && <ShieldAlert className="h-3 w-3 mr-1" />}
                          {getRoleLabel(employee.role)}
                        </span>
                        {employee.isActive === false && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-muted text-muted-foreground border-border">
                            <Ban className="h-3 w-3 mr-1" /> متوقف
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                          <Pencil className="h-4 w-4 ml-2" /> تعديل / تغيير الرقم السري
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={employee.id === currentEmployee?.id}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: employee.id,
                              data: { isActive: employee.isActive === false },
                            })
                          }
                        >
                          {employee.isActive === false ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 ml-2" /> تفعيل الحساب
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 ml-2" /> إيقاف الحساب
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={employee.id === currentEmployee?.id}
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingEmployee(employee)}
                        >
                          <Trash2 className="h-4 w-4 ml-2" /> حذف الموظف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="p-6 space-y-4 flex-1">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> <span dir="ltr">{employee.phone}</span>
                    </div>
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> <span>{employee.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border mt-auto">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">إحصائيات الأداء</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/20 rounded p-2 text-center">
                        <div className="text-2xl font-bold text-primary">{empStat?.totalReservations || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">إجمالي الحجوزات</div>
                      </div>
                      <div className="bg-muted/20 rounded p-2 text-center">
                        <div className="text-2xl font-bold text-foreground">{empStat?.activeReservations || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">حجوزات نشطة</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <AddEmployeeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      )}

      {isAdmin && (
        <EditEmployeeDialog employee={editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)} />
      )}

      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الموظف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deletingEmployee?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deletingEmployee && deleteMutation.mutate({ id: deletingEmployee.id })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function AddEmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        toast({ title: 'تم إضافة الموظف بنجاح' });
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetEmployeeStatsQueryKey() });
        setName(''); setPhone(''); setPassword(''); setEmail(''); setRole('employee');
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast({ title: 'حدث خطأ', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password.trim()) return;
    createMutation.mutate({
      data: { name: name.trim(), phone: phone.trim(), password: password.trim(), role, email: email.trim() || undefined },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة موظف جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">رقم الهاتف</label>
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الرقم السري</label>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الدور</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="employee">موظف</option>
              <option value="admin">مدير النظام</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الإضافة...
              </>
            ) : (
              'إضافة الموظف'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({
  employee,
  onOpenChange,
}: {
  employee: Employee | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form fields whenever the dialog opens for a (possibly different) employee.
  const [loadedEmployeeId, setLoadedEmployeeId] = useState<number | null>(null);
  if (employee && employee.id !== loadedEmployeeId) {
    setName(employee.name);
    setPhone(employee.phone);
    setEmail(employee.email ?? '');
    setRole(employee.role as 'admin' | 'employee');
    setPassword('');
    setLoadedEmployeeId(employee.id);
  } else if (!employee && loadedEmployeeId !== null) {
    setLoadedEmployeeId(null);
  }

  const updateMutation = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        toast({ title: 'تم تحديث بيانات الموظف' });
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetEmployeeStatsQueryKey() });
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast({ title: 'حدث خطأ', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!employee || !name.trim() || !phone.trim()) return;
    updateMutation.mutate({
      id: employee.id,
      data: {
        name: name.trim(),
        phone: phone.trim(),
        role,
        email: email.trim() || undefined,
        ...(password.trim() ? { password: password.trim() } : {}),
      },
    });
  };

  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">رقم الهاتف</label>
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">رقم سري جديد (اتركه فارغاً للاحتفاظ بالحالي)</label>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الدور</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="employee">موظف</option>
              <option value="admin">مدير النظام</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الحفظ...
              </>
            ) : (
              'حفظ التعديلات'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
