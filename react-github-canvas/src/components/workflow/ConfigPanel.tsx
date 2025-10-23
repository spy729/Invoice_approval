import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkflowNode } from "@/types/workflow";

type ConfigPanelProps = {
  node: WorkflowNode | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
  allCards?: WorkflowNode[];
};
import { X } from "lucide-react";
import { InputNodeData } from "./InputNodeData";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

export const ConfigPanel = ({ node, onUpdate, onClose, allCards }: ConfigPanelProps) => {
  // Operator options for conditions
  const operatorOptions = [
    { value: "===", label: "Equals (===)" },
    { value: "==", label: "Loose Equals (==)" },
    { value: "!==", label: "Not Equals (!==)" },
    { value: "!=", label: "Loose Not Equals (!=)" },
    { value: ">", label: "Greater Than (>)" },
    { value: "<", label: "Less Than (<)" },
    { value: ">=", label: "Greater or Equal (>=)" },
    { value: "<=", label: "Less or Equal (<=)" },
    { value: "contains", label: "Contains" },
    { value: "notContains", label: "Does Not Contain" },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
    { value: "matches", label: "Matches Regex" },
    { value: "notMatches", label: "Does Not Match Regex" },
    { value: "in", label: "In List" },
    { value: "notIn", label: "Not In List" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
    { value: "isNull", label: "Is Null" },
    { value: "isNotNull", label: "Is Not Null" },
    { value: "includes", label: "Includes (Array)" },
    { value: "excludes", label: "Excludes (Array)" },
    { value: "between", label: "Between" },
    { value: "notBetween", label: "Not Between" },
  ];
  if (!node) return null;

  // Zod schemas for each card type
  const ruleItemSchema = z.object({
    field: z.string().min(1, "Field required"),
    operator: z.string().min(1, "Operator required"),
    value: z.string().min(1, "Value required"),
    trueNext: z.string().min(1, "Select next card for TRUE"),
    falseNext: z.string().min(1, "Select next card for FALSE")
  });
  const ruleSchema = z.object({
    label: z.string().min(1, "Label required"),
    rules: z.array(ruleItemSchema).min(1, "At least one rule required")
  });
  const approvalRuleSchema = z.object({
    field: z.string().min(1, "Field required"),
    operator: z.string().min(1, "Operator required"),
    value: z.string().min(1, "Value required"),
    assignee: z.string().min(1, "Select assignee"),
  });
  const approvalSchema = z.object({
    label: z.string().min(1, "Label required"),
    rules: z.array(approvalRuleSchema).min(1, "At least one rule required")
  });
  const exportSchema = z.object({
    label: z.string().min(1, "Label required"),
    format: z.enum(["csv", "json", "xlsx"]),
    destination: z.enum(["download", "email", "webhook"])
  });

  // Select schema based on node type
  let schema: any = null;
  if (node.type === "rule") schema = ruleSchema;
  if (node.type === "approval") schema = approvalSchema;
  if (node.type === "export") schema = exportSchema;

  // Default values
  let defaultValues: any = { label: node.data.label || "" };
  if (node.type === "rule") {
    defaultValues = {
      label: node.data.label || "",
      rules: node.data.config?.rules || [ { field: "", operator: "", value: "", trueNext: "", falseNext: "" } ]
    };
  } else if (node.type === "approval") {
    defaultValues = {
      label: node.data.label || "",
      rules: node.data.config?.rules || [ { field: "", operator: "", value: "", assignee: "" } ]
    };
  } else if (node.type === "export") {
    defaultValues = {
      label: node.data.label || "",
      format: node.data.config?.format || "csv",
      destination: node.data.config?.destination || "download"
    };
  }

  // React Hook Form
  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues
  });
  const { register, handleSubmit, formState, setValue, watch } = form;

  // Determine available invoice fields from the Input node's uploaded result
  const inputNode = allCards?.find(c => c.type === 'input');
  const invoiceFields: string[] = [];
  try {
    const sample = inputNode?.data?.config?.result?.[0];
    if (sample && typeof sample === 'object') {
      invoiceFields.push(...Object.keys(sample));
    }
  } catch {}

  // Employees (assignees) for approval dropdown
  const [employees, setEmployees] = useState<any[]>([]);
  useEffect(() => {
    if (!node || node.type !== 'approval') return;
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('workflow_token');
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          console.warn('Could not fetch employees:', res.status, await res.text());
          return;
        }
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching employees', err);
      }
    };
    fetchEmployees();
  }, [node]);

  // Update parent on submit
  const onSubmit = (values: any) => {
    let config: any = {};
    if (node.type === "rule") {
      config = {
        rules: values.rules
      };
    } else if (node.type === "approval") {
      config = {
        rules: values.rules
      };
    } else if (node.type === "export") {
      config = {
        format: values.format,
        destination: values.destination
      };
    }
    onUpdate(node.id, { ...node.data, label: values.label, config });
    toast.success("Config saved");
  };

  return (
    <Card className="p-6 border-border bg-card h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Configure Card</h2>
        <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Cancel">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {node.type === "input" && (
          <div className="mt-4">
            <InputNodeData node={node} onUpdate={onUpdate} />
          </div>
        )}

        {node.type === "rule" && (
          <>
            <div className="mb-2">
              <Label>Rule Conditions</Label>
              <div className="space-y-2 mt-2">
                {watch("rules")?.map((rule: any, idx: number) => (
                  <div key={idx} className="mb-4">
                    <div className="flex gap-2 items-center">
                      {invoiceFields.length ? (
                        <Select
                          value={watch(`rules.${idx}.field`) || ""}
                          onValueChange={value => setValue(`rules.${idx}.field`, value)}
                        >
                          <SelectTrigger className="mt-1.5 w-40">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {invoiceFields.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          {...register(`rules.${idx}.field` as const)}
                          placeholder="Field (e.g., amount)"
                          className="w-1/5"
                        />
                      )}
                      <Select
                        value={watch(`rules.${idx}.operator`) || ""}
                        onValueChange={value => setValue(`rules.${idx}.operator`, value)}
                      >
                        <SelectTrigger className="mt-1.5 w-28">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {operatorOptions.map(op => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        {...register(`rules.${idx}.value` as const)}
                        placeholder="Value"
                        className="w-1/5"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const rules = [...(watch("rules") || [])];
                          rules.splice(idx, 1);
                          setValue("rules", rules);
                        }}
                        disabled={watch("rules")?.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <div className="flex flex-col w-1/2">
                        <span className="text-xs text-muted-foreground mb-1">Next Node (TRUE)</span>
                        <Select
                          value={watch(`rules.${idx}.trueNext`) || ""}
                          onValueChange={value => setValue(`rules.${idx}.trueNext`, value)}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select node for TRUE" />
                          </SelectTrigger>
                          <SelectContent>
                            {allCards?.filter(c => c.id !== node.id).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.data.label} [{c.type}]</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col w-1/2">
                        <span className="text-xs text-muted-foreground mb-1">Next Node (FALSE)</span>
                        <Select
                          value={watch(`rules.${idx}.falseNext`) || ""}
                          onValueChange={value => setValue(`rules.${idx}.falseNext`, value)}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select node for FALSE" />
                          </SelectTrigger>
                          <SelectContent>
                            {allCards?.filter(c => c.id !== node.id).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.data.label} [{c.type}]</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setValue("rules", [...(watch("rules") || []), { expression: "", trueNext: "", falseNext: "" }])}
                >
                  Add Rule
                </Button>
              </div>
              {formState.errors.rules?.message && typeof formState.errors.rules.message === "string" && (
                <div className="text-red-500 text-xs mt-1">{formState.errors.rules.message}</div>
              )}
            </div>
          </>
        )}

        {node.type === "approval" && (
          <>
            <div className="mb-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" {...register("label")} placeholder="Approval Card Name" className="mt-1.5 mb-2" />
              {formState.errors.label?.message && typeof formState.errors.label.message === "string" && (
                <div className="text-red-500 text-xs mt-1">{formState.errors.label.message}</div>
              )}
            </div>
            <div className="mb-2">
              <Label>Approval Rules</Label>
              <div className="space-y-2 mt-2">
                {watch("rules")?.map((rule: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    {invoiceFields.length ? (
                      <Select
                        value={watch(`rules.${idx}.field`) || ""}
                        onValueChange={value => setValue(`rules.${idx}.field`, value)}
                      >
                        <SelectTrigger className="mt-1.5 w-40">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {invoiceFields.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        {...register(`rules.${idx}.field` as const)}
                        placeholder="Field (e.g., amount)"
                        className="w-1/5"
                      />
                    )}
                    <Select
                      value={watch(`rules.${idx}.operator`) || ""}
                      onValueChange={value => setValue(`rules.${idx}.operator`, value)}
                    >
                      <SelectTrigger className="mt-1.5 w-28">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      {...register(`rules.${idx}.value` as const)}
                      placeholder="Value"
                      className="w-1/5"
                    />
                    {/* Assignee selector: show company employees + manual option */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={watch(`rules.${idx}.assignee`) || (employees.length ? "" : "__manual__")}
                        onValueChange={value => {
                          if (value === "__manual__") {
                            setValue(`rules.${idx}.assignee`, "");
                          } else {
                            setValue(`rules.${idx}.assignee`, value);
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1.5 w-56">
                          <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp._id || emp.id} value={emp.email}>{emp.name} — {emp.email}</SelectItem>
                          ))}
                          <SelectItem value="__manual__">Enter manually</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Manual input shown when user selects 'Enter manually' or when there are no employees */}
                      {(
                        watch(`rules.${idx}.assignee`) === "" ||
                        watch(`rules.${idx}.assignee`) === "__manual__" ||
                        employees.length === 0
                      ) && (
                        <Input
                          value={watch(`rules.${idx}.assignee`) === "__manual__" ? "" : (watch(`rules.${idx}.assignee`) || "")}
                          onChange={(e) => setValue(`rules.${idx}.assignee`, e.target.value)}
                          placeholder="Assignee (email)"
                          className="w-1/4"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const rules = [...(watch("rules") || [])];
                        rules.splice(idx, 1);
                        setValue("rules", rules);
                      }}
                      disabled={watch("rules")?.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setValue("rules", [...(watch("rules") || []), { condition: "", assignee: "" }])}
                >
                  Add Rule
                </Button>
              </div>
              {formState.errors.rules?.message && typeof formState.errors.rules.message === "string" && (
                <div className="text-red-500 text-xs mt-1">{formState.errors.rules.message}</div>
              )}
            </div>
          </>
        )}

        {node.type === "export" && (
          <>
            <div>
              <Label htmlFor="format">Export Format</Label>
              <Select value={watch("format") || "csv"} onValueChange={(value) => setValue("format", value)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destination">Destination</Label>
              <Select value={watch("destination") || "download"} onValueChange={(value) => setValue("destination", value)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="download">Local Download</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {schema && (
          <Button type="submit" className="w-full mt-4">Save Config</Button>
        )}
      </form>
    </Card>
  );
};
