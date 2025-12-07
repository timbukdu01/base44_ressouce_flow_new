import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";
import SmartAssignment from "../components/tasks/SmartAssignment";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AnimatePresence } from "framer-motion";

export default function Tasks() {
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showSmartAssignment, setShowSmartAssignment] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    const queryClient = useQueryClient();

    const { data: tasks, isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => base44.entities.Task.list("-created_date"),
        initialData: [],
    });

    const { data: resources, isLoading: loadingResources } = useQuery({
        queryKey: ['resources'],
        queryFn: () => base44.entities.Resource.list(),
        initialData: [],
    });

    useEffect(() => {
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

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Task.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setShowForm(false);
            setEditingTask(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setShowForm(false);
            setEditingTask(null);
            setShowSmartAssignment(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Task.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    const handleSubmit = (data) => {
        if (editingTask?.id) {
            updateMutation.mutate({ id: editingTask.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        if (confirm("Möchten Sie diese Aufgabe wirklich löschen?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleSmartAssignment = (task) => {
        setShowSmartAssignment(task);
    };

    const handleApplySmartAssignment = (resourceIds) => {
        updateMutation.mutate({
            id: showSmartAssignment.id,
            data: {
                ...showSmartAssignment,
                assigned_resources: resourceIds
            }
        });
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Role-based permissions
    const userRole = currentUser?.role_type || currentUser?.role || "viewer";
    const isProjectManager = userRole === "project_manager";
    const isTeamMember = userRole === "team_member";
    const isAdmin = userRole === "admin";

    // Project managers can do everything with tasks
    // Team members can only create tasks
    // Admin and viewers can only view
    const canCreate = isProjectManager || isTeamMember;
    const canEdit = isProjectManager;
    const canDelete = isProjectManager;
    const canUseSmartAssignment = isProjectManager;

    const isLoading = loadingTasks || loadingResources;

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Aufgaben</h1>
                        <p className="text-gray-600">
                            {canCreate ? "Erstellen und verwalten Sie Ihre Aufgaben" : "Übersicht der Aufgaben"}
                        </p>
                    </div>
                    {canCreate && (
                        <Button
                            onClick={() => {
                                setEditingTask(null);
                                setShowForm(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Neue Aufgabe
                        </Button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            placeholder="Aufgaben durchsuchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white shadow-sm"
                        />
                    </div>

                    <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                        <TabsList className="bg-white shadow-sm">
                            <TabsTrigger value="all">Alle</TabsTrigger>
                            <TabsTrigger value="planned">Geplant</TabsTrigger>
                            <TabsTrigger value="in_progress">In Bearbeitung</TabsTrigger>
                            <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {searchQuery || statusFilter !== "all" ? "Keine Aufgaben gefunden" : "Keine Aufgaben vorhanden"}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery || statusFilter !== "all"
                                ? "Versuchen Sie einen anderen Suchbegriff oder Filter"
                                : canCreate ? "Erstellen Sie Ihre erste Aufgabe" : "Derzeit sind keine Aufgaben verfügbar"}
                        </p>
                        {canCreate && (
                            <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700">
                                <Plus className="w-5 h-5 mr-2" />
                                Aufgabe hinzufügen
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredTasks.map((task, index) => (
                                <div key={task.id} className="relative group">
                                    <TaskCard
                                        task={task}
                                        resources={resources}
                                        onEdit={canEdit ? handleEdit : null}
                                        onDelete={canDelete ? handleDelete : null}
                                        index={index}
                                        readOnly={!canEdit}
                                    />
                                    {canUseSmartAssignment && (!task.assigned_resources || task.assigned_resources.length === 0) &&
                                        task.status === "planned" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border-purple-200 text-purple-700 hover:bg-purple-50"
                                                onClick={() => handleSmartAssignment(task)}
                                            >
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                KI-Zuweisung
                                            </Button>
                                        )}
                                </div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {canCreate && (
                    <Dialog open={showForm} onOpenChange={setShowForm}>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <TaskForm
                                task={editingTask}
                                resources={resources}
                                tasks={tasks}
                                onSubmit={handleSubmit}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingTask(null);
                                }}
                                isLoading={createMutation.isPending || updateMutation.isPending}
                                readOnly={!canEdit && editingTask}
                            />
                        </DialogContent>
                    </Dialog>
                )}

                {canUseSmartAssignment && (
                    <Dialog open={showSmartAssignment !== null} onOpenChange={() => setShowSmartAssignment(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {showSmartAssignment && (
                                <SmartAssignment
                                    task={showSmartAssignment}
                                    resources={resources}
                                    tasks={tasks}
                                    onAssign={handleApplySmartAssignment}
                                    onCancel={() => setShowSmartAssignment(null)}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    );
}