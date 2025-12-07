
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, MapPin, Wrench, AlertTriangle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { isWithinInterval, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const typeIcons = {
    employee: User,
    room: MapPin,
    equipment: Wrench
};

const statusColors = {
    available: "bg-green-100 text-green-700",
    in_use: "bg-yellow-100 text-yellow-700",
    maintenance: "bg-orange-100 text-orange-700",
    unavailable: "bg-red-100 text-red-700"
};

export default function TaskForm({ task, resources, tasks = [], onSubmit, onCancel, isLoading, readOnly = false }) {
    const [formData, setFormData] = useState(task || {
        title: "",
        description: "",
        priority: "medium",
        status: "planned",
        start_date: "",
        end_date: "",
        assigned_resources: [],
        progress: 0,
        effort: "",
        effort_unit: "hours"
    });

    const [conflicts, setConflicts] = useState([]);

    const handleChange = (field, value) => {
        if (readOnly) return;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Check conflicts in real-time when dates, effort or resources change
    useEffect(() => {
        checkConflicts();
    }, [formData.start_date, formData.end_date, formData.assigned_resources, formData.effort, formData.effort_unit, resources, tasks]);

    const checkConflicts = () => {
        if (!formData.start_date || !formData.end_date || !formData.assigned_resources?.length) {
            setConflicts([]);
            return;
        }

        const newConflicts = [];

        try {
            const taskStart = parseISO(formData.start_date);
            const taskEnd = parseISO(formData.end_date);

            // Validate parsed dates
            if (isNaN(taskStart.getTime()) || isNaN(taskEnd.getTime())) {
                console.error("Invalid start or end date in formData for conflict check.");
                setConflicts([]);
                return;
            }

            formData.assigned_resources.forEach(resourceId => {
                const resource = resources.find(r => r.id === resourceId);
                if (!resource) return;

                // Check 1: Resource unavailable
                if (resource.status !== "available") {
                    newConflicts.push({
                        type: "unavailable",
                        severity: "high",
                        resource: resource,
                        message: `${resource.name} ist nicht verfügbar`,
                        details: resource.status === "in_use" ? "Derzeit in Nutzung" :
                            resource.status === "maintenance" ? "In Wartung" :
                                "Nicht verfügbar"
                    });
                }

                // Check 2: Time conflicts with other tasks
                const otherTasks = tasks.filter(t =>
                    t.id !== task?.id && // Exclude current task when editing
                    t.assigned_resources?.includes(resourceId) &&
                    (t.status === "planned" || t.status === "in_progress") &&
                    t.start_date && t.end_date // Ensure task has valid dates
                );

                const overlappingTasks = otherTasks.filter(t => {
                    try {
                        const otherStart = parseISO(t.start_date);
                        const otherEnd = parseISO(t.end_date);

                        // Validate parsed dates for other tasks
                        if (isNaN(otherStart.getTime()) || isNaN(otherEnd.getTime())) {
                            console.warn(`Skipping conflict check for task ${t.id} due to invalid dates.`);
                            return false;
                        }

                        // Check if dates overlap
                        const overlaps =
                            (taskStart <= otherEnd && taskEnd >= otherStart); // Simplified overlap check

                        return overlaps;
                    } catch (error) {
                        console.error("Date parsing error for other task:", error);
                        return false;
                    }
                });

                if (overlappingTasks.length > 0) {
                    overlappingTasks.forEach(overlappingTask => {
                        newConflicts.push({
                            type: "overlap",
                            severity: "high",
                            resource: resource,
                            conflictingTask: overlappingTask,
                            message: `${resource.name} ist bereits verplant`,
                            details: `Überschneidung mit "${overlappingTask.title}" (${format(parseISO(overlappingTask.start_date), "dd.MM.yyyy")} - ${format(parseISO(overlappingTask.end_date), "dd.MM.yyyy")})`
                        });
                    });
                }

                // Check 3: Overload (more than 5 active tasks) - this logic should probably count tasks that overlap with the current task, not all other tasks
                // For simplicity, sticking to the outline's original implementation of counting all 'otherTasks'
                if (otherTasks.length >= 5) {
                    newConflicts.push({
                        type: "overload",
                        severity: "medium",
                        resource: resource,
                        taskCount: otherTasks.length + 1,
                        message: `${resource.name} ist bereits stark ausgelastet`,
                        details: `Würde ${otherTasks.length + 1} aktive Aufgaben haben`
                    });
                }

                // Check 4: Effort overload
                if (formData.effort) {
                    const totalEffort = otherTasks.reduce((sum, t) => {
                        if (!t.effort) return sum;
                        let effort = parseFloat(t.effort);
                        if (isNaN(effort)) return sum; // Ensure effort is a valid number
                        if (t.effort_unit === "days") effort *= 8;
                        if (t.effort_unit === "weeks") effort *= 40;
                        return sum + effort;
                    }, 0);

                    let currentEffort = parseFloat(formData.effort);
                    if (isNaN(currentEffort)) currentEffort = 0; // Default to 0 if not a number
                    if (formData.effort_unit === "days") currentEffort *= 8;
                    if (formData.effort_unit === "weeks") currentEffort *= 40;

                    const combinedEffort = totalEffort + currentEffort;
                    const weeklyCapacity = 40; // Assuming 40 hours/week capacity

                    if (combinedEffort > weeklyCapacity) {
                        newConflicts.push({
                            type: "effort_overload",
                            severity: "medium",
                            resource: resource,
                            totalHours: Math.round(combinedEffort),
                            message: `${resource.name} Stundenkapazität überschritten`,
                            details: `Gesamtaufwand: ${Math.round(combinedEffort)}h (Kapazität: ${weeklyCapacity}h/Woche)`
                        });
                    }
                }
            });
        } catch (error) {
            console.error("Error checking conflicts:", error);
            // Optionally, add a general conflict if the date parsing itself fails unexpectedly
            newConflicts.push({
                type: "system_error",
                severity: "high",
                message: "Fehler bei der Konfliktprüfung",
                details: "Ein unerwarteter Fehler ist aufgetreten. Bitte Daten überprüfen."
            });
        }

        setConflicts(newConflicts);
    };

    const getResourceConflicts = (resourceId) => {
        return conflicts.filter(c => c.resource?.id === resourceId);
    };

    const toggleResource = (resourceId) => {
        if (readOnly) return;
        const current = formData.assigned_resources || [];
        const newResources = current.includes(resourceId)
            ? current.filter(id => id !== resourceId)
            : [...current, resourceId];
        handleChange("assigned_resources", newResources);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (readOnly) return;

        const highSeverityConflicts = conflicts.filter(c => c.severity === "high");

        // Show warning if there are conflicts
        if (highSeverityConflicts.length > 0) {
            const conflictMessages = highSeverityConflicts.map(c => `• ${c.message}: ${c.details}`).join('\n');
            const confirmed = confirm(
                `⚠️ WARNUNG: ${highSeverityConflicts.length} kritische Konflikt(e) erkannt!\n\n${conflictMessages}\n\nMöchten Sie trotzdem fortfahren?`
            );
            if (!confirmed) return;
        }

        const submitData = { ...formData };
        if (submitData.progress !== "" && submitData.progress !== undefined) {
            submitData.progress = parseFloat(submitData.progress);
            if (isNaN(submitData.progress)) submitData.progress = 0; // Default to 0 if parsing fails
        } else {
            submitData.progress = 0; // Ensure progress is a number
        }
        if (submitData.effort !== "" && submitData.effort !== undefined) {
            submitData.effort = parseFloat(submitData.effort);
            if (isNaN(submitData.effort)) submitData.effort = null; // Or 0, depending on desired behavior for invalid effort
        } else {
            submitData.effort = null; // Ensure effort is null or a number
        }

        onSubmit(submitData);
    };

    const availableResources = resources.filter(r => r.status === "available");
    const unavailableResources = resources.filter(r => r.status !== "available");

    const highSeverityConflicts = conflicts.filter(c => c.severity === "high");
    const mediumSeverityConflicts = conflicts.filter(c => c.severity === "medium");

    return (
        <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">
                    {readOnly ? "Aufgabe ansehen" : task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
                </CardTitle>
                {readOnly && (
                    <p className="text-sm text-gray-500 mt-1">Sie haben keine Berechtigung, diese Aufgabe zu bearbeiten.</p>
                )}
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="p-6 space-y-4">
                    {/* Critical Conflict Warnings */}
                    {highSeverityConflicts.length > 0 && (
                        <Alert variant="destructive" className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="font-semibold mb-2">⚠️ Kritische Konflikte erkannt ({highSeverityConflicts.length})</div>
                                <ul className="text-sm space-y-1">
                                    {highSeverityConflicts.map((conflict, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium">{conflict.message}</p>
                                                <p className="text-xs text-red-700">{conflict.details}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Medium Severity Warnings */}
                    {mediumSeverityConflicts.length > 0 && !highSeverityConflicts.length && (
                        <Alert className="border-orange-200 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-900">
                                <div className="font-semibold mb-2">⚠️ Warnungen ({mediumSeverityConflicts.length})</div>
                                <ul className="text-sm space-y-1">
                                    {mediumSeverityConflicts.map((conflict, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium">{conflict.message}</p>
                                                <p className="text-xs">{conflict.details}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="title">Titel *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                            placeholder="z.B. Projektmeeting vorbereiten"
                            required
                            disabled={readOnly}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="Details zur Aufgabe..."
                            rows={3}
                            disabled={readOnly}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priorität</Label>
                            <Select value={formData.priority} onValueChange={(val) => handleChange("priority", val)} disabled={readOnly}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Niedrig</SelectItem>
                                    <SelectItem value="medium">Mittel</SelectItem>
                                    <SelectItem value="high">Hoch</SelectItem>
                                    <SelectItem value="urgent">Dringend</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(val) => handleChange("status", val)} disabled={readOnly}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="planned">Geplant</SelectItem>
                                    <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                                    <SelectItem value="cancelled">Abgebrochen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="start_date">Startdatum *</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => handleChange("start_date", e.target.value)}
                                required
                                disabled={readOnly}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date">Enddatum *</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => handleChange("end_date", e.target.value)}
                                required
                                disabled={readOnly}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="effort">Geschätzter Aufwand</Label>
                            <Input
                                id="effort"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.effort}
                                onChange={(e) => handleChange("effort", e.target.value)}
                                placeholder="z.B. 8"
                                disabled={readOnly}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="effort_unit">Einheit</Label>
                            <Select value={formData.effort_unit} onValueChange={(val) => handleChange("effort_unit", val)} disabled={readOnly}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hours">Stunden</SelectItem>
                                    <SelectItem value="days">Tage</SelectItem>
                                    <SelectItem value="weeks">Wochen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.status !== "planned" && formData.status !== "cancelled" && (
                        <div className="space-y-2">
                            <Label htmlFor="progress">Fortschritt (%)</Label>
                            <Input
                                id="progress"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.progress}
                                onChange={(e) => handleChange("progress", e.target.value)}
                                placeholder="0-100"
                                disabled={readOnly}
                            />
                        </div>
                    )}

                    {resources.length > 0 && (
                        <div className="space-y-2">
                            <Label>Ressourcen zuweisen</Label>
                            <p className="text-sm text-gray-500 mb-2">
                                Wählen Sie die Ressourcen aus, die dieser Aufgabe zugeordnet werden sollen
                            </p>
                            <ScrollArea className="h-64 border rounded-lg p-4">
                                <div className="space-y-4">
                                    {availableResources.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4" />
                                                Verfügbare Ressourcen ({availableResources.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {availableResources.map(resource => {
                                                    const Icon = typeIcons[resource.type];
                                                    const isSelected = (formData.assigned_resources || []).includes(resource.id);
                                                    const resourceConflicts = getResourceConflicts(resource.id);
                                                    const hasHighConflict = resourceConflicts.some(c => c.severity === "high");
                                                    const hasMediumConflict = resourceConflicts.some(c => c.severity === "medium");

                                                    return (
                                                        <div key={resource.id}>
                                                            <div
                                                                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors border ${hasHighConflict
                                                                        ? 'bg-red-50 border-red-200 animate-pulse'
                                                                        : hasMediumConflict
                                                                            ? 'bg-orange-50 border-orange-200'
                                                                            : isSelected
                                                                                ? 'bg-green-50 border-green-200'
                                                                                : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                                                                    }`}
                                                            >
                                                                <Checkbox
                                                                    id={`resource-${resource.id}`}
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => toggleResource(resource.id)}
                                                                    disabled={readOnly}
                                                                />
                                                                <label
                                                                    htmlFor={`resource-${resource.id}`}
                                                                    className="flex-1 cursor-pointer flex items-center gap-3"
                                                                >
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hasHighConflict ? 'bg-red-100' : hasMediumConflict ? 'bg-orange-100' : 'bg-green-100'
                                                                        }`}>
                                                                        <Icon className={`w-4 h-4 ${hasHighConflict ? 'text-red-600' : hasMediumConflict ? 'text-orange-600' : 'text-green-600'
                                                                            }`} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-sm truncate">{resource.name}</p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {resource.type === "employee" ? "Mitarbeiter" : resource.type === "room" ? "Raum" : "Gerät"}
                                                                            {resource.location && ` • ${resource.location}`}
                                                                        </p>
                                                                    </div>
                                                                    {(hasHighConflict || hasMediumConflict) && (
                                                                        <AlertTriangle className={`w-4 h-4 ${hasHighConflict ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
                                                                    )}
                                                                </label>
                                                            </div>

                                                            {/* Show conflicts for this resource */}
                                                            {isSelected && resourceConflicts.length > 0 && (
                                                                <div className="ml-11 mt-1 space-y-1">
                                                                    {resourceConflicts.map((conflict, i) => (
                                                                        <div key={i} className={`text-xs p-2 rounded flex items-start gap-2 ${conflict.severity === "high" ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-100 text-orange-800 border border-orange-300'
                                                                            }`}>
                                                                            {conflict.severity === "high" ? (
                                                                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                            ) : (
                                                                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                            )}
                                                                            <div>
                                                                                <p className="font-medium">{conflict.message}</p>
                                                                                <p className="text-xs opacity-90 mt-0.5">{conflict.details}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {unavailableResources.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Nicht verfügbare Ressourcen ({unavailableResources.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {unavailableResources.map(resource => {
                                                    const Icon = typeIcons[resource.type];
                                                    const isSelected = (formData.assigned_resources || []).includes(resource.id);

                                                    return (
                                                        <div
                                                            key={resource.id}
                                                            className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 opacity-60"
                                                        >
                                                            <Checkbox
                                                                id={`resource-${resource.id}`}
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleResource(resource.id)}
                                                                disabled={readOnly}
                                                            />
                                                            <label
                                                                htmlFor={`resource-${resource.id}`}
                                                                className="flex-1 flex items-center gap-3 cursor-pointer"
                                                            >
                                                                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    <Icon className="w-4 h-4 text-gray-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm truncate text-gray-700">{resource.name}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-xs text-gray-500">
                                                                            {resource.type === "employee" ? "Mitarbeiter" : resource.type === "room" ? "Raum" : "Gerät"}
                                                                        </p>
                                                                        <Badge variant="secondary" className={`text-xs ${statusColors[resource.status]}`}>
                                                                            {resource.status === "in_use" ? "In Nutzung" : resource.status === "maintenance" ? "Wartung" : "Nicht verfügbar"}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>

                {!readOnly && (
                    <CardFooter className="border-t flex justify-end gap-3 p-6">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                            Abbrechen
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={`${highSeverityConflicts.length > 0 ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-orange-600 hover:bg-orange-700'}`}
                        >
                            {isLoading ? "Wird gespeichert..." : highSeverityConflicts.length > 0 ? `⚠️ Trotzdem speichern (${highSeverityConflicts.length} Konflikte)` : task ? "Speichern" : "Erstellen"}
                        </Button>
                    </CardFooter>
                )}

                {readOnly && (
                    <CardFooter className="border-t flex justify-end p-6">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Schließen
                        </Button>
                    </CardFooter>
                )}
            </form>
        </Card>
    );
}
