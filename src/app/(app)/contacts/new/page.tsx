import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewContactForm } from "@/components/contacts/new-contact-form";

export default function NewContactPage() {
  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} />
        Back to contacts
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Add a contact</CardTitle>
        </CardHeader>
        <CardContent>
          <NewContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
