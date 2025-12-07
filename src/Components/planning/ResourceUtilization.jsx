
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { User, MapPin, Wrench, TrendingUp, AlertTriangle, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    eachDayOfInterval, isWithinInterval, format, addMonths, subMonths
} from "date-fns";
import { de } from "date-fns/locale";

const typeIcons = {
    employee: User,
    room: MapPin,
    equipment: Wrench
};

export default function ResourceUtilization({ resources, tasks }) {
    const [timeRange, setTimeRange] = useState("month");
    const [selectedResource, setSelectedResource] = useState("all");
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const getTimeRangeInterval = () => {
        switch (timeRange) {
            case "week":
                return { start: startOfWeek(selectedMonth, { locale: de }), end: endOfWeek(selectedMonth, { locale: de }) };
            case "month":
                return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) };
            case "quarter":
                const quarterStart = startOfMonth(subMonths(selectedMonth, selectedMonth.getMonth() % 3));
                return { start: quarterStart, end: endOfMonth(addMonths(quarterStart, 2)) };
            default:
                return { start: selectedMonth, end: selectedMonth };
        }
    };

    const interval = getTimeRangeInterval();

    const calculateUtilization = (resource) => {
        const resourceTasks = tasks.filter(t =>
            t.assigned_resources?.includes(resource.id) &&
            (t.status === "planned" || t.status === "in_progress")
        );

        const tasksInRange = resourceTasks.filter(t => {
            if (!t.start_date || !t.end_date) return false;
            const taskStart = new Date(t.start_date);
            const taskEnd = new Date(t.end_date);
            return isWithinInterval(interval.start, { start: taskStart, end: taskEnd }) ||
                isWithinInterval(interval.end, { start: taskStart, end: taskEnd }) ||
                (taskStart <= interval.start && taskEnd >= interval.end);
        });

        // Calculate total effort in hours
        const totalEffort = tasksInRange.reduce((sum, task) => {
            if (!task.effort) return sum;
            let effort = task.effort;
            // Convert to hours
            if (task.effort_unit === "days") effort *= 8;
            if (task.effort_unit === "weeks") effort *= 40;
            return sum + effort;
        }, 0);

        // Calculate capacity based on time range
        let capacity;
        switch (timeRange) {
            case "week":
                capacity = 40; // 40 hours per week
                break;
            case "month":
                capacity = 160; // 160 hours per month (4 weeks)
                break;
            case "quarter":
                capacity = 480; // 480 hours per quarter (12 weeks)
                break;
            default:
                capacity = 160;
        }

        const utilizationPercent = capacity > 0 ? Math.min((totalEffort / capacity) * 100, 100) : 0;

        // Calculate high priority tasks
        const highPriorityTasks = tasksInRange.filter(t => t.priority === "high" || t.priority === "urgent");

        return {
            taskCount: tasksInRange.length,
            totalEffortHours: Math.round(totalEffort),
            capacity: capacity,
            utilizationPercent: Math.round(utilizationPercent),
            highPriorityCount: highPriorityTasks.length,
            availableHours: Math.max(0, capacity - totalEffort),
            status: utilizationPercent > 90 ? "overloaded" :
                utilizationPercent > 70 ? "busy" :
                    utilizationPercent > 40 ? "moderate" : "light"
        };
    };

    const resourcesData = resources.map(resource => ({
        ...resource,
        utilization: calculateUtilization(resource)
    })).sort((a, b) => b.utilization.utilizationPercent - a.utilization.utilizationPercent);

    const chartData = resourcesData.slice(0, 10).map(r => ({
        name: r.name.length > 15 ? r.name.substring(0, 15) + "..." : r.name,
        auslastung: r.utilization.utilizationPercent,
        verfügbar: Math.round((100 - r.utilization.utilizationPercent)),
        aufgaben: r.utilization.taskCount
    }));

    const filteredResources = selectedResource === "all"
        ? resourcesData
        : resourcesData.filter(r => r.id === selectedResource);

    const statusColors = {
        overloaded: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", label: "Überlastet", progressColor: "bg-red-500" },
        busy: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "Stark ausgelastet", progressColor: "bg-orange-500" },
        moderate: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", label: "Normal", progressColor: "bg-blue-500" },
        light: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", label: "Gering", progressColor: "bg-green-500" }
    };

    // Calculate statistics
    const totalResources = filteredResources.length;
    const overloadedCount = filteredResources.filter(r => r.utilization.status === "overloaded").length;
    const underutilizedCount = filteredResources.filter(r => r.utilization.utilizationPercent < 40).length;
    const avgUtilization = totalResources > 0
        ? Math.round(filteredResources.reduce((sum, r) => sum + r.utilization.utilizationPercent, 0) / totalResources)
        : 0;

    const exportData = () => {
        const csvContent = [
            ["Ressource", "Typ", "Auslastung (%)", "Aufgaben", "Aufwand (h)", "Kapazität (h)", "Verfügbar (h)", "Status"],
            ...filteredResources.map(r => [
                r.name,
                r.type === "employee" ? "Mitarbeiter" : r.type === "room" ? "Raum" : "Gerät",
                r.utilization.utilizationPercent,
                r.utilization.taskCount,
                r.utilization.totalEffortHours,
                r.utilization.capacity,
                r.utilization.availableHours,
                statusColors[r.utilization.status].label
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `auslastung_${format(selectedMonth, "yyyy-MM")}.csv`;
        link.click();
    };

    return (
        <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Ressourcen-Auslastung
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            Zeitraum: {format(interval.start, "dd.MM.yyyy", { locale: de })} - {format(interval.end, "dd.MM.yyyy", { locale: de })}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Diese Woche</SelectItem>
                                <SelectItem value="month">Dieser Monat</SelectItem>
                                <SelectItem value="quarter">Dieses Quartal</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedResource} onValueChange={setSelectedResource}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Alle Ressourcen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Ressourcen</SelectItem>
                                {resourcesData.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={exportData}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium mb-1">Durchschnitt</p>
                        <p className="text-2xl font-bold text-blue-900">{avgUtilization}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                        <p className="text-xs text-red-700 font-medium mb-1">Überlastet</p>
                        <p className="text-2xl font-bold text-red-900">{overloadedCount}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <p className="text-xs text-green-700 font-medium mb-1">Unterausgelastet</p>
                        <p className="text-2xl font-bold text-green-900">{underutilizedCount}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <p className="text-xs text-purple-700 font-medium mb-1">Gesamt</p>
                        <p className="text-2xl font-bold text-purple-900">{totalResources}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">Auslastungs-Übersicht</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis label={{ value: 'Auslastung (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="auslastung" fill="#3B82F6" name="Ausgelastet (%)" />
                            <Bar dataKey="verfügbar" fill="#10B981" name="Verfügbar (%)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Engpass-Warnungen */}
                {overloadedCount > 0 && (
                    <div className="mb-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red-900">Engpässe erkannt</p>
                                    <p className="text-sm text-red-700 mt-1">
                                        {overloadedCount} {overloadedCount === 1 ? "Ressource ist" : "Ressourcen sind"} überlastet.
                                        Erwägen Sie, Aufgaben umzuverteilen oder zusätzliche Ressourcen einzuplanen.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detailed List */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Detaillierte Ansicht</h3>
                    {filteredResources.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Keine Ressourcen gefunden</p>
                    ) : (
                        filteredResources.map(resource => {
                            const Icon = typeIcons[resource.type];
                            const statusColor = statusColors[resource.utilization.status];

                            return (
                                <div key={resource.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${statusColor.bg}`}>
                                                <Icon className={`w-6 h-6 ${statusColor.text}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">{resource.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {resource.type === "employee" ? "Mitarbeiter" :
                                                        resource.type === "room" ? "Raum" : "Gerät"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge className={`${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                                {statusColor.label}
                                            </Badge>
                                            {resource.utilization.highPriorityCount > 0 && (
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                                    {resource.utilization.highPriorityCount} Prio
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Auslastung</span>
                                            <span className="font-semibold">{resource.utilization.utilizationPercent}%</span>
                                        </div>
                                        <Progress
                                            value={resource.utilization.utilizationPercent}
                                            className={`h-3`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Aufgaben</p>
                                            <p className="font-semibold text-gray-900">{resource.utilization.taskCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Aufwand</p>
                                            <p className="font-semibold text-gray-900">{resource.utilization.totalEffortHours}h</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Kapazität</p>
                                            <p className="font-semibold text-gray-900">{resource.utilization.capacity}h</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Verfügbar</p>
                                            <p className="font-semibold text-gray-900">{Math.round(resource.utilization.availableHours)}h</p>
                                        </div>
                                    </div>

                                    {resource.utilization.status === "overloaded" && (
                                        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2">
                                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-red-700">
                                                Diese Ressource ist überlastet. Erwägen Sie, Aufgaben umzuverteilen oder den Zeitplan anzupassen.
                                            </p>
                                        </div>
                                    )}

                                    {resource.utilization.status === "light" && resource.utilization.taskCount === 0 && (
                                        <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded p-2">
                                            <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700">
                                                Diese Ressource hat freie Kapazitäten und kann für weitere Aufgaben eingeplant werden.
                                            </p>
                                        </div>
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
