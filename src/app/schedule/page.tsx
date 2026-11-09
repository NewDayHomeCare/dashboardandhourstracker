import Link from "next/link";
import { requireStaffPage } from "@/lib/auth/staffSession";
import { getClients, getSchedule } from "@/lib/data";
import { today } from "@/lib/dates";
import { PlanCareButton, ScheduleWorkspace } from "@/components/ScheduleWorkspace";
export const dynamic = "force-dynamic";
export default async function SchedulePage() {
  await requireStaffPage();
  const [clients, schedule] = await Promise.all([getClients(), getSchedule()]);
  const due = schedule.filter(d => d.date <= today());
  return <>
    <h1 className="text-3xl font-bold">Schedule</h1>
    <p className="my-3 text-muted">Arrange daily care here. After care happens, confirm actual hours in Review.</p>
    <PlanCareButton clients={clients} schedule={schedule} currentDate={today()} />
    {due.length > 0 && <Link href="/review" className="mt-4 block font-semibold text-brand underline">{due.length} scheduled day(s) are ready to review, including today</Link>}
    <ScheduleWorkspace clients={clients} schedule={schedule.filter(d => d.date > today())} review={false} />
  </>;
}
