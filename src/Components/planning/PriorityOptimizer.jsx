import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, Calendar, ArrowRight, CheckCircle } from "lucide-react";
import { addDays, format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

const priorityWeights = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
};

export default function PriorityOptimizer({ tasks, resources, onApplyChanges }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [optimizationPlan, setOptimizationPlan] = useState(null);
    const [selectedChanges, setSelectedChanges] = useState([]);

    const analyzeAndOptimize = async () => {
        setIsAnalyzing(true);

        try {
            const activeTasks = tasks.filter(t =>
                t.status === "planned" || t.status === "in_progress"
            );

            // Sort tasks by priority
            const sortedTasks = [...activeTasks].sort((a, b) => {
                const weightDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
                if (weightDiff !== 0) return weightDiff;
                return new Date(a.start_date) - new Date(b.start_date);
            });

            const resourceConflicts = [];
            const recommendations = [];

            // Check for resource overloads and conflicts
            resources.forEach(resource => {
                const resourceTasks = activeTasks.filter(t =>
                    t.assigned_resources?.includes(resource.id)
                );

                if (resourceTasks.length > 5) {
                    // Find low priority tasks that can be rescheduled
                    const lowPriorityTasks = resourceTasks.filter(t =>
                        t.priority === "low" || t.priority === "medium"
                    ).sort((a, b) =>
                        priorityWeights[a.priority] - priorityWeights[b.priority]
                    );

                    lowPriorityTasks.slice(0, Math.min(2, lowPriorityTasks.length)).forEach(task => {
                        const duration = differenceInDays(
                            new Date(task.end_date),
                            new Date(task.start_date)
                        );

                        const newStartDate = addDays(new Date(task.end_date), 7);
                        const newEndDate = addDays(newStartDate, duration);

                        recommendations.push({
                            type: "reschedule",
                            task: task,
                            resource: resource,
                            reason: `Ressource ${resource.name} ist überlastet (${resourceTasks.length} Aufgaben)`,
                            oldDates: {
                                start: task.start_date,
                                end: task.end_date
                            },
                            newDates: {
                                start: format(newStartDate, "yyyy-MM-dd"),
                                end: format(newEndDate, "yyyy-MM-dd")
                            },
                            priorityImpact: task.priority
                        });
                    });
                }
            });

            // Use LLM for intelligent optimization
            const prompt = `Du bist ein Experte für Ressourcenplanung und Projektmanagement.

Analysiere die folgenden Aufgaben und schlage Optimierungen vor:

AUFGABEN (sortiert nach Priorität):
${sortedTasks.map(t => `
- ${t.title}
  Priorität: ${t.priority}
  Zeitraum: ${t.start_date} bis ${t.end_date}
  Zugewiesene Ressourcen: ${t.assigned_resources?.length || 0}
  Status: ${t.status}
  Aufwand: ${t.effort || "N/A"} ${t.effort_unit || ""}
`).join("\n")}

ZIEL: Optimiere den Zeitplan, sodass:
1. Dringende und hochpriorisierte Aufgaben bevorzugt werden
2. Niedrig priorisierte Aufgaben verschoben werden, wenn Ressourcen überlastet sind
3. Keine zeitlichen Überschneidungen bei derselben Ressource entstehen
4. Ein realistischer Puffer zwischen Aufgaben eingeplant wird

Schlage bis zu 5 konkrete Änderungen vor, die den größten Nutzen bringen.`;

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
                                    task_title: { type: "string" },
                                    action: { type: "string" },
                                    reason: { type: "string" },
                                    impact: { type: "string" },
                                    confidence: { type: "number" }
                                }
                            }
                        },
                        overall_assessment: {
                            type: "string"
                        },
                        expected_improvement: {
                            type: "string"
                        }
                    }
                }
            });

            setOptimizationPlan({
                systemRecommendations: recommendations,
                aiRecommendations: result.recommendations,
                overallAssessment: result.overall_assessment,
                expectedImprovement: result.expected_improvement
            });

            // Pre-select high-confidence recommendations
            const autoSelect = recommendations
                .map((_, index) => index)
                .slice(0, 3);
            setSelectedChanges(autoSelect);

        } catch (error) {
            console.error("Error optimizing schedule:", error);
        }

        setIsAnalyzing(false);
    };

    const handleApply = async () => {
        const changesToApply = optimizationPlan.systemRecommendations.filter((_, index) =>
            selectedChanges.includes(index)
        );
        await onApplyChanges(changesToApply);
    };

    const toggleChange = (index) => {
        if (selectedChanges.includes(index)) {
            setSelectedChanges(selectedChanges.filter(i => i !== index));
        } else {
            setSelectedChanges([...selectedChanges, index]);
        }
    };

    return (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader className="border-b bg-white/50">
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Intelligente Prioritätsoptimierung
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <Alert className="bg-indigo-50 border-indigo-200">
                    <Zap className="h-4 w-4 text-indigo-600" />
                    <AlertDescription className="text-indigo-900">
                        Analysiert Ihren aktuellen Zeitplan und schlägt Optimierungen vor, um hochpriorisierte
                        Aufgaben zu bevorzugen und Ressourcen-Engpässe zu vermeiden.
                    </AlertDescription>
                </Alert>

                {!optimizationPlan && !isAnalyzing && (
                    <Button
                        onClick={analyzeAndOptimize}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        size="lg"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        Zeitplan optimieren
                    </Button>
                )}

                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                        <p className="text-gray-600">Analysiere Aufgaben und Ressourcen...</p>
                        <p className="text-sm text-gray-500 mt-2">Dies kann einen Moment dauern</p>
                    </div>
                )}

                {optimizationPlan && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg p-4 border border-indigo-100">
                            <h3 className="font-semibold text-indigo-900 mb-2">📊 Gesamtbewertung</h3>
                            <p className="text-sm text-gray-700 mb-3">{optimizationPlan.overallAssessment}</p>
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-green-700 font-medium">
                                    Erwartete Verbesserung: {optimizationPlan.expectedImprovement}
                                </span>
                            </div>
                        </div>

                        {optimizationPlan.systemRecommendations.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-600" />
                                    Vorgeschlagene Änderungen
                                </h3>
                                <div className="space-y-3">
                                    {optimizationPlan.systemRecommendations.map((rec, index) => (
                                        <div
                                            key={index}
                                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedChanges.includes(index)
                                                    ? "border-indigo-500 bg-indigo-50"
                                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                                }`}
                                            onClick={() => toggleChange(index)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={selectedChanges.includes(index)}
                                                    onCheckedChange={() => toggleChange(index)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{rec.task.title}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                für {rec.resource.name}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className={
                                                            rec.priorityImpact === "low" || rec.priorityImpact === "medium"
                                                                ? "bg-green-50 text-green-700 border-green-200"
                                                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                        }>
                                                            {rec.priorityImpact === "low" ? "Niedrige" :
                                                                rec.priorityImpact === "medium" ? "Mittlere" :
                                                                    rec.priorityImpact === "high" ? "Hohe" : "Dringende"} Priorität
                                                        </Badge>
                                                    </div>

                                                    <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>

                                                    <div className="flex items-center gap-3 text-sm">
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>
                                                                {format(new Date(rec.oldDates.start), "dd.MM.yyyy", { locale: de })} -
                                                                {format(new Date(rec.oldDates.end), "dd.MM.yyyy", { locale: de })}
                                                            </span>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 text-indigo-600" />
                                                        <div className="flex items-center gap-2 text-indigo-700 font-medium">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>
                                                                {format(new Date(rec.newDates.start), "dd.MM.yyyy", { locale: de })} -
                                                                {format(new Date(rec.newDates.end), "dd.MM.yyyy", { locale: de })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {optimizationPlan.aiRecommendations && optimizationPlan.aiRecommendations.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-purple-100">
                                <h3 className="font-semibold text-purple-900 mb-3">💡 KI-Empfehlungen</h3>
                                <div className="space-y-3">
                                    {optimizationPlan.aiRecommendations.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="text-sm border-l-2 border-purple-300 pl-3">
                                            <p className="font-medium text-gray-900">{rec.task_title}</p>
                                            <p className="text-gray-600 mt-1">{rec.action}</p>
                                            <p className="text-gray-500 text-xs mt-1">{rec.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            {optimizationPlan && optimizationPlan.systemRecommendations.length > 0 && (
                <CardFooter className="border-t bg-white/50 flex justify-between items-center p-6">
                    <p className="text-sm text-gray-600">
                        {selectedChanges.length} von {optimizationPlan.systemRecommendations.length} Änderungen ausgewählt
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setOptimizationPlan(null)}
                        >
                            Neu analysieren
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={selectedChanges.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Änderungen anwenden
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}