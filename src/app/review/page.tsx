import { requireStaffPage } from "@/lib/auth/staffSession";
import { getClients, getSchedule, getApprovals, getVisits } from "@/lib/data";
import { today } from "@/lib/dates";
import { ScheduleWorkspace } from "@/components/ScheduleWorkspace";
import { AddHoursButton } from "@/components/HoursDialogs";
export const dynamic = "force-dynamic";
export default async function ReviewPage() {
  await requireStaffPage();
  const [clients, schedule, approvals, visits] = await Promise.all([getClients(), getSchedule(), getApprovals(), getVisits()]);
  return <>
    <h1 className="text-3xl font-bold">Review completed care</h1>
    <p className="my-3 max-w-3xl text-muted">Check the client and date, then confirm the hours or adjust them. Older unreviewed care stays here until you resolve it. Confirm today&apos;s care only after it has finished.</p>
    <AddHoursButton clients={clients} approvals={approvals} visits={visits} schedule={schedule} buttonLabel="Record care without a schedule" primary={false} />
    <ScheduleWorkspace clients={clients} schedule={schedule.filter(d => d.date <= today())} review />
  </>;
}
