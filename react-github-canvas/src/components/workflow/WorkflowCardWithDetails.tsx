import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkflow } from "@/lib/getWorkflow";

interface WorkflowCardWithDetailsProps {
  wf: any;
  onOpenWorkflow?: (workflow: any) => void;
}

export function WorkflowCardWithDetails({ wf, onOpenWorkflow }: WorkflowCardWithDetailsProps) {
  const [details, setDetails] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  return (
    <>
      <Card
        className="p-4 border-border text-left cursor-pointer hover:bg-muted/40 transition"
        onClick={async () => {
          if (!details) {
            const workflow = await getWorkflow(wf.id);
            setDetails(workflow);
            if (onOpenWorkflow) onOpenWorkflow(workflow);
          }
          setShowDetails(s => !s);
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">{wf.name}</div>
            <div className="text-xs text-muted-foreground">{wf.status}</div>
          </div>
          <Badge>{wf.status}</Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{wf.id}</div>
      </Card>
      {showDetails && details && (
        <div className="p-4 border border-border bg-muted/10 mt-2 rounded">
          <div className="font-semibold mb-2">Workflow Structure</div>
          <pre className="text-xs font-mono overflow-x-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}
