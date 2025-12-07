import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Calendar } from "lucide-react";
import { isWithinInterval, format } from "date-fns";
import { de } from "date-fns/locale";

export default function ConflictDetector({ tasks, resources }) {
  const detectConflicts = () => {
    const conflicts = [];
    
    resources.forEach(resource => {
      const resourceTasks = tasks.filter(t => 
        t.assigned_resources?.includes(resource.id) && 
        (t.status === "planned" || t.status === "in_progress")
      );

      // Check for overload (more than 5 tasks)
      if (resourceTasks.length > 5) {
        conflicts.push({
          type: "overload",
          severity: "high",
          resource: resource,
          taskCount: resourceTasks.length,
          message: `${resource.name} ist mit ${resourceTasks.length} Aufgaben überlastet`
        });
      }

      // Check for overlapping tasks
      for (let i = 0; i < resourceTasks.length; i++) {
        for (let j = i + 1; j < resourceTasks.length; j++) {
          const task1 = resourceTasks[i];
          const task2 = resourceTasks[j];
          
          const start1 = new Date(task1.start_date);
          const end1 = new Date(task1.end_date);
          const start2 = new Date(task2.start_date);
          const end2 = new Date(task2.end_date);

          const overlaps = 
            isWithinInterval(start1, { start: start2, end: end2 }) ||
            isWithinInterval(end1, { start: start2, end: end2 }) ||
            isWithinInterval(start2, { start: start1, end: end1 }) ||
            isWithinInterval(end2, { start: start1, end: end1 });

          if (overlaps) {
            conflicts.push({
              type: "overlap",
              severity: "medium",
              resource: resource,
              task1: task1,
              task2: task2,
              message: `${resource.name} hat überschneidende Aufgaben: "${task1.title}" und "${task2.title}"`
            });
          }
        }
      }
    });

    // Check for unavailable resources
    tasks.forEach(task => {
      if (task.status === "planned" || task.status === "in_progress") {
        task.assigned_resources?.forEach(resourceId => {
          const resource = resources.find(r => r.id === resourceId);
          if (resource && resource.status !== "available") {
            conflicts.push({
              type: "unavailable",
              severity: "high",
              resource: resource,
              task: task,
              message: `${resource.name} ist nicht verfügbar (${
                resource.status === "in_use" ? "In Nutzung" : 
                resource.status === "maintenance" ? "Wartung" : 
                "Nicht verfügbar"
              }) für Aufgabe "${task.title}"`
            });
          }
        });
      }
    });

    return conflicts;
  };

  const conflicts = detectConflicts();
  const highSeverity = conflicts.filter(c => c.severity === "high");
  const mediumSeverity = conflicts.filter(c => c.severity === "medium");

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {highSeverity.length > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2 flex items-center gap-2">
              Kritische Konflikte ({highSeverity.length})
            </div>
            <ul className="space-y-2 text-sm">
              {highSeverity.slice(0, 3).map((conflict, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{conflict.message}</span>
                </li>
              ))}
              {highSeverity.length > 3 && (
                <li className="text-red-600 font-medium">
                  + {highSeverity.length - 3} weitere kritische Konflikte
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {mediumSeverity.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="font-semibold mb-2 flex items-center gap-2 text-orange-900">
              Warnungen ({mediumSeverity.length})
            </div>
            <ul className="space-y-2 text-sm text-orange-900">
              {mediumSeverity.slice(0, 2).map((conflict, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{conflict.message}</span>
                </li>
              ))}
              {mediumSeverity.length > 2 && (
                <li className="text-orange-700 font-medium">
                  + {mediumSeverity.length - 2} weitere Warnungen
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}