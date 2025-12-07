import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, CheckCircle, User, MapPin, Wrench } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const typeIcons = {
    employee: User,
    room: MapPin,
    equipment: Wrench
};

export default function SmartAssignment({ task, resources, tasks, onAssign, onCancel }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [selectedResources, setSelectedResources] = useState([]);

    const analyzeAndSuggest = async () => {
        setIsAnalyzing(true);

        try {
            const availableResources = resources.filter(r => r.status === "available");

            // Get existing assignments to check for conflicts
            const resourceWorkloads = availableResources.map(resource => {
                const assignedTasks = tasks.filter(t =>
                    t.assigned_resources?.includes(resource.id) &&
                    t.status !== "completed" &&
                    t.status !== "cancelled"
                );

                return {
                    id: resource.id,
                    name: resource.name,
                    type: resource.type,
                    skills: resource.skills || [],
                    location: resource.location,
                    currentTasks: assignedTasks.length,
                    assignedTaskTitles: assignedTasks.map(t => t.title)
                };
            });

            const prompt = `Du bist ein intelligenter Planungsassistent für Ressourcenmanagement.

Analysiere folgende Aufgabe und schlage die 3 am besten geeigneten Ressourcen vor:

AUFGABE:
- Titel: ${task.title}
- Beschreibung: ${task.description || "Keine Beschreibung"}
- Priorität: ${task.priority}
- Zeitraum: ${task.start_date} bis ${task.end_date}
- Aufwand: ${task.effort || "Nicht angegeben"} ${task.effort_unit || ""}

VERFÜGBARE RESSOURCEN:
${resourceWorkloads.map(r => `
- ${r.name} (${r.type === "employee" ? "Mitarbeiter" : r.type === "room" ? "Raum" : "Gerät"})
  Fähigkeiten: ${r.skills.length > 0 ? r.skills.join(", ") : "Keine angegeben"}
  Standort: ${r.location || "Nicht angegeben"}
  Aktuelle Auslastung: ${r.currentTasks} Aufgaben
  Zugewiesene Aufgaben: ${r.assignedTaskTitles.join(", ") || "Keine"}
`).join("\n")}

Berücksichtige:
1. Fähigkeiten und Qualifikationen (besonders wichtig bei Mitarbeitern)
2. Aktuelle Auslastung (bevorzuge weniger ausgelastete Ressourcen)
3. Standort-Nähe
4. Aufgabenpriorität
5. Ressourcentyp (Mitarbeiter für komplexe Aufgaben, Räume für Meetings, Geräte für technische Aufgaben)

Gib für jede vorgeschlagene Ressource eine Begründung und einen Confidence-Score (0-100).`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        recommendations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    resource_id: { type: "string" },
                                    confidence: { type: "number" },
                                    reason: { type: "string" },
                                    potential_conflicts: { type: "string" }
                                }
                            }
                        },
                        alternative_suggestions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    suggestion: { type: "string" },
                                    reason: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            setSuggestions(result);
        } catch (error) {
            console.error("Error analyzing task:", error);
        }

        setIsAnalyzing(false);
    };

    const handleApplyRecommendations = () => {
        onAssign(selectedResources);
    };

    const toggleResource = (resourceId) => {
        if (selectedResources.includes(resourceId)) {
            setSelectedResources(selectedResources.filter(id => id !== resourceId));
        } else {
            setSelectedResources([...selectedResources, resourceId]);
        }
    };

    return (
        <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Intelligente Ressourcenzuweisung
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <Alert className="bg-purple-50 border-purple-200">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-900">
                        Unser KI-Assistent analysiert die Aufgabe und schlägt die am besten geeigneten Ressourcen vor,
                        basierend auf Verfügbarkeit, Qualifikationen und aktueller Auslastung.
                    </AlertDescription>
                </Alert>

                <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="font-semibold text-gray-900 mb-2">Aufgabe:</h3>
                    <p className="text-lg font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline">{task.priority === "urgent" ? "Dringend" : task.priority === "high" ? "Hoch" : task.priority === "medium" ? "Mittel" : "Niedrig"}</Badge>
                        {task.effort && (
                            <Badge variant="outline" className="bg-purple-50">
                                {task.effort} {task.effort_unit === "hours" ? "Stunden" : task.effort_unit === "days" ? "Tage" : "Wochen"}
                            </Badge>
                        )}
                    </div>
                </div>

                {!suggestions && !isAnalyzing && (
                    <Button
                        onClick={analyzeAndSuggest}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        size="lg"
                    >
                        <Sparkles className="w-5 h-5 mr-2" />
                        KI-Analyse starten
                    </Button>
                )}

                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                        <p className="text-gray-600">Analysiere Aufgabe und verfügbare Ressourcen...</p>
                    </div>
                )}

                {suggestions && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Empfohlene Ressourcen
                        </h3>

                        <div className="space-y-3">
                            {suggestions.recommendations.map((rec, index) => {
                                const resource = resources.find(r => r.id === rec.resource_id);
                                if (!resource) return null;

                                const Icon = typeIcons[resource.type];
                                const isSelected = selectedResources.includes(resource.id);

                                return (
                                    <div
                                        key={rec.resource_id}
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        onClick={() => toggleResource(resource.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleResource(resource.id)}
                                                className="mt-1"
                                            />

                                            <div className="flex-1">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                            <Icon className="w-5 h-5 text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{resource.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {resource.type === "employee" ? "Mitarbeiter" : resource.type === "room" ? "Raum" : "Gerät"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${rec.confidence >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                                                                rec.confidence >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                    "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                            }`}
                                                    >
                                                        {rec.confidence}% Match
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-gray-700 mb-2">{rec.reason}</p>

                                                {rec.potential_conflicts && rec.potential_conflicts !== "Keine" && (
                                                    <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                                                        <AlertDescription className="text-xs text-yellow-900">
                                                            ⚠️ {rec.potential_conflicts}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {resource.skills && resource.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {resource.skills.slice(0, 3).map((skill, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {suggestions.alternative_suggestions && suggestions.alternative_suggestions.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                <h4 className="font-semibold text-blue-900 mb-2">💡 Alternative Vorschläge:</h4>
                                <ul className="space-y-2">
                                    {suggestions.alternative_suggestions.map((alt, i) => (
                                        <li key={i} className="text-sm text-blue-900">
                                            <span className="font-medium">{alt.suggestion}:</span> {alt.reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            {suggestions && (
                <CardFooter className="border-t flex justify-end gap-3 p-6">
                    <Button variant="outline" onClick={onCancel}>
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleApplyRecommendations}
                        disabled={selectedResources.length === 0}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {selectedResources.length} {selectedResources.length === 1 ? "Ressource" : "Ressourcen"} zuweisen
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}