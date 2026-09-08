import { permanentRedirect } from "next/navigation";

// Legacy multi-business public URLs now converge on the one studio homepage.
export default function LegacyStudioPage() { permanentRedirect("/"); }
