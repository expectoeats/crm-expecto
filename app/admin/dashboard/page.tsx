"use client";

import useSWR from "swr";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from "recharts";
import { Plus, Shuffle } from "lucide-react";
import { Button, Card, EmptyState, SectionTitle, SkeletonCard } from "@/components/ui";
import { apiFetch } from "@/lib/http";

type StatsResponse = {
  summary: {
    totalLeads: number;
    todayFollowUps: number;
    hotLeads: number;
    closedWon: number;
    conversionRate: number;
    employees: number;
  };
  leadsByStatus: Array<{ _id: string; count: number }>;
  leadsByNiche: Array<{ _id: string; count: number }>;
  leadsByEmployee: Array<{ _id: string; name?: string; count: number }>;
};

type EmployeeStats = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  totalLeads: number;
  activeLeads: number;
  callsMade: number;
  interestedLeads: number;
  closedLeads: number;
};

const statsFetcher = async () => (await apiFetch<StatsResponse>("/stats")).data;
const employeesFetcher = async () => (await apiFetch<{ employees: EmployeeStats[] }>("/users/employees")).data?.employees ?? [];

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useSWR("admin-stats", statsFetcher);
  const { data: employees = [], isLoading: employeesLoading } = useSWR("admin-employees", employeesFetcher);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Overview" title="Admin dashboard" description="Track lead health, team output, and daily follow-ups." />

      {statsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total Leads", value: stats?.summary.totalLeads ?? 0 },
            { label: "Today's Follow-ups", value: stats?.summary.todayFollowUps ?? 0 },
            { label: "Hot Leads", value: stats?.summary.hotLeads ?? 0 },
            { label: "Closed Won", value: stats?.summary.closedWon ?? 0 },
            { label: "Conversion %", value: `${stats?.summary.conversionRate ?? 0}%` },
          ].map((item) => (
            <Card key={item.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-3">
          <SectionTitle eyebrow="Chart" title="Leads by status" />
          {stats?.leadsByStatus?.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.leadsByStatus}>
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f172a" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No data yet" description="Create some leads to populate the chart." />
          )}
        </Card>

        <Card className="space-y-3">
          <SectionTitle eyebrow="Chart" title="Leads by niche" />
          {stats?.leadsByNiche?.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.leadsByNiche} dataKey="count" nameKey="_id" innerRadius={60} outerRadius={95} paddingAngle={4}>
                    {stats.leadsByNiche.map((entry, index) => (
                      <Cell key={entry._id} fill={["#0f172a", "#f97316", "#14b8a6", "#3b82f6", "#8b5cf6"][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No niche data" description="Niche distribution will appear here once leads are added." />
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <SectionTitle
          eyebrow="Team"
          title="Employee performance"
          description="Assigned volume and call performance across the team."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => (window.location.href = "/admin/leads/new")}>
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
              <Button onClick={async () => {
                await apiFetch("/leads/auto-assign", { method: "POST" });
                window.location.reload();
              }}>
                <Shuffle className="h-4 w-4" />
                Auto-Assign
              </Button>
            </div>
          }
        />

        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
                <th className="px-4 py-3 font-semibold">Called</th>
                <th className="px-4 py-3 font-semibold">Interested</th>
                <th className="px-4 py-3 font-semibold">Closed</th>
                <th className="px-4 py-3 font-semibold">Call Rate</th>
              </tr>
            </thead>
            <tbody>
              {employeesLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : employees.length ? (
                employees.map((employee) => {
                  const callRate = employee.totalLeads ? Math.round((employee.callsMade / employee.totalLeads) * 100) : 0;
                  return (
                    <tr key={employee._id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold text-slate-950">{employee.name}</td>
                      <td className="px-4 py-3">{employee.totalLeads}</td>
                      <td className="px-4 py-3">{employee.callsMade}</td>
                      <td className="px-4 py-3">{employee.interestedLeads}</td>
                      <td className="px-4 py-3">{employee.closedLeads}</td>
                      <td className="px-4 py-3">{callRate}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <EmptyState title="No employees" description="Create employee accounts to see performance here." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
