import React from "react";
import { Button } from "@/components/ui/button";

export const WorkflowDetailsModal = ({ workflow, onClose, onLoad }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-card rounded-lg shadow-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">Workflow Details: {workflow.name}</h2>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Nodes</h3>
          <ul>
            {workflow.cards.map((card: any, idx: number) => (
              <li key={idx} className="mb-2 p-2 border rounded">
                <div><b>Label:</b> {card.data.label}</div>
                <div><b>Type:</b> {card.type}</div>
                <div><b>Config:</b> <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(card.data.config, null, 2)}</pre></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2 justify-end">
          <Button onClick={onLoad}>Open in Canvas</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};