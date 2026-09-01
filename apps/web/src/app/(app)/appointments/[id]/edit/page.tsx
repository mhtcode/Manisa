import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointment-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toDateTimeInput } from "@/lib/time";
import { updateAppointment } from "@/server/actions/appointments";
export default async function EditAppointmentPage({ params }: { params: Promise<{id:string}> }) { const {id}=await params; const [appointment,customers,services]=await Promise.all([prisma.appointment.findUnique({where:{id}}),prisma.customer.findMany({where:{active:true}}),prisma.service.findMany({orderBy:{name:"asc"}})]); if(!appointment) notFound(); return <><PageHeading title="Edit appointment" description="Update scheduling and expected details."/><AppointmentForm action={updateAppointment.bind(null,id)} appointment={{...appointment,startAt:toDateTimeInput(appointment.startAt),expectedPrice:appointment.expectedPrice.toString()}} customers={customers.map((item)=>({id:item.id,name:customerName(item)}))} services={services.map((item)=>({id:item.id,name:item.name,duration:item.defaultDurationMinutes,price:item.defaultPrice.toString()}))}/></>; }
