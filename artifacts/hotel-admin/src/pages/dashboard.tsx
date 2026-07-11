import { Layout } from '@/components/layout';
import { PageHeader, DataCard } from '@/components/ui-custom';
import { 
  useGetDashboardStats, 
  useGetRoomOccupancy, 
  useGetRecentReservations,
  useGetEmployeeStats
} from '@workspace/api-client-react';
import { BedDouble, CalendarCheck, CalendarDays, Coins, CheckSquare, LogOut, Loader2, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { StatusBadge } from '@/components/ui-custom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'wouter';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: ['dashboard-stats'] } });
  const { data: occupancy, isLoading: occLoading } = useGetRoomOccupancy({ query: { queryKey: ['room-occupancy'] } });
  const { data: recent, isLoading: recentLoading } = useGetRecentReservations({ query: { queryKey: ['recent-reservations'] } });
  const { data: employeeStats, isLoading: empLoading } = useGetEmployeeStats({ query: { queryKey: ['employee-stats'] } });

  const isLoading = statsLoading || occLoading || recentLoading || empLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const occupancyData = occupancy || [];
  const recentReservations = recent || [];
  const empData = employeeStats || [];

  return (
    <Layout>
      <PageHeader 
        title="نظرة عامة" 
        description="ملخص الأداء وحالة الفندق اليوم" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DataCard 
          title="الغرف المتاحة" 
          value={stats?.availableRooms || 0} 
          icon={<BedDouble />}
          description={`من إجمالي ${stats?.totalRooms || 0} غرفة`}
          valueClassName="text-status-available"
        />
        <DataCard 
          title="نسبة الإشغال" 
          value={`${Math.round(((stats?.occupiedRooms || 0) / (stats?.totalRooms || 1)) * 100)}%`} 
          icon={<CalendarCheck />}
          description={`${stats?.occupiedRooms || 0} غرفة مشغولة`}
        />
        <DataCard 
          title="حجوزات نشطة" 
          value={stats?.activeReservations || 0} 
          icon={<CalendarDays />}
          description={`${stats?.todayCheckIns || 0} تسجيل دخول اليوم`}
        />
        <DataCard 
          title="إيرادات الشهر" 
          value={`${stats?.monthlyRevenue?.toLocaleString() || 0} ج.م`} 
          icon={<Coins />}
          valueClassName="text-primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Occupancy Chart */}
        <div className="col-span-1 lg:col-span-2 bg-card border border-card-border rounded-lg p-6">
          <h3 className="font-serif text-lg mb-6 text-foreground font-bold">إشغال الغرف</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="total" tickFormatter={() => 'الفندق'} stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#222' }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                />
                <Bar dataKey="occupied" name="مشغولة" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="available" name="متاحة" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h3 className="font-serif text-lg mb-6 text-foreground font-bold">نشاط اليوم</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-status-checked-in/20 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-status-checked-in" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.todayCheckIns || 0}</div>
                <div className="text-sm text-muted-foreground">تسجيل دخول متوقع</div>
              </div>
            </div>
            <div className="w-full h-px bg-border" />
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-status-checked-out/20 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-status-checked-out" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.todayCheckOuts || 0}</div>
                <div className="text-sm text-muted-foreground">تسجيل خروج متوقع</div>
              </div>
            </div>
            <div className="w-full h-px bg-border" />
            <div>
               <h4 className="text-sm font-medium mb-3 text-muted-foreground">أفضل الموظفين (حجوزات الشهر)</h4>
               <div className="space-y-3">
                 {empData.slice(0, 3).map((emp, i) => (
                   <div key={emp.employeeId} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                       <span className="text-sm">{emp.employeeName}</span>
                     </div>
                     <span className="text-sm font-bold text-primary">{emp.totalReservations} حجز</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-lg text-foreground font-bold">أحدث الحجوزات</h3>
          <Link href="/reservations" className="text-sm text-primary hover:underline flex items-center gap-1">
            عرض الكل <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-muted-foreground border-b border-border/50">
              <tr>
                <th className="pb-3 font-medium">الضيف</th>
                <th className="pb-3 font-medium">الغرفة</th>
                <th className="pb-3 font-medium">تاريخ الدخول</th>
                <th className="pb-3 font-medium">تاريخ الخروج</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentReservations.map((res) => (
                <tr key={res.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3">
                    <div className="font-medium text-foreground">{res.guest?.name}</div>
                    <div className="text-xs text-muted-foreground">{res.guest?.phone}</div>
                  </td>
                  <td className="py-3">
                    <div className="inline-flex items-center justify-center px-2 py-1 bg-secondary rounded text-secondary-foreground font-mono text-xs">
                      {res.room?.number}
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{format(new Date(res.checkInDate), 'dd MMM yyyy', { locale: ar })}</td>
                  <td className="py-3 text-muted-foreground">{format(new Date(res.checkOutDate), 'dd MMM yyyy', { locale: ar })}</td>
                  <td className="py-3"><StatusBadge status={res.status} /></td>
                  <td className="py-3 font-mono font-medium">{res.totalAmount} ج.م</td>
                </tr>
              ))}
              {recentReservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد حجوزات حديثة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
