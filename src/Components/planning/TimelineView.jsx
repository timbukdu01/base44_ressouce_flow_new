import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, User, MapPin, Wrench, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const priorityColors = {
    low: "bg-gray-500",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-500"
};

const typeIcons = {
    employee: User,
    room: MapPin,
    equipment: Wrench
};

export default function TimelineView({ tasks, resources, selectedMonth }) {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const getTasksForResource = (resourceId) => {
        return tasks.filter(task =>
            task.assigned_resources?.includes(resourceId) &&
            task.status !== "cancelled"
        );
    };

    const checkResourceConflicts = (resourceId) => {
        const resourceTasks = getTasksForResource(resourceId);
        let hasOverlap = false;

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
                    hasOverlap = true;
                    break;
                }
            }
            if (hasOverlap) break;
        }

        return {
            taskCount: resourceTasks.length,
            hasOverlap,
            isOverloaded: resourceTasks.length > 5
        };
    };

    const getTaskPosition = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const taskStart = start < monthStart ? monthStart : start;
        const taskEnd = end > monthEnd ? monthEnd : end;

        const daysFromStart = differenceInDays(taskStart, monthStart);
        const duration = differenceInDays(taskEnd, taskStart) + 1;
        const totalDays = differenceInDays(monthEnd, monthStart) + 1;

        const left = (daysFromStart / totalDays) * 100;
        const width = (duration / totalDays) * 100;

        return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
    };

    const isTaskInMonth = (task) => {
        const start = new Date(task.start_date);
        const end = new Date(task.end_date);
        return isWithinInterval(monthStart, { start, end }) ||
            isWithinInterval(monthEnd, { start, end }) ||
            (start <= monthStart && end >= monthEnd);
    };

    const resourcesWithTasks = resources.filter(r => getTasksForResource(r.id).length > 0);
    const totalConflicts = resourcesWithTasks.filter(r => {
        const conflicts = checkResourceConflicts(r.id);
        return conflicts.hasOverlap || conflicts.isOverloaded;
    }).length;

    return (
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Timeline: {format(selectedMonth, "MMMM yyyy", { locale: de })}
                    </CardTitle>
                    {totalConflicts > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {totalConflicts} {totalConflicts === 1 ? "Konflikt" : "Konflikte"}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {resourcesWithTasks.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Keine Aufgabenzuordnungen für diesen Monat</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {resourcesWithTasks.map(resource => {
                            const Icon = typeIcons[resource.type];
                            const resourceTasks = getTasksForResource(resource.id).filter(isTaskInMonth);
                            const conflicts = checkResourceConflicts(resource.id);
                            const hasConflict = conflicts.hasOverlap || conflicts.isOverloaded;

                            return (
                                <div key={resource.id} className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${hasConflict ? "bg-gradient-to-br from-red-400 to-red-600" : "bg-gradient-to-br from-blue-400 to-blue-600"
                                            }`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900">{resource.name}</p>
                                                {hasConflict && (
                                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-500">
                                                    {resource.type === "employee" ? "Mitarbeiter" : resource.type === "room" ? "Raum" : "Gerät"}
                                                </p>
                                                {conflicts.isOverloaded && (
                                                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                                        Überlastet
                                                    </Badge>
                                                )}
                                                {conflicts.hasOverlap && (
                                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                                        Überschneidung
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {resourceTasks.length} {resourceTasks.length === 1 ? "Aufgabe" : "Aufgaben"}
                                        </Badge>
                                    </div>

                                    <div className="relative h-12 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                        {resourceTasks.map(task => {
                                            const position = getTaskPosition(task.start_date, task.end_date);
                                            const priorityColor = priorityColors[task.priority] || priorityColors.medium;

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`absolute top-1 bottom-1 ${priorityColor} rounded opacity-90 hover:opacity-100 transition-all cursor-pointer group ${hasConflict ? "ring-2 ring-red-400" : ""
                                                        }`}
                                                    style={position}
                                                    title={`${task.title} (${format(new Date(task.start_date), "dd.MM")} - ${format(new Date(task.end_date), "dd.MM")})`}
                                                >
                                                    <div className="px-2 py-1 text-white text-xs font-medium truncate h-full flex items-center">
                                                        {task.title}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {hasConflict && (
                                        <Alert variant="destructive" className="mt-2 bg-red-50 border-red-200">
                                            <AlertDescription className="text-xs text-red-900">
                                                {conflicts.isOverloaded && `Diese Ressource ist mit ${conflicts.taskCount} Aufgaben überlastet. `}
                                                {conflicts.hasOverlap && "Es gibt zeitliche Überschneidungen zwischen den Aufgaben."}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}