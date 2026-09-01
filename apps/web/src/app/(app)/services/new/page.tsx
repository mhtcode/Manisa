import { PageHeading } from "@/components/page-heading";
import { ServiceForm } from "@/components/service-form";
import { createService } from "@/server/actions/services";
export default function NewServicePage() { return <><PageHeading title="New service" description="Set defaults that can still be adjusted for each appointment."/><ServiceForm action={createService}/></>; }
