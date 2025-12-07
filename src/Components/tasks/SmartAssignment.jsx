import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, User, MapPin, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import { differenceInDays, isWithinInterval } from "date-fns";

const typeIcons = {
    employee: User,
    room: MapPin,
    equipment: Wrench
};

export default function SmartAssignment({ task, resources, tasks, onAssign, onCancel }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recommendations, setRecommendations] = useState(null);
    const [selectedResources, setSelectedResources] = useState([]);

    const analyzeResources = async () => {
        setIsAnalyzing(true);

        try {
            // Filter available resources
            const availableResources = resources.filter(r => r.status === "available");

            // Check for conflicts
            const resourceConflicts = availableResources.map(resource => {
                const resourceTasks = tasks.filter(t =>
                    t.assigned_resources?.includes(resource.id) &&
                    t.id !== task.id &&
                    (t.status === "planned" || t.status === "in_progress")
                );

                // Check for overlapping tasks
                const hasConflict = resourceTasks.some(t => {
                    const taskStart = new Date(task.start_date);
                    const taskEnd = new Date(task.end_date);
                    const existingStart = new Date(t.start_date);
                    const existingEnd = new Date(t.end_date);

                    return (
                        isWithinInterval(taskStart, { start: existingStart, end: existingEnd }) ||
                        isWithinInterval(taskEnd, { start: existingStart, end: existingEnd }) ||
                        isWithinInterval(existingStart, { start: taskStart, end: taskEnd }) ||
                        isWithinInterval(existingEnd, { start: taskStart, end: taskEnd })
                    );
                });

                return {
                    resource,
                    taskCount: resourceTasks.length,
                    hasConflict,
                    isOverloaded: resourceTasks.length > 5
                };
            });

            // Use LLM for intelligent matching
            const prompt = `Du bist ein Experte für Ressourcenplanung. Analysiere folgende Aufgabe und empfehle passende Ressourcen.

AUFGABE:
Titel: ${task.title}
Beschreibung: ${task.description || "Keine Beschreibung"}
Priorität: ${task.priority}
Zeitraum: ${task.start_date} bis ${task.end_date}
Aufwand: ${task.effort || "N/A"} ${task.effort_unit || ""}

VERFÜGBARE RESSOURCEN:
${availableResources.map((r, i) => `
${i + 1}. ${r.name}
   Typ: ${r.type === "employee" ? "Mitarbeiter" : r.type === "room" ? "Raum" : "Gerät"}
   ${r.skills ? `Fähigkeiten: ${r.skills.join(", ")}` : ""}
   ${r.location ? `Standort: ${r.location}` : ""}
   ${r.capacity ? `Kapazität: ${r.capacity}` : ""}
   Aktuelle Aufgaben: ${resourceConflicts[i].taskCount}
   ${resourceConflicts[i].hasConflict ? "⚠️ Zeitkonflikt vorhanden" : "✓ Zeitlich verfügbar"}
   ${resourceConflicts[i].isOverloaded ? "⚠️ Überlastet" : ""}
`).join("\n")}

Empfehle die 3-5 besten Ressourcen für diese Aufgabe. Berücksichtige:
1. Verfügbarkeit im Zeitraum
2. Passende Fähigkeiten/Eigenschaften
3. Aktuelle Auslastung
4. Priorität der Aufgabe`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        recommended_resources: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    resource_name: { type: "string" },
                                    confidence: { type: "number" },
                                    reasoning: { type: "string" },
                                    potential_issues: { type: "string" }
                                }
                            }
                        },
                        overall_recommendation: {
                            type: "string"
                        }
                    }
                }
            });

            // Match AI recommendations with actual resources
            const matchedRecommendations = result.recommended_resources
                .map(rec => {
                    const resource = availableResources.find(r =>
                        r.name.toLowerCase() === rec.resource_name.toLowerCase()
                    );
                    if (!resource) return null;

                    const conflictData = resourceConflicts.find(c => c.resource.id === resource.id);

                    return {
                        resource,
                        confidence: rec.confidence,
                        reasoning: rec.reasoning,
                        potentialIssues: rec.potential_issues,
                        hasConflict: conflictData?.hasConflict || false,
                        isOverloaded: conflictData?.isOverloaded || false,
                        taskCount: conflictData?.taskCount || 0
                    };
                })
                .filter(Boolean);

            setRecommendations({
                matches: matchedRecommendations,
                overall: result.overall_recommendation
            });

            // Pre-select high-confidence resources without conflicts
            const autoSelect = matchedRecommendations
                .filter(r => r.confidence >= 0.7 && !r.hasConflict && !r.isOverloaded)
                .map(r => r.resource.id);
            setSelectedResources(autoSelect);

        } catch (error) {
            console.error("Error analyzing resources:", error);
            // Fallback: recommend resources without conflicts
            const safeResources = resources
                .filter(r => r.status === "available")
                .slice(0, 3);

            setRecommendations({
                matches: safeResources.map(r => ({
                    resource: r,
                    confidence: 0.5,
                    reasoning: "Automatische Auswahl basierend auf Verfügbarkeit",
                    potentialIssues: "",
                    hasConflict: false,
                    isOverloaded: false,
                    taskCount: 0
                })),
                overall: "Automatische Ressourcenauswahl"
            });
        }

        setIsAnalyzing(false);
    };

    const toggleResource = (resourceId) => {
        if (selectedResources.includes(resourceId)) {
            setSelectedResources(selectedResources.filter(id => id !== resourceId));
        } else {
            setSelectedResources([...selectedResources, resourceId]);
        }
    };

    const handleAssign = () => {
        onAssign(selectedResources);
    };

    React.useEffect(() => {
        analyzeResources();
    }, []);

    return (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="border-b bg-white/50">
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    KI-gestützte Ressourcenzuweisung
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                    Für Aufgabe: <span className="font-semibold">{task.title}</span>
                </p>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                <Alert className="bg-purple-50 border-purple-200">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-900">
                        Die KI analysiert verfügbare Ressourcen und empfiehlt die besten Kandidaten
                        basierend auf Fähigkeiten, Verfügbarkeit und aktueller Auslastung.
                    </AlertDescription>
                </Alert>

                {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                        <p className="text-gray-600">Analysiere Ressourcen...</p>
                        <p className="text-sm text-gray-500 mt-2">Dies kann einen Moment dauern</p>
                    </div>
                ) : recommendations ? (
                    <div className="space-y-6">
                        {recommendations.overall && (
                            <div className="bg-white rounded-lg p-4 border border-purple-100">
                                <h3 className="font-semibold text-purple-900 mb-2">💡 Empfehlung</h3>
                                <p className="text-sm text-gray-700">{recommendations.overall}</p>
                            </div>
                        )}

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">
                                Vorgeschlagene Ressourcen ({recommendations.matches.length})
                            </h3>
                            <div className="space-y-3">
                                {recommendations.matches.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">
                                        Keine passenden Ressourcen gefunden
                                    </p>
                                ) : (
                                    recommendations.matches.map((match, index) => {
                                        const Icon = typeIcons[match.resource.type];
                                        const confidenceColor =
                                            match.confidence >= 0.8 ? "text-green-600" :
                                                match.confidence >= 0.6 ? "text-blue-600" :
                                                    "text-gray-600";

                                        return (
                                            <div
                                                key={match.resource.id}
                                                className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedResources.includes(match.resource.id)
                                                        ? "border-purple-500 bg-purple-50"
                                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                                    }`}
                                                onClick={() => toggleResource(match.resource.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        checked={selectedResources.includes(match.resource.id)}
                                                        onCheckedChange={() => toggleResource(match.resource.id)}
                                                        className="mt-1"
                                                    />

                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                                    <Icon className="w-5 h-5 text-purple-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-gray-900">{match.resource.name}</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {match.resource.type === "employee" ? "Mitarbeiter" :
                                                                            match.resource.type === "room" ? "Raum" : "Gerät"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1">
                                                                <Badge variant="outline" className={`${confidenceColor} border-current`}>
                                                                    {Math.round(match.confidence * 100)}% Match
                                                                </Badge>
                                                                {match.taskCount > 0 && (
                                                                    <span className="text-xs text-gray-500">
                                                                        {match.taskCount} {match.taskCount === 1 ? "Aufgabe" : "Aufgaben"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <p className="text-sm text-gray-600 mb-2">{match.reasoning}</p>

                                                        {match.resource.skills && match.resource.skills.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                {match.resource.skills.map((skill, i) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {(match.hasConflict || match.isOverloaded || match.potentialIssues) && (
                                                            <Alert variant="destructive" className="mt-2 bg-yellow-50 border-yellow-200">
                                                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                                <AlertDescription className="text-xs text-yellow-900">
                                                                    {match.hasConflict && "Zeitkonflikt mit anderen Aufgaben. "}
                                                                    {match.isOverloaded && "Ressource ist bereits überlastet. "}
                                                                    {match.potentialIssues && match.potentialIssues}
                                                                </AlertDescription>
                                                            </Alert>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </CardContent>

            <CardFooter className="border-t bg-white/50 flex justify-between items-center p-6">
                <p className="text-sm text-gray-600">
                    {selectedResources.length} {selectedResources.length === 1 ? "Ressource" : "Ressourcen"} ausgewählt
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onCancel} disabled={isAnalyzing}>
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={selectedResources.length === 0 || isAnalyzing}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Zuweisen
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}