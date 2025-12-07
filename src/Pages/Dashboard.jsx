import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, CheckCircle, AlertCircle } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import ResourceDistribution from "../components/dashboard/ResourceDistribution";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
	String testVariable;
  const { data: resources, isLoading: loadingResources } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list("-created_date"),
    initialData: [],
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list("-created_date"),
    initialData: [],
  });

  const availableResources = resources.filter(r => r.status === "available").length;
  const activeTasks = tasks.filter(t => t.status === "in_progress").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  const isLoading = loadingResources || loadingTasks;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Willkommen zurück! Hier ist die Übersicht Ihrer Ressourcen.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Gesamt Ressourcen"
              value={resources.length}
              icon={Users}
              color="bg-blue-500"
              subtitle={`${availableResources} verfügbar`}
              index={0}
            />
            <StatsCard
              title="Verfügbar"
              value={availableResources}
              icon={CheckCircle}
              color="bg-green-500"
              subtitle="Einsatzbereit"
              index={1}
            />
            <StatsCard
              title="Aktive Aufgaben"
              value={activeTasks}
              icon={Briefcase}
              color="bg-orange-500"
              subtitle="In Bearbeitung"
              index={2}
            />
            <StatsCard
              title="Abgeschlossen"
              value={completedTasks}
              icon={AlertCircle}
              color="bg-purple-500"
              subtitle="Erledigte Aufgaben"
              index={3}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <Skeleton className="h-96 rounded-xl" />
            ) : (
              <RecentActivity resources={resources} tasks={tasks} />
            )}
            
            {!isLoading && resources.length > 0 && (
              <ResourceDistribution resources={resources} />
            )}
          </div>

          <div className="space-y-6">
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}