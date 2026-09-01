import { AppointmentForm } from "@/components/appointment-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createAppointment } from "@/server/actions/appointments";
export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) { const [{ customerId },customers,services] = await Promise.all([searchParams,prisma.customer.findMany({ where:{active:true},orderBy:{firstName:"asc"} }),prisma.service.findMany({ where:{active:true},orderBy:{name:"asc"} })]); return <><PageHeading title="New appointment" description="Service defaults are prefilled and can be adjusted for this appointment."/><AppointmentForm action={createAppointment} initialCustomerId={customerId} customers={customers.map((item) => ({ id:item.id,name:customerName(item) }))} services={services.map((item) => ({ id:item.id,name:item.name,duration:item.defaultDurationMinutes,price:item.defaultPrice.toString() }))}/></>; }
