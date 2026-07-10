import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import { useListEmployees, useGetEmployeeStats } from '@workspace/api-client-react';
import { ShieldAlert, Award, Mail, Phone, Search, UsersRound, TrendingUp } from 'lucide-react';

export default function Employees() {
  const { data: employees, isLoading: empLoading } = useListEmployees();
  const { data: stats, isLoading: statsLoading } = useGetEmployeeStats();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'manager': return 'مدير';
      case 'supervisor': return 'مشرف';
      case 'receptionist': return 'موظف استقبال';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'supervisor': return 'bg-primary/10 text-primary border-primary/20';
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
      <PageHeader title="طاقم العمل" description="إدارة موظفي الفندق وأدائهم" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <div className="text-xl font-bold text-foreground">{roleCounts.manager ?? 0}</div>
            <div className="text-xs text-muted-foreground">مديرون</div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{roleCounts.supervisor ?? 0}</div>
            <div className="text-xs text-muted-foreground">مشرفون</div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{roleCounts.receptionist ?? 0}</div>
            <div className="text-xs text-muted-foreground">موظفو استقبال</div>
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
          <option value="manager">مدير</option>
          <option value="supervisor">مشرف</option>
          <option value="receptionist">موظف استقبال</option>
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
              <div key={employee.id} className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col relative group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="p-6 border-b border-border flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{employee.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mt-1 ${getRoleColor(employee.role)}`}>
                        {employee.role === 'manager' && <ShieldAlert className="h-3 w-3 mr-1" />}
                        {getRoleLabel(employee.role)}
                      </span>
                    </div>
                  </div>
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
    </Layout>
  );
}
