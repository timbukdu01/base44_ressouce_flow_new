
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addMonths, subMonths, startOfMonth } from "date-fns";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConflictDetector from "../components/planning/ConflictDetector";
import TimelineView from "../components/planning/TimelineView";
import ResourceWorkload from "../components/planning/ResourceWorkload";
import PriorityOptimizer from "../components/planning/PriorityOptimizer";
import GanttChart from "../components/planning/GanttChart";
import ResourceUtilization from "../components/planning/ResourceUtilization";
import RoleManagement from "../components/admin/RoleManagement";
import { Skeleton } from "@/components/ui/skeleton";

export default function Planning() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
    const [activeTab, setActiveTab] = useState("overview");
    const [currentUser, setCurrentUser] = useState(null);

    const { data: tasks, isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => base44.entities.Task.list("-start_date"),
        initialData: [],
    });

    const { data: resources, isLoading: loadingResources } = useQuery({
        queryKey: ['resources'],
        queryFn: () => base44.entities.Resource.list("name"),
        initialData: [],
    });

    React.useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUser(user);
            } catch (error) {
                console.error("Error fetching current user:", error);
            }
        };
        fetchCurrentUser();
    }, []);

    const updateTaskMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    const handleApplyOptimizations = async (changes) => {
        for (const change of changes) {
            await updateTaskMutation.mutateAsync({
                id: change.task.id,
                data: {
                    ...change.task,
                    start_date: change.newDates.start,
                    end_date: change.newDates.end
                }
            });
        }
    };

    // Role-based permissions
    const userRole = currentUser?.role_type || currentUser?.role || "viewer";
    const isProjectManager = userRole === "project_manager";
    const isAdmin = userRole === "admin";

    // Only project managers can use optimization and detect conflicts
    const canOptimize = isProjectManager;
    // Only admins can manage roles
    const canManageRoles = isAdmin;

    const isLoading = loadingTasks || loadingResources;
    const activeTasks = tasks.filter(t => t.status !== "cancelled" && t.status !== "completed");

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Planung</h1>
                        <p className="text-gray-600">Übersicht über Aufgaben und Ressourcenzuordnungen</p>
                    </div>
                    {isProjectManager && (
                        <Button
                            onClick={() => navigate(createPageUrl("Tasks"))}
                            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Neue Aufgabe
                        </Button>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white shadow-sm">
                        <TabsTrigger value="overview">Übersicht</TabsTrigger>
                        <TabsTrigger value="gantt">Gantt-Diagramm</TabsTrigger>
                        <TabsTrigger value="utilization">Auslastung</TabsTrigger>
                        {canOptimize && <TabsTrigger value="optimizer">Optimierung</TabsTrigger>}
                        {canManageRoles && <TabsTrigger value="roles">Rollen</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {!isLoading && canOptimize && (
                            <ConflictDetector tasks={activeTasks} resources={resources} />
                        )}

                        <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-md">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                                className="hover:bg-orange-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>

                            <div className="text-center">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {format(selectedMonth, "MMMM yyyy", { locale: de })}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedMonth(startOfMonth(new Date()))}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Heute
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                                className="hover:bg-orange-50"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="space-y-6">
                                <Skeleton className="h-96 rounded-xl" />
                                <Skeleton className="h-64 rounded-xl" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <TimelineView
                                    tasks={activeTasks}
                                    resources={resources}
                                    selectedMonth={selectedMonth}
                                />

                                <ResourceWorkload
                                    resources={resources}
                                    tasks={activeTasks}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-500">
                                        <h3 className="text-sm font-medium text-gray-600 mb-2">Geplante Aufgaben</h3>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {activeTasks.filter(t => t.status === "planned").length}
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-orange-500">
                                        <h3 className="text-sm font-medium text-gray-600 mb-2">In Bearbeitung</h3>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {activeTasks.filter(t => t.status === "in_progress").length}
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-purple-500">
                                        <h3 className="text-sm font-medium text-gray-600 mb-2">Verfügbare Ressourcen</h3>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {resources.filter(r => r.status === "available").length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="gantt">
                        {isLoading ? (
                            <Skeleton className="h-96 rounded-xl" />
                        ) : (
                            <GanttChart
                                tasks={activeTasks}
                                resources={resources}
                                selectedMonth={selectedMonth}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="utilization">
                        {isLoading ? (
                            <Skeleton className="h-96 rounded-xl" />
                        ) : (
                            <ResourceUtilization
                                resources={resources}
                                tasks={activeTasks}
                            />
                        )}
                    </TabsContent>

                    {canOptimize && (
                        <TabsContent value="optimizer">
                            {isLoading ? (
                                <Skeleton className="h-96 rounded-xl" />
                            ) : (
                                <PriorityOptimizer
                                    tasks={activeTasks}
                                    resources={resources}
                                    onApplyChanges={handleApplyOptimizations}
                                />
                            )}
                        </TabsContent>
                    )}

                    {canManageRoles && (
                        <TabsContent value="roles">
                            <RoleManagement />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
