import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { listProjects } from "./services/api";
import { ProjectListPage } from "./pages/ProjectListPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import type { Project } from "./types";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);

  async function refresh() {
    try {
      const list = await listProjects();
      setProjects(list);
    } catch {
      /* backend might be starting up */
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<ProjectListPage projects={projects} onRefresh={refresh} />}
        />
        <Route
          path="/projects/:projectId"
          element={<WorkspacePage projects={projects} onRefresh={refresh} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
