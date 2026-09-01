import { CustomerForm } from "@/components/customer-form";
import { PageHeading } from "@/components/page-heading";
import { createCustomer } from "@/server/actions/customers";
export default function NewCustomerPage() { return <><PageHeading title="New customer" description="Add contact details and preferences. Only a first name is required."/><CustomerForm action={createCustomer}/></>; }
