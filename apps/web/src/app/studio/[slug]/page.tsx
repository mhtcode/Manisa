import { StudioLanding } from "@/app/page";
export default async function PublicStudioPage({ params }: { params: Promise<{ slug: string }> }) { return <StudioLanding slug={(await params).slug}/>; }
