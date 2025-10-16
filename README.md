# 🧠 Workflow Automation Builder

A **no-code workflow automation platform** built with **React + TypeScript**, enabling users to design, run, and visualize custom business workflows — all directly from the browser.

Workflows are built from modular **nodes** like **Input**, **Rule**, **Approval**, and **Export**, and can be executed locally without backend dependencies. Each run is tracked and viewable in a detailed execution log.

---

## 🚀 Features

### 🔹 Visual Workflow Creation
- Add workflow nodes dynamically (Input, Rule, Approval, Export)
- Configure rules, conditions, and assignments directly from the UI
- View live JSON representation of your workflow

### 🔹 Local Execution Engine
- Built-in engine to **execute workflows in bulk** on client-side data
- Supports branching logic (`trueNext` / `falseNext`) for conditional flows
- Approvals automatically assign tasks based on defined rules

### 🔹 Run Management & History
- View all workflow runs with detailed logs for each node
- Branch outputs (`true` / `false`) and assignee lists are shown clearly
- Download results in CSV format
- Click any past run to **reopen it in the canvas**

### 🔹 Save, Publish & Reload
- Save workflows to local storage or backend (via API)
- Reopen saved workflows in the builder
- Publish finalized workflows for execution

---

## 🧩 Node Types

| Node Type | Purpose | Example Config |
|------------|----------|----------------|
| **Input** | Entry point with dataset | Upload invoice JSON, CSV, etc. |
| **Rule** | Conditional branching | `vendor !== "Vendor B" → card_2 (true), card_3 (false)` |
| **Approval** | Assign approvers or mark decisions | `amount > 2000 → assignee: "Manager"` |
| **Export** | Output final processed data | `format: csv, destination: download` |

---

## ⚙️ Tech Stack

| Layer | Tools Used |
|-------|-------------|
| **Frontend** | React, TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui, Lucide Icons |
| **State Management** | React Hooks + Local Storage |
| **Notifications** | Sonner Toasts |
| **Data Export** | CSV serialization utility |
| **APIs (optional)** | Appwrite / Custom Backend endpoints for workflow CRUD |

---

## 🧠 Core Architecture

### 🧩 `WorkflowBuilder.tsx`
- The main interactive canvas for creating and configuring workflow nodes.
- Contains an internal **workflow runner** (`runLocalWorkflowBulk`) to simulate logic without backend dependency.
- Supports:
  - Sequential execution for simple flows
  - Conditional branching (`trueNext` / `falseNext`)
  - Approval routing and exports
- Stores all workflows and run history in `localStorage`.

### 📊 `RunViewer.tsx`
- Displays execution logs of previous workflow runs.
- Shows detailed node-level results (`true` / `false` branches, assignees, exports).
- Allows reopening past workflows directly into the builder using **“Open in Canvas”**.

### ⚡ `run.service.js` (Backend)
- Handles actual workflow runs when connected to backend DB (MongoDB).
- Saves run metadata, CSV outputs, and step history to the database.

### 🔍 `executeWorkflow.ts` (Backend Utility)
- Core engine used by backend to interpret node types, evaluate conditions, and traverse workflow graph.
- Supports nested branch execution recursively.

---

## 🧪 Example Workflow JSON

```json
{
  "name": "Invoice Approval Workflow",
  "cards": [
    {
      "id": "card_0",
      "type": "input",
      "config": {
        "result": [
          { "invoice_id": "INV001", "vendor": "Vendor A", "amount": 1500 },
          { "invoice_id": "INV002", "vendor": "Vendor B", "amount": 2500 }
        ]
      }
    },
    {
      "id": "card_1",
      "type": "rule",
      "config": {
        "rules": [
          {
            "field": "vendor",
            "operator": "!==",
            "value": "Vendor B",
            "trueNext": "card_2",
            "falseNext": "card_3"
          }
        ]
      }
    },
    {
      "id": "card_2",
      "type": "approval",
      "config": {
        "rules": [
          { "field": "amount", "operator": ">", "value": "1000", "assignee": "Manager A" }
        ]
      }
    },
    {
      "id": "card_3",
      "type": "approval",
      "config": {
        "rules": [
          { "field": "amount", "operator": ">", "value": "2000", "assignee": "Manager B" }
        ]
      }
    },
    {
      "id": "card_4",
      "type": "export",
      "config": { "format": "csv", "destination": "download" }
    }
  ]
}
```

🧠 2. Setup Backend (Node.js + Express)
```
cd backend
npm install
```
Configure environment

Create a .env file inside /backend and add the following variables:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/workflow_builder
```
```
Run the backend server
npm run dev
```

Your backend will now be running at 👉 http://localhost:5000

🎨 3. Setup Frontend (React + TypeScript)
```
cd ../react-github-canvas
npm install
```
Configure API Endpoint

If your frontend needs to communicate with the backend, create a .env file inside /react-github-canvas:

VITE_BACKEND_URL=http://localhost:5000
```
Run the frontend
npm run dev
```


The project will start on http://localhost:PORT (Vite default).
    
## 📜 How to Use
Add Nodes: Use the left toolbar to add Input, Rule, Approval, and Export nodes.

Upload Data: Upload JSON/CSV inside the Input node.

Set Logic: Configure rules in the Rule node (set field, operator, value, trueNext, and falseNext).

Run Workflow: Click Run — your data will flow through all nodes.

Check Results: See output under “Workflow Results” or download as CSV.

View History: Check RunViewer for detailed execution logs.


## 🧠 Future Enhancements
✅ Real-time backend integration with MongoDB

✅ Role-based access and multi-user approvals

⏳ Visual drag-and-drop canvas with connections

⏳ Workflow versioning & rollback

⏳ Integration with external APIs (webhooks, emails, Slack, etc.)

## 👨‍💻 Author
Rishi Agarwal

## 🪪 License
This project is licensed under the MIT License — feel free to use, modify, and share it.

