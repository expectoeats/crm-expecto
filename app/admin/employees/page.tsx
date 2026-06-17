"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  RiAlertLine,
  RiKeyLine,
  RiAddLine,
  RiCloseLine,
} from "react-icons/ri";
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
  passwordResetRequested?: boolean;
  passwordResetRequestedAt?: string | null;
};

const employeesFetcher = async () => (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];
const employeeLeadsFetcher = async (path: string) => (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];

export default function EmployeesPage() {
  const { data: employees = [], isLoading, mutate } = useSWR("admin-employees-page", employeesFetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeLeadCount, setSelectedEmployeeLeadCount] = useState(0);
  const [resetEmployee, setResetEmployee] = useState<Employee | null>(null);
  const [resetMode, setResetMode] = useState<"default" | "custom">("default");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showResetRequests, setShowResetRequests] = useState(false);
  const [resetRequestsDismissed, setResetRequestsDismissed] = useState(false);
  const { data: employeeLeads = [] } = useSWR(
    selectedEmployeeId ? `/leads?page=1&limit=50&assignedTo=${selectedEmployeeId}` : null,
    employeeLeadsFetcher
  );

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const resetRequests = employees.filter((employee) => employee.passwordResetRequested);
  const resetRequestsPopupOpen = showResetRequests || (resetRequests.length > 0 && !resetRequestsDismissed);

  function closeResetRequests() {
    setShowResetRequests(false);
    setResetRequestsDismissed(true);
  }

  async function createEmployee() {
    await apiFetch("/users/create", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setShowAdd(false);
    setForm({ name: "", email: "", password: "", phone: "" });
    await mutate();
  }

  function openResetModal(employee: Employee) {
    setResetEmployee(employee);
    setResetMode("default");
    setResetPassword("");
    setResetError("");
    setResetMessage("");
  }

  async function resetEmployeePassword() {
    if (!resetEmployee) return;

    setResetLoading(true);
    setResetError("");
    setResetMessage("");

    try {
      const response = await apiFetch<{ defaultPassword?: string }>(`/users/${resetEmployee._id}/password-reset`, {
        method: "POST",
        body: JSON.stringify({
          mode: resetMode,
          password: resetMode === "custom" ? resetPassword : undefined,
        }),
      });

      const defaultPassword = response.data?.defaultPassword;
      setResetMessage(defaultPassword ? `Default password set: ${defaultPassword}` : "Password reset successfully");
      await mutate();
    } catch (passwordResetError) {
      setResetError(passwordResetError instanceof Error ? passwordResetError.message : "Unable to reset password");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Team"
        title="Employee management"
        description="Create employees, inspect assignments, and keep the team active."
        action={
          <Button onClick={() => setShowAdd(true)}>
            <RiAddLine className="h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      {resetRequests.length ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <RiAlertLine className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-950">Password reset requests</p>
              <p className="mt-1 text-sm text-slate-700">
                {resetRequests.map((employee) => employee.name).join(", ")} ne forgot password request ki hai.
              </p>
              <Button className="mt-3" variant="secondary" onClick={() => {
                setResetRequestsDismissed(false);
                setShowResetRequests(true);
              }}>
                Review requests
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => openResetModal(employee)}>
                    <RiKeyLine className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setSelectedEmployee(employee);
                    setSelectedEmployeeId(employee._id);
                    setSelectedEmployeeLeadCount(employee.totalLeads);
                  }}>
                    View Leads
                  </Button>
                </div>
              </div>

              {employee.passwordResetRequested ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
                  Employee requested password reset.
                </div>
              ) : null}

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
                <RiCloseLine className="h-4 w-4" />
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
                <RiCloseLine className="h-4 w-4" />
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

      {resetEmployee ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Reset password</h2>
                <p className="mt-1 text-sm text-slate-600">{resetEmployee.name} ke liye password set karein.</p>
              </div>
              <Button variant="ghost" onClick={() => setResetEmployee(null)}>
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant={resetMode === "default" ? "primary" : "secondary"} onClick={() => setResetMode("default")}>
                Default
              </Button>
              <Button variant={resetMode === "custom" ? "primary" : "secondary"} onClick={() => setResetMode("custom")}>
                Custom
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {resetMode === "custom" ? (
                <Input
                  type="password"
                  placeholder="New reset password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                />
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  Default password server setting se apply hoga.
                </div>
              )}
              {resetError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{resetError}</p> : null}
              {resetMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{resetMessage}</p> : null}
              <Button className="w-full" onClick={resetEmployeePassword} disabled={resetLoading}>
                {resetLoading ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {resetRequestsPopupOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl sm:max-w-lg sm:rounded-[28px]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Password reset requests</h2>
                <p className="mt-1 text-sm text-slate-600">Employees ne forgot password request bheji hai.</p>
              </div>
              <Button variant="ghost" onClick={closeResetRequests}>
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {resetRequests.length ? (
                resetRequests.map((employee) => (
                  <div key={employee._id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{employee.name}</p>
                      <p className="text-xs text-slate-600">{employee.email}</p>
                      {employee.passwordResetRequestedAt ? (
                        <p className="mt-1 text-xs text-amber-800">
                          Requested {new Date(employee.passwordResetRequestedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowResetRequests(false);
                        setResetRequestsDismissed(true);
                        openResetModal(employee);
                      }}
                    >
                    <RiKeyLine className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState title="No pending requests" description="All employee password requests are cleared." />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
