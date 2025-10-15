// Clean implementation for RunViewer
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Play, Download } from "lucide-react";
import { WorkflowRun, NodeStatus } from "@/types/workflow";
import { listWorkflows } from "@/lib/listWorkflows";
import { getWorkflow } from "@/lib/getWorkflow";
import { WorkflowCardDetails } from "./WorkflowCardDetails";

const statusIcons: Record<NodeStatus, any> = {
  idle: Clock,
  running: Play,
  success: CheckCircle2,
  failed: XCircle,
  pending: Clock,
};

const statusColors: Record<NodeStatus, string> = {
  idle: "bg-primary/10 text-primary",
  running: "bg-primary/10 text-primary",
  success: "bg-github-success/10 text-github-success",
  failed: "bg-github-danger/10 text-github-danger",
  pending: "bg-primary/10 text-primary",
};

interface RunViewerProps {
  runs: WorkflowRun[];
  onOpenWorkflow?: (workflow: any) => void;
}

export const RunViewer = ({ runs, onOpenWorkflow }: RunViewerProps) => {
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    listWorkflows().then(setWorkflows).catch(() => setWorkflows([]));
  }, []);

  if (!runs || runs.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {/* Show saved workflows if any */}
        {workflows.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Saved Workflows</h3>
            <div className="space-y-2">
              {workflows.map((wf, idx) => (
                <WorkflowCardDetails
                  key={wf.id ? `${wf.id}_${idx}` : `workflow_${idx}`}
                  wf={wf}
                  onOpenWorkflow={onOpenWorkflow}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Download processed CSV for the selected run
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { id } = runs[selectedRunIdx];
      const blob = await import("@/lib/runApi").then(m => m.downloadRunCSV(id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `run_${id}_output.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download CSV. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  const run = runs[selectedRunIdx];
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Runs</h2>
          <div className="flex gap-2 mt-2">
            {runs.map((r, idx) => (
              <Button
                key={r.id || idx}
                size="sm"
                variant={selectedRunIdx === idx ? "default" : "outline"}
                onClick={() => setSelectedRunIdx(idx)}
              >
                Run {idx + 1}
              </Button>
            ))}
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            run.status === "completed"
              ? "bg-github-success/10 text-github-success"
              : run.status === "failed"
              ? "bg-github-danger/10 text-github-danger"
              : "bg-primary/10 text-primary"
          }
        >
          {run.status}
        </Badge>
      </div>
      {/* Show saved workflows above run logs */}
      {workflows.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Saved Workflows</h3>
          <div className="space-y-2">
            {workflows.map(wf => (
              <Card key={wf.id} className="p-4 border-border text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{wf.name}</div>
                    <div className="text-xs text-muted-foreground">{wf.status}</div>
                  </div>
                  <Badge>{wf.status}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{wf.id}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground mb-1">Started At</p>
          <p className="font-mono text-sm">
            {new Date(run.startedAt).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground mb-1">Finished At</p>
          <p className="font-mono text-sm">
            {run.finishedAt
              ? new Date(run.finishedAt).toLocaleString()
              : "In Progress"}
          </p>
        </Card>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3">Execution Log</h3>
        <div className="space-y-2">
          {run.logs.map((log, index) => {
            const StatusIcon = statusIcons[log.status];
            return (
              <Card key={index} className="p-4 border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Badge className={statusColors[log.status]}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {log.status}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">{log.nodeId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                      {log.error && (
                        <p className="text-xs text-github-danger mt-1">
                          {log.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Show processed output for each node, including rule branches */}
                {log.output && (
                  <div className="mt-3 p-2 bg-muted/30 rounded border border-border">
                    <pre className="text-xs font-mono overflow-x-auto">
                      {(() => {
                        // Helper to stringify output, replacing undefined assignees with []
                        function cleanOutput(obj) {
                          if (!obj) return obj;
                          const copy = JSON.parse(JSON.stringify(obj));
                          if (Array.isArray(copy)) {
                            return copy.map(cleanOutput);
                          }
                          if (typeof copy === 'object') {
                            if ('assignees' in copy && (copy.assignees === undefined || copy.assignees === null)) {
                              copy.assignees = [];
                            }
                            for (const k in copy) {
                              copy[k] = cleanOutput(copy[k]);
                            }
                          }
                          return copy;
                        }
                        if (log.nodeId && log.output.true !== undefined && log.output.false !== undefined) {
                          return `True Branch:\n${JSON.stringify(cleanOutput(log.output.true), null, 2)}\n\nFalse Branch:\n${JSON.stringify(cleanOutput(log.output.false), null, 2)}`;
                        }
                        return JSON.stringify(cleanOutput(log.output), null, 2);
                      })()}
                    </pre>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
      {run.status === "completed" && (
        <Button className="w-full" onClick={handleDownload} disabled={downloading}>
          <Download className="w-4 h-4 mr-2" />
          {downloading ? "Downloading..." : "Download Results"}
        </Button>
      )}
    </div>
  );
};
