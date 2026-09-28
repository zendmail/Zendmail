import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImportCsvForm } from "@/components/contacts/import-csv-form";

export default function ImportContactsPage() {
  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} />
        Back to contacts
      </Link>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Import contacts from CSV</CardTitle>
            <CardDescription>Duplicate emails are skipped automatically.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ImportCsvForm />
        </CardContent>
      </Card>
    </div>
  );
}
