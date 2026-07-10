import { Layout } from '@/components/layout';
import { PageHeader, DataCard } from '@/components/ui-custom';
import { useListEmployees, useGetEmployeeStats } from '@workspace/api-client-react';
import { ShieldAlert, Award, Star, Mail, Phone } from 'lucide-react';

export default function Employees() {
  const { data: employees, isLoading: empLoading } = useListEmployees();
  const { data: stats, isLoading: statsLoading } = useGetEmployeeStats();

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'manager': return 'مدير';
      case 'supervisor': return 'مشرف';
      case 'receptionist': return 'موظف استقبال';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'manager': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'supervisor': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getEmployeeStat = (id: number) => {
    return stats?.find(s => s.employeeId === id);
  };

  return (
    <Layout>
      <PageHeader title="طاقم العمل" description="إدارة موظفي الفندق وأدائهم" />

      {empLoading || statsLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees?.map(employee => {
            const empStat = getEmployeeStat(employee.id);
            return (
              <div key={employee.id} className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col relative group">
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
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <span dir="ltr">{employee.phone}</span></div>
                    {employee.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <span>{employee.email}</span></div>}
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
