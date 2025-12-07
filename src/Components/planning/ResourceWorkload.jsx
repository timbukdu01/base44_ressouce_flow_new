
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, MapPin, Wrench, AlertTriangle } from "lucide-react";

const typeIcons = {
    employee: User,
    room: MapPin,
    equipment: Wrench
};

const typeLabels = {
    employee: "Mitarbeiter",
    room: "Raum",
    equipment: "Gerät"
};

export default function ResourceWorkload({ resources, tasks }) {
    const getResourceWorkload = (resource) => {
        const assignedTasks = tasks.filter(t =>
            t.assigned_resources?.includes(resource.id) &&
            (t.status === "planned" || t.status === "in_progress")
        );

        // Calculate total effort in hours
        const totalEffort = assignedTasks.reduce((sum, task) => {
            if (!task.effort) return sum;
            let effort = task.effort;
            // Convert to hours
            if (task.effort_unit === "days") effort *= 8;
            if (task.effort_unit === "weeks") effort *= 40;
            return sum + effort;
        }, 0);

        // Calculate utilization percentage (based on 40h week)
        const weeklyCapacity = 40;
        const utilizationPercent = (totalEffort / weeklyCapacity) * 100;

        return {
            taskCount: assignedTasks.length,
            totalEffortHours: Math.round(totalEffort),
            utilizationPercent: Math.round(Math.min(utilizationPercent, 150)), // Cap at 150% for display
            tasks: assignedTasks
        };
    };

    const resourceWorkloads = resources
        .map(resource => ({
            ...resource,
            workload: getResourceWorkload(resource)
        }))
        .sort((a, b) => b.workload.utilizationPercent - a.workload.utilizationPercent);

    return (
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Ressourcen-Auslastung (Wochenübersicht)
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                    Basierend auf 40 Stunden Wochenarbeitszeit
                </p>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {resourceWorkloads.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Keine Ressourcen vorhanden</p>
                    ) : (
                        resourceWorkloads.map(resource => {
                            const Icon = typeIcons[resource.type];
                            const isOverloaded = resource.workload.utilizationPercent > 100;
                            const isHighLoad = resource.workload.utilizationPercent > 80;

                            return (
                                <div key={resource.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverloaded ? 'bg-red-100' : isHighLoad ? 'bg-orange-100' : 'bg-blue-100'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${isOverloaded ? 'text-red-600' : isHighLoad ? 'text-orange-600' : 'text-blue-600'
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{resource.name}</p>
                                                <p className="text-xs text-gray-500">{typeLabels[resource.type]}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={
                                                isOverloaded ? 'bg-red-50 text-red-700 border-red-200' :
                                                    isHighLoad ? 'bg-orange-50 text-orange-700 border-orange-200' : ''
                                            }>
                                                {resource.workload.taskCount} {resource.workload.taskCount === 1 ? "Aufgabe" : "Aufgaben"}
                                            </Badge>
                                            <Badge variant="outline" className={`${isOverloaded ? 'bg-red-50 text-red-700 border-red-200' :
                                                    isHighLoad ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        'bg-purple-50 text-purple-700 border-purple-200'
                                                }`}>
                                                {resource.workload.totalEffortHours}h / 40h
                                            </Badge>
                                            <Badge variant="outline" className={`font-semibold ${isOverloaded ? 'bg-red-100 text-red-800 border-red-300' :
                                                    isHighLoad ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                        'bg-green-100 text-green-800 border-green-300'
                                                }`}>
                                                {resource.workload.utilizationPercent}%
                                            </Badge>
                                        </div>
                                    </div>
                                    <Progress
                                        value={Math.min(resource.workload.utilizationPercent, 100)}
                                        className={`h-2 ${isOverloaded ? '[&>div]:bg-red-500' : isHighLoad ? '[&>div]:bg-orange-500' : ''}`}
                                    />
                                    {isOverloaded && (
                                        <p className="text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Überlastet: {resource.workload.utilizationPercent}% der Wochenkapazität
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
