import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, MapPin, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function QuickActions() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);

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

    const userRole = currentUser?.role_type || currentUser?.role || "viewer";
    const isProjectManager = userRole === "project_manager";
    const isTeamMember = userRole === "team_member";

    // Only project managers can add resources
    const canAddResources = isProjectManager;
    // Project managers and team members can create tasks
    const canCreateTasks = isProjectManager || isTeamMember;

    const actions = [
        { icon: UserPlus, label: "Mitarbeiter hinzufügen", color: "bg-blue-500", type: "employee", permission: canAddResources },
        { icon: MapPin, label: "Raum hinzufügen", color: "bg-green-500", type: "room", permission: canAddResources },
        { icon: Wrench, label: "Gerät hinzufügen", color: "bg-purple-500", type: "equipment", permission: canAddResources },
        { icon: Plus, label: "Aufgabe erstellen", color: "bg-orange-500", type: "task", permission: canCreateTasks },
    ].filter(action => action.permission);

    const handleAction = (type) => {
        if (type === "task") {
            navigate(createPageUrl("Tasks"));
        } else {
            navigate(createPageUrl("Resources") + `?add=${type}`);
        }
    };

    if (actions.length === 0) {
        return null;
    }

    return (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900">Schnellzugriff</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {actions.map((action, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:shadow-md transition-all duration-200 border-gray-200 hover:border-gray-300"
                            onClick={() => handleAction(action.type)}
                        >
                            <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center shadow-sm`}>
                                <action.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}