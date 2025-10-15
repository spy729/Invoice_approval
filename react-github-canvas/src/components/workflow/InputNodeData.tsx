// InputNodeData.tsx
import { useState } from 'react';
import axios from 'axios';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";

interface InputNodeDataProps {
  node: any;
  onUpdate: (nodeId: string, data: any) => void;
  onClose?: () => void;
}

export const InputNodeData = ({ node, onUpdate, onClose }: InputNodeDataProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState(node.data.config?.jsonData || '');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const updateNodeStatus = (status: 'idle' | 'success' | 'failed', payload?: any) => {
    // Always store result as array of objects
    let normalized = payload;
    if (payload && !Array.isArray(payload)) {
      normalized = [payload];
    }
    onUpdate(node.id, {
      ...node.data,
      status,
      output: normalized ?? node.data.output,
      config: {
        ...node.data.config,
        jsonData,
        ...(normalized ? { result: normalized } : {})
      }
    });
  };

  const parseErrorMessage = (err: any) => {
    if (err?.response?.data?.error) return err.response.data.error;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.message) return err.message;
    return 'Unknown error';
  };

  const handleJsonSubmit = async () => {
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(jsonData);
    } catch (e) {
      toast.error('Invalid JSON format');
      updateNodeStatus('failed');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(null);
      const token = localStorage.getItem('workflow_token');
      const res = await axios.post(
        `${API_BASE_URL}/invoices`,
        parsedJson,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          withCredentials: false // set true only if you rely on cookies
        }
      );

      updateNodeStatus('success', res.data);
      toast.success('Invoice data submitted successfully');
    } catch (err) {
      console.error('Error submitting JSON:', err);
      toast.error(parseErrorMessage(err));
      updateNodeStatus('failed');
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);
      // Parse CSV locally and store as array of objects
      if (file && file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/).filter(Boolean);
          const headers = lines[0].split(',');
          const docs = lines.slice(1).map(line => {
            const values = line.split(',');
            const doc: any = {};
            headers.forEach((h, i) => doc[h.trim()] = values[i]?.trim());
            return doc;
          });
          updateNodeStatus('success', docs);
          toast.success(`Uploaded ${docs.length} rows from CSV`);
          setFile(null);
          setIsUploading(false);
          setProgress(null);
        };
        reader.readAsText(file);
        return;
      }
      // Fallback: upload to backend for other file types
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('workflow_token');
      const axiosConfig: any = {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (progressEvent: any) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
          setProgress(pct);
        },
        withCredentials: false // set true only if you rely on cookies
      };
      const res = await axios.post(`${API_BASE_URL}/invoices/upload`, formData, axiosConfig);
      updateNodeStatus('success', res.data);
      toast.success('File uploaded successfully');
      setFile(null);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(parseErrorMessage(err));
      updateNodeStatus('failed');
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <Label>File Upload</Label>
          <Input
            type="file"
            onChange={handleFileChange}
            accept=".json,.csv,.pdf"
            disabled={isUploading}
            className="mt-2"
          />
          {file && (
            <>
              <div className="text-sm mt-2">Selected: {file.name} ({Math.round(file.size/1024)} KB)</div>
              <Button
                onClick={handleFileUpload}
                className="w-full mt-2"
                disabled={isUploading}
              >
                {isUploading ? `Uploading${progress ? ` ${progress}%` : '...'}` : 'Upload File'}
              </Button>
            </>
          )}
        </div>

        <div className="border-t pt-4">
          <Label>JSON Input</Label>
          <Textarea
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            placeholder='{"amount": 1000, "description": "Invoice payment"}'
            className="font-mono mt-2 min-h-[120px]"
            disabled={isUploading}
          />
          <Button
            onClick={handleJsonSubmit}
            className="w-full mt-2"
            disabled={isUploading || !jsonData}
          >
            {isUploading ? 'Submitting...' : 'Submit JSON'}
          </Button>
        </div>

        {node.data.config?.result && (
          <div className="border-t pt-4">
            <Label>Last Result</Label>
            <pre className="bg-muted p-2 rounded-md mt-2 text-sm overflow-auto max-h-[200px]">
              {JSON.stringify(node.data.config.result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};
