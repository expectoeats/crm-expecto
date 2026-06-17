"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import { Button, Card, Input, Select, SectionTitle, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/http";

type Employee = { _id: string; name: string };

const employeesFetcher = async () => (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];

export default function AddLeadPage() {
  const router = useRouter();
  const { data: employees = [] } = useSWR("employees-for-lead", employeesFetcher);
  const [weakPoints, setWeakPoints] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    nichePreset: "Coaching",
    nicheCustom: "",
    businessDescription: "",
    websiteStatus: "no_website",
    websiteUrl: "",
    strongHook: "",
    suggestedService: "",
    callScript: "",
    leadQuality: "warm",
    source: "google_research",
    assignedTo: "",
  });

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const niche = form.nichePreset === "Other" ? form.nicheCustom : form.nichePreset;
      await apiFetch("/leads", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          niche,
          weakPoints: weakPoints.filter(Boolean),
          assignedTo: form.assignedTo || null,
        }),
      });
      router.push("/admin/leads");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Create lead" title="Add new lead" description="Fill the intelligence fields the employee should see before calling." />

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Business name" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
            <Input placeholder="Owner name" value={form.ownerName} onChange={(event) => updateField("ownerName", event.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
            <Input placeholder="Email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            <Input placeholder="City" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
            <Select value={form.nichePreset} onChange={(event) => updateField("nichePreset", event.target.value)}>
              {["Coaching", "Restaurant", "Clinic", "Real Estate", "Salon", "E-commerce", "CA/Lawyer", "Gym", "School", "Hotel", "Other"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            {form.nichePreset === "Other" ? (
              <Input placeholder="Custom niche" value={form.nicheCustom} onChange={(event) => updateField("nicheCustom", event.target.value)} />
            ) : null}
          </div>

          <Textarea placeholder="Business description" value={form.businessDescription} onChange={(event) => updateField("businessDescription", event.target.value)} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={form.websiteStatus} onChange={(event) => updateField("websiteStatus", event.target.value)}>
              <option value="no_website">No Website</option>
              <option value="website_is_bad">Has Website but UI is bad</option>
              <option value="has_website">Has Website</option>
            </Select>
            <Input placeholder="Website URL" value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} />
            <Select value={form.leadQuality} onChange={(event) => updateField("leadQuality", event.target.value)}>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </Select>
          </div>

          <Textarea placeholder="Strong hook" value={form.strongHook} onChange={(event) => updateField("strongHook", event.target.value)} />
          <Input placeholder="Suggested service" value={form.suggestedService} onChange={(event) => updateField("suggestedService", event.target.value)} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Weak points</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setWeakPoints((current) => [...current, ""])}
              >
                <RiAddLine className="h-4 w-4" />
                Add weak point
              </Button>
            </div>
            <div className="space-y-2">
              {weakPoints.map((weakPoint, index) => (
                <div key={`${index}-${weakPoint}`} className="flex gap-2">
                  <Input
                    value={weakPoint}
                    onChange={(event) => {
                      const value = event.target.value;
                      setWeakPoints((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
                    }}
                    placeholder="Weak point"
                  />
                  <Button type="button" variant="secondary" onClick={() => setWeakPoints((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Textarea placeholder="Call script / talking points" value={form.callScript} onChange={(event) => updateField("callScript", event.target.value)} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={form.source} onChange={(event) => updateField("source", event.target.value)}>
              <option value="google_research">Google Research</option>
              <option value="referral">Referral</option>
              <option value="social_media">Social Media</option>
              <option value="other">Other</option>
            </Select>
            <Select value={form.assignedTo} onChange={(event) => updateField("assignedTo", event.target.value)}>
              <option value="">Leave unassigned</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save lead"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
