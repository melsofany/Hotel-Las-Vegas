import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import { useListGuests } from '@workspace/api-client-react';
import { Search, User, Phone, Flag, Mail, CreditCard } from 'lucide-react';
import { useState } from 'react';

export default function Guests() {
  const [search, setSearch] = useState('');
  const { data: guests, isLoading } = useListGuests({ search: search || undefined });

  return (
    <Layout>
      <PageHeader title="دليل الضيوف" description="سجل نزلاء فندق لاس فيجاس" />

      <div className="bg-card border border-card-border rounded-lg shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="بحث بالاسم، الهاتف، أو الهوية..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-md pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-0">
          <table className="w-full text-sm text-right">
            <thead className="text-muted-foreground bg-muted/20 border-b border-border">
              <tr>
                <th className="p-4 font-medium">الضيف</th>
                <th className="p-4 font-medium">معلومات الاتصال</th>
                <th className="p-4 font-medium">الهوية الوطنية / الجواز</th>
                <th className="p-4 font-medium">الجنسية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : guests?.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا يوجد ضيوف مطابقين للبحث</td></tr>
              ) : (
                guests?.map(guest => (
                  <tr key={guest.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{guest.name}</div>
                          <div className="text-xs text-muted-foreground">رقم العميل: #{guest.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> <span dir="ltr">{guest.phone}</span></div>
                        {guest.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> <span>{guest.email}</span></div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-mono text-xs bg-muted/30 py-1 px-2 rounded inline-flex">
                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                        {guest.nationalId}
                      </div>
                    </td>
                    <td className="p-4">
                      {guest.nationality ? (
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-muted-foreground" />
                          <span>{guest.nationality}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
