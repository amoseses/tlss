import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getManagerFeedback } from "@/lib/data/manager";
import type { Feedback } from "@/types/database";

export default async function ManagerFeedbackPage() {
  const rows = await getManagerFeedback();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Messages from buyers, sellers, and guests.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[45%]">Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows as Feedback[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                  No feedback yet.
                </TableCell>
              </TableRow>
            ) : (
              (rows as Feedback[]).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                    {new Date(f.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.user_id ? (
                      <span className="font-mono text-xs">{f.user_id.slice(0, 8)}…</span>
                    ) : (
                      f.email ?? "Guest"
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{f.subject}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md whitespace-pre-wrap text-sm">
                    {f.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
