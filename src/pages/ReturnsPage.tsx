import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Eye, ArrowUpRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/modal';
import { api } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReturnsPage() {
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In our backend, credit notes are recorded. We can query invoices or reports
    const loadReturns = async () => {
      try {
        const data = await api.get('/invoices', { limit: 100 }).catch(() => ({ invoices: [] }));
        // Credit notes can also be queried
        setCreditNotes([]);
      } catch (err) {
        console.error('Failed to load returns:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReturns();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Sales Returns & Credit Notes</h2>
            <p className="text-xs text-slate-400 mt-1">Track returned merchandise, inventory replenishment, and refunds</p>
          </div>
          <Link to="/invoices">
            <Button variant="primary">
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Return Goods from Invoice
            </Button>
          </Link>
        </div>

        <Card>
          <div className="text-center py-12 text-slate-500 text-sm">
            <RotateCcw className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p>To process a return, open any posted bill under <Link to="/invoices" className="text-indigo-400 hover:underline">Invoices</Link> and click the return icon.</p>
            <p className="text-xs text-slate-600 mt-1">Goods will be restocked and a formal GST Credit Note will be generated.</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
