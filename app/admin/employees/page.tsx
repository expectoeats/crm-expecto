"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, X } from "lucide-react";
import { Button, Card, EmptyState, Input, SectionTitle, SkeletonCard } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";

type Employee = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  totalLeads: number;
  activeLeads: number;
  callsMade: number;
  isActive: boolean;
};

const employeesFetcher = async () => (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];
const employeeLeadsFetcher = async (path: string) => (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];

export default function EmployeesPage() {
  const { data: employees = [], isLoading, mutate } = useSWR("admin-employees-page", employeesFetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeLeadCount, setSelectedEmployeeLeadCount] = useState(0);
  const { data: employeeLeads = [] } = useSWR(
    selectedEmployeeId ? `/leads?page=1&limit=50&assignedTo=${selectedEmployeeId}` : null,
    employeeLeadsFetcher
  );

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

  async function createEmployee() {
    await apiFetch("/users/create", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setShowAdd(false);
    setForm({ name: "", email: "", password: "", phone: "" });
    await mutate();
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Team"
        title="Employee management"
        description="Create employees, inspect assignments, and keep the team active."
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : employees.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {employees.map((employee) => (
            <Card key={employee._id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950">{employee.name}</p>
                  <p className="text-sm text-slate-600">{employee.email}</p>
                  <p className="text-sm text-slate-600">{employee.phone ?? "No phone"}</p>
                </div>
                <Button variant="secondary" onClick={() => {
                  setSelectedEmployee(employee);
                  setSelectedEmployeeId(employee._id);
                  setSelectedEmployeeLeadCount(employee.totalLeads);
                }}>
                  View Leads
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <Card className="p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total</p>
                  <p className="mt-1 font-semibold">{employee.totalLeads}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active</p>
                  <p className="mt-1 font-semibold">{employee.activeLeads}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Calls</p>
                  <p className="mt-1 font-semibold">{employee.callsMade}</p>
                </Card>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No employees yet" description="Use the add employee action to start building the team." />
      )}

      {selectedEmployee ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{selectedEmployee.name}&apos;s leads</h2>
                <p className="text-sm text-slate-600">{selectedEmployeeLeadCount} assigned leads</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedEmployee(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {employeeLeads.length ? (
                employeeLeads.map((lead) => <LeadCard key={lead._id} lead={lead} />)
              ) : (
                <EmptyState title="No assigned leads" description="This employee has no leads assigned yet." />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showAdd ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Add employee</h2>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Input placeholder="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <Input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <Button className="w-full" onClick={createEmployee}>
                Save employee
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
